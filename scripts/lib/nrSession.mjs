// New Recruit session code shared by the sync scripts: launching a browser,
// opening the saved login, calling the site's RPC endpoint from inside the
// page, and reading catalogue books from the game library. No credentials
// are handled here; the login lives in the session file written by
// `npm run sync:armies -- --login`.

import { chromium } from "playwright";
import { existsSync } from "node:fs";

export const BASE = "https://www.newrecruit.eu";
export const VIEWPORT = { width: 1400, height: 900 };

export async function launchBrowser(headless) {
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

/** Run one of New Recruit's RPC calls in the page, as the signed-in user. */
export function rpc(page, method, params = []) {
  return page.evaluate(
    async ({ method, params }) => {
      const send = () =>
        fetch(`/api/rpc?m=${encodeURIComponent(method)}`, {
          method: "POST",
          body: JSON.stringify({ method, params }),
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("access") || "",
          },
        });
      let res = await send();
      if (res.status === 403 && localStorage.getItem("refresh")) {
        const t = await fetch("/api/token", {
          method: "POST",
          body: JSON.stringify({ token: localStorage.getItem("refresh") }),
          headers: { "Content-Type": "application/json" },
        });
        if (t.ok) {
          localStorage.setItem("access", (await t.json()).token);
          res = await send();
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

/** The catalogue or game-system root of a book row's content. */
export function bookRoot(content) {
  return content.catalogue ?? content.gameSystem ?? null;
}

/** Open the saved session on the lists page and confirm it is still logged in. */
export async function openSession({ sessionFile, headed = false, acceptDownloads = false }) {
  if (!existsSync(sessionFile)) {
    console.error("No saved session. Run: npm run sync:armies -- --login");
    process.exit(2);
  }
  const browser = await launchBrowser(!headed);
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: sessionFile,
    acceptDownloads,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/app/MyLists`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!document.querySelector("button"), null, {
    timeout: 60_000,
  });
  if (!(await page.evaluate(() => !!localStorage.getItem("access")))) {
    console.error("Session has expired. Run: npm run sync:armies -- --login");
    await browser.close();
    process.exit(2);
  }
  return { browser, context, page };
}

/**
 * The books of one game system, with a cached book fetcher and a helper that
 * returns a catalogue together with everything it links.
 */
export async function openLibrary(page, systemShort, log = () => {}) {
  const library = await rpc(page, "get_library");
  if (!library || library.__error) {
    throw new Error(library?.__error ?? "get_library returned nothing");
  }
  const system = (library.systems ?? library).find((s) => s.short === systemShort);
  if (!system) throw new Error(`system ${systemShort} not found`);
  const books = system.books ?? [];

  const cache = new Map();
  async function fetchBook(book) {
    if (cache.has(book.id)) return cache.get(book.id);
    const row = await rpc(page, "books_get_book_row", [
      String(system.id),
      String(book.id),
      book.last_updated,
    ]);
    if (!row || row.__error) throw new Error(row?.__error ?? `fetch of ${book.name} failed`);
    const content = JSON.parse(row.content);
    cache.set(book.id, content);
    return content;
  }

  /** A catalogue plus everything it links, transitively, in link order. */
  async function catalogueWithLinks(book) {
    const roots = [];
    const seen = new Set();
    async function visit(b) {
      if (seen.has(b.id)) return;
      seen.add(b.id);
      const root = bookRoot(await fetchBook(b));
      if (!root) return;
      roots.push(root);
      for (const link of root.catalogueLinks ?? []) {
        const target =
          books.find((x) => x.bsid === link.targetId) ?? books.find((x) => x.name === link.name);
        if (target) await visit(target);
        else log(`  note: ${b.name} links to unknown catalogue "${link.name}"`);
      }
    }
    await visit(book);
    return roots;
  }

  return { system, books, fetchBook, catalogueWithLinks };
}
