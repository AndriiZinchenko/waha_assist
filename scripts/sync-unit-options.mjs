// Regenerate src/data/unit-options/* and src/data/core-abilities.ts from New Recruit.
//
//   npm run sync:options              rewrite every faction file
//   npm run sync:options -- --dry-run report what would change, write nothing
//   npm run sync:options -- --headed  watch the browser while it works
//
// For every unit in the rosters in armies/, this reads the unit's entry in
// its faction's catalogue book (the BattleScribe data the list builder runs
// on, fetched through the same library calls as sync:stratagems) and records
// every weapon that datasheet offers, with its stat lines and rule text.
// The app uses it to let you swap a unit's weapons. It also saves the core-book
// definitions of the unit abilities a datasheet can mention (Lone Operative,
// Stealth...), shown in a unit's Rules. It uses the session
// saved by `sync:armies -- --login` and handles no credentials of its own.

import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rosterEdition } from "../rosterEdition.mjs";
import { openLibrary, openSession } from "./lib/nrSession.mjs";
import { camelCase, slugify } from "./lib/stratagems.mjs";
import {
  buildFactionOptions,
  collectRuleTexts,
  pickCoreAbilities,
  renderCoreAbilities,
  renderFactionFile,
  renderFactionsIndex,
  unitEntriesFromRoster,
} from "./lib/unitOptions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARMIES_DIR = path.join(ROOT, "armies");
const OUT_DIR = path.join(ROOT, "src", "data", "unit-options");
const CORE_ABILITIES_FILE = path.join(ROOT, "src", "data", "core-abilities.ts");
const SESSION_FILE = path.join(ROOT, ".newrecruit-session.json");
// Only this system is ever read, so nothing from another edition can leak in.
const SYSTEM_SHORT = "wh40k-10e";
const CORE_BOOK_NAME = "Warhammer 40,000 10th Edition";
const KEEP_FILES = new Set(["index.ts", "types.ts", "factions.ts"]);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const HEADED = args.has("--headed");

const log = (...m) => console.log(...m);

async function main() {
  // Which factions do the synced armies use, and which unit entries in each?
  const entriesByFaction = new Map();
  for (const file of (await readdir(ARMIES_DIR)).filter((f) => f.endsWith(".json"))) {
    const json = JSON.parse(await readFile(path.join(ARMIES_DIR, file), "utf8"));
    // Weapon options come from the 10th edition catalogues only.
    if (rosterEdition(json) !== 10) {
      log(`  skip  ${file}: not a 10th edition roster`);
      continue;
    }
    const catalogue = json?.roster?.forces?.[0]?.catalogueName;
    if (!catalogue) {
      log(`  skip  ${file}: no catalogue in the roster`);
      continue;
    }
    const list = entriesByFaction.get(catalogue) ?? [];
    list.push(...unitEntriesFromRoster(json));
    entriesByFaction.set(catalogue, list);
  }
  log(`Factions in use: ${[...entriesByFaction.keys()].join(", ")}`);
  if (entriesByFaction.size === 0) {
    console.error("No rosters found in armies/. Run sync:armies first.");
    process.exit(1);
  }

  const { browser, page } = await openSession({ sessionFile: SESSION_FILE, headed: HEADED });
  const built = [];
  let coreAbilities = null;
  try {
    const library = await openLibrary(page, SYSTEM_SHORT, log);
    const coreBook = library.books.find((b) => b.name === CORE_BOOK_NAME);
    const coreRoot = coreBook ? ((await library.fetchBook(coreBook)).gameSystem ?? null) : null;
    if (!coreRoot) log(`  note: no "${CORE_BOOK_NAME}" book; core rule texts will be missing`);
    if (coreRoot) {
      const { found, missing } = pickCoreAbilities(collectRuleTexts([coreRoot]));
      coreAbilities = found;
      if (missing.length) log(`    warn  not in the core book: ${missing.join(", ")}`);
    }

    for (const [name, entries] of entriesByFaction) {
      const book = library.books.find((b) => b.name === name);
      if (!book) {
        log(`  skip  ${name}: no such catalogue in the library`);
        continue;
      }
      const roots = await library.catalogueWithLinks(book);
      if (coreRoot) roots.push(coreRoot);
      const sorted = [...entries].sort(
        (a, b) => a.name.localeCompare(b.name) || a.entryId.localeCompare(b.entryId),
      );
      const { options, missing } = buildFactionOptions({ catalogue: name, roots, entries: sorted });
      log(
        `${name} (v${book.nrversion}): ${Object.keys(options.units).length} unit(s), ` +
          `${Object.keys(options.rules).length} rule text(s)`,
      );
      if (missing.length) log(`    warn  not found in the catalogue: ${missing.join(", ")}`);
      built.push({ name, options, constName: camelCase(name), stem: slugify(name) });
    }
  } finally {
    await browser.close();
  }

  if (built.length === 0) {
    console.error("Nothing was built.");
    process.exit(1);
  }
  built.sort((a, b) => a.name.localeCompare(b.name));
  const stems = new Set(built.map((b) => b.stem));
  const stale = (await readdir(OUT_DIR)).filter(
    (f) => f.endsWith(".ts") && !KEEP_FILES.has(f) && !stems.has(f.replace(/\.ts$/, "")),
  );

  if (DRY_RUN) {
    log("");
    log("Dry run, nothing written. Would write:");
    for (const b of built) log(`  src/data/unit-options/${b.stem}.ts`);
    log("  src/data/unit-options/factions.ts");
    if (coreAbilities) log("  src/data/core-abilities.ts");
    if (stale.length) log(`Would delete:\n  ${stale.join("\n  ")}`);
    return;
  }

  for (const b of built) {
    await writeFile(
      path.join(OUT_DIR, `${b.stem}.ts`),
      renderFactionFile(b.constName, b.options),
      "utf8",
    );
  }
  await writeFile(
    path.join(OUT_DIR, "factions.ts"),
    renderFactionsIndex(built.map(({ constName, stem }) => ({ constName, stem }))),
    "utf8",
  );
  if (coreAbilities) {
    await writeFile(CORE_ABILITIES_FILE, renderCoreAbilities(coreAbilities), "utf8");
  }
  for (const f of stale) await unlink(path.join(OUT_DIR, f));

  log("");
  log(`Wrote ${built.length} faction file(s) plus factions.ts${coreAbilities ? " and core-abilities.ts" : ""}.`);
  if (stale.length) log(`Deleted (no longer generated):\n  ${stale.join("\n  ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
