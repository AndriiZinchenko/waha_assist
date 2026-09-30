// Pull every army list from your New Recruit account into armies/*.json.
//
//   npm run sync:armies -- --login     first time: opens a browser, you log in,
//                                      the session is saved to .newrecruit-session.json
//   npm run sync:armies                headless refresh of armies/ using that session
//   npm run sync:armies -- --dry-run   list what would be written, write nothing
//   npm run sync:armies -- --headed    watch the browser while it works
//
// New Recruit has no export API: the JSON file is assembled in the page from the
// loaded army, then handed to the browser as a download. So this drives the real
// app with Playwright, clicks Export -> json on each list and captures the file.

import { chromium } from "playwright";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  exportMatchesList,
  listsForSystem,
  planWrites,
  validateRoster,
} from "./lib/syncArmies.mjs";

// Only 40k 10th Edition lists are rosters the app can read.
const SYSTEM_SHORT = "wh40k-10e";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARMIES_DIR = path.join(ROOT, "armies");
const SESSION_FILE = path.join(ROOT, ".newrecruit-session.json");
const BASE = "https://www.newrecruit.eu";
const VIEWPORT = { width: 1400, height: 900 }; // below 1250px the app hides Export in a mobile menu

const args = new Set(process.argv.slice(2));
const LOGIN = args.has("--login");
const DRY_RUN = args.has("--dry-run");
const HEADED = args.has("--headed") || LOGIN;

const log = (...m) => console.log(...m);

/**
 * Prefer the Chromium bundled with Playwright; fall back to an installed
 * Google Chrome or Edge when that build has not been downloaded.
 */
async function launchBrowser(headless) {
  const attempts = [{}, { channel: "chrome" }, { channel: "msedge" }];
  let lastErr;
  for (const opts of attempts) {
    try {
      return await chromium.launch({ headless, ...opts });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function login() {
  const browser = await launchBrowser(false);
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.goto(`${BASE}/app/Login`);
  log("Log in to New Recruit in the browser window. Waiting up to 10 minutes...");
  await page.waitForFunction(() => !!localStorage.getItem("access"), null, {
    timeout: 10 * 60 * 1000,
    polling: 1000,
  });
  // Give the app a moment to persist the refresh token as well.
  await page.waitForTimeout(1500);
  await context.storageState({ path: SESSION_FILE });
  log(`Session saved to ${path.relative(ROOT, SESSION_FILE)}. You can close the window.`);
  await browser.close();
}

/** Same call the app makes: POST /api/rpc?m=<method> with the access token. */
async function rpc(page, method, params = []) {
  return page.evaluate(
    async ({ method, params }) => {
      const call = () =>
        fetch(`/api/rpc?m=${encodeURIComponent(method)}`, {
          method: "POST",
          body: JSON.stringify({ method, params }),
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("access") || "",
          },
        });
      let res = await call();
      if (res.status === 403 && localStorage.getItem("refresh")) {
        const t = await fetch("/api/token", {
          method: "POST",
          body: JSON.stringify({ token: localStorage.getItem("refresh") }),
          headers: { "Content-Type": "application/json" },
        });
        if (t.ok) {
          localStorage.setItem("access", (await t.json()).token);
          res = await call();
        }
      }
      if (!res.ok) return { __error: `rpc ${method} failed (${res.status})` };
      const body = await res.json();
      if (body && body.obfuscated) return JSON.parse(atob(body.data));
      return body;
    },
    { method, params },
  );
}

export { launchBrowser };

export async function exportList(page, list) {
  await page.goto(`${BASE}/app/Lists/${list.key}`, { waitUntil: "domcontentloaded" });
  const exportBtn = page.locator(".listOptions .imgBt", { hasText: "Export" }).first();
  await exportBtn.waitFor({ state: "visible", timeout: 60_000 });
  // The button renders before the list finishes loading; let the page settle,
  // then retry the click until the export dialog actually appears.
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  const jsonBtn = page.locator(".exports .imgBt", { hasText: "json" });
  for (let attempt = 1; ; attempt++) {
    await exportBtn.click();
    const shown = await jsonBtn
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true, () => false);
    if (shown) break;
    if (attempt >= 5) throw new Error("export dialog did not open");
    await page.waitForTimeout(2_000);
  }
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    jsonBtn.click(),
  ]);
  const file = await download.path();
  return JSON.parse(await readFile(file, "utf8"));
}

async function sync() {
  if (!existsSync(SESSION_FILE)) {
    console.error("No saved session. Run: npm run sync:armies -- --login");
    process.exit(2);
  }
  const browser = await launchBrowser(!HEADED);
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: SESSION_FILE,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());

  try {
    await page.goto(`${BASE}/app/MyLists`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!document.querySelector("button"), null, {
      timeout: 60_000,
    });
    const loggedIn = await page.evaluate(() => !!localStorage.getItem("access"));
    if (!loggedIn) {
      console.error("Session has expired. Run: npm run sync:armies -- --login");
      process.exit(2);
    }

    // Pull server lists into the app's local store so list pages can open them.
    const syncBtn = page.getByRole("button", { name: "Sync Lists" });
    if (await syncBtn.isVisible().catch(() => false)) {
      const done = page
        .waitForResponse((r) => r.url().includes("m=get_list_bulk"), { timeout: 30_000 })
        .catch(() => null);
      await syncBtn.click();
      await done;
      await page.waitForTimeout(2000);
    }

    const data = await rpc(page, "user_get_data");
    if (!data || data.__error) {
      throw new Error(data?.__error ?? "user_get_data returned nothing");
    }
    // The account can hold lists for other games too (Horus Heresy, ...).
    // Only 40k 10th Edition rosters are readable by the app.
    const library = await rpc(page, "get_library");
    if (!library || library.__error) {
      throw new Error(library?.__error ?? "get_library returned nothing");
    }
    const system = (library.systems ?? library).find((s) => s.short === SYSTEM_SHORT);
    if (!system) throw new Error(`game system ${SYSTEM_SHORT} not found in the library`);
    const bookName = (id) =>
      (system.books ?? []).find((b) => String(b.id) === String(id))?.name ?? null;

    const allRows = data.lists ?? [];
    const rows = listsForSystem(allRows, system.id);
    const lists = rows.map((l) => ({
      key: l.list_key,
      name: l.name ?? l.list_key,
      catalogue: bookName(l.id_book),
      raw: l,
    }));
    log(`Found ${lists.length} ${system.name} list(s) on New Recruit.`);
    if (allRows.length > rows.length) {
      log(`  (ignoring ${allRows.length - rows.length} list(s) from other game systems)`);
    }
    if (lists.length && DRY_RUN) {
      log("First list metadata:", JSON.stringify(lists[0].raw, null, 2));
    }

    await mkdir(ARMIES_DIR, { recursive: true });
    const existing = await readdir(ARMIES_DIR);
    const plan = planWrites(lists, existing);

    let written = 0;
    const skipped = [];
    for (const w of plan.writes) {
      if (DRY_RUN) {
        log(`  would write armies/${w.file}  <- "${w.name}"`);
        continue;
      }
      try {
        const json = await exportList(page, w);
        const list = lists.find((l) => l.key === w.key);
        const match = exportMatchesList(json, { name: w.name, catalogue: list?.catalogue ?? null });
        if (!match.ok) {
          skipped.push(`${w.name}: ${match.error}`);
          log(`  skip  ${w.name}: ${match.error}`);
          continue;
        }
        const check = validateRoster(json);
        if (!check.ok) {
          skipped.push(`${w.name}: ${check.error}`);
          log(`  skip  ${w.name}: ${check.error}`);
          continue;
        }
        await writeFile(path.join(ARMIES_DIR, w.file), JSON.stringify(json), "utf8");
        written++;
        log(`  wrote armies/${w.file}  (${check.catalogue})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
        skipped.push(`${w.name}: ${msg}`);
        log(`  fail  ${w.name}: ${msg}`);
      }
    }

    log("");
    log(`Done. ${written} written, ${skipped.length} skipped.`);
    if (skipped.length) log("Skipped:\n  " + skipped.join("\n  "));
    // armies/ mirrors the account: drop files no current list would write.
    // Done last so a failed run never leaves the folder half-empty.
    if (plan.orphans.length) {
      if (DRY_RUN) {
        log("Would delete (no matching list on New Recruit):\n  " + plan.orphans.join("\n  "));
      } else {
        for (const f of plan.orphans) await unlink(path.join(ARMIES_DIR, f));
        log("Deleted (no matching list on New Recruit):\n  " + plan.orphans.join("\n  "));
      }
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (LOGIN ? login() : sync()).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
