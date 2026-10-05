// Download Wahapedia's CSV export for one edition into data/<edition>/.
//
//   node sync-wahapedia.mjs <10e|11e> [--dry-run]
//
// Every file is fetched and validated before anything is written, so a bad
// response leaves the existing data untouched. Requests are one second apart.
// Data is from Wahapedia (wahapedia.ru), "powered by Wahapedia".

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, validateTable } from "./lib/wahapedia.mjs";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITES = { "10e": "wh40k10ed", "11e": "wh40k11ed" };
const TABLES = [
  "Datasheets",
  "Datasheets_abilities",
  "Datasheets_models",
  "Datasheets_wargear",
  "Datasheets_keywords",
  "Datasheets_leader",
  "Datasheets_models_cost",
  "Abilities",
  "Stratagems",
  "Detachments",
  "Detachment_abilities",
  "Enhancements",
  "Factions",
  "Last_update",
];
const DELAY_MS = 1000;

const args = process.argv.slice(2);
const edition = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
if (!SITES[edition]) {
  console.error("usage: node sync-wahapedia.mjs <10e|11e> [--dry-run]");
  process.exit(2);
}

function fail(message) {
  console.error(`sync aborted, nothing written: ${message}`);
  process.exit(1);
}

const base = `https://wahapedia.ru/${SITES[edition]}`;
const fetched = {};
for (const name of TABLES) {
  const url = `${base}/${name}.csv`;
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": "waha-assist rules sync (personal tool)" } });
  } catch (err) {
    fail(`${url}: ${err.message}`);
  }
  if (!res.ok) fail(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  const problem = validateTable(name, text);
  if (problem) fail(problem);
  const { rows, bad } = parseCsv(text);
  fetched[name] = text;
  console.log(`${name}: ${rows.length} rows${bad.length ? `, ${bad.length} malformed line(s) skipped (lines ${bad.join(", ")})` : ""}`);
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

if (dryRun) {
  console.log("dry run: nothing written");
  process.exit(0);
}

const outDir = path.join(SKILL, "data", edition);
mkdirSync(outDir, { recursive: true });
for (const [name, text] of Object.entries(fetched)) writeFileSync(path.join(outDir, `${name}.csv`), text);
const lastUpdate = parseCsv(fetched.Last_update).rows[0].last_update;
writeFileSync(
  path.join(outDir, "SOURCE.txt"),
  `powered by Wahapedia (${base}/)\nWahapedia last_update: ${lastUpdate}\nfetched: ${new Date().toISOString().slice(0, 10)}\n`,
);
console.log(`wrote ${Object.keys(fetched).length} files to ${path.relative(process.cwd(), outDir)}`);
