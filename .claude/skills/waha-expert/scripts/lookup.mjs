// Print readable cards from the synced Wahapedia data.
//
//   node lookup.mjs <10e|11e> <unit|stratagem|detachment> <name...>

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./lib/wahapedia.mjs";
import { lookup } from "./lib/cards.mjs";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEEDED = {
  unit: ["Datasheets", "Datasheets_models", "Datasheets_wargear", "Datasheets_abilities", "Datasheets_keywords", "Datasheets_leader", "Datasheets_models_cost", "Abilities", "Factions"],
  stratagem: ["Stratagems"],
  detachment: ["Detachments", "Detachment_abilities", "Stratagems", "Enhancements", "Factions"],
};

const [edition, kind, ...rest] = process.argv.slice(2);
const query = rest.join(" ").trim();
if (!["10e", "11e"].includes(edition) || !NEEDED[kind] || !query) {
  console.error("usage: node lookup.mjs <10e|11e> <unit|stratagem|detachment> <name...>");
  process.exit(2);
}

const t = {};
for (const name of NEEDED[kind]) {
  const file = path.join(SKILL, "data", edition, `${name}.csv`);
  if (!existsSync(file)) {
    console.error(`missing ${path.relative(process.cwd(), file)}; run: node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs ${edition}`);
    process.exit(1);
  }
  t[name] = parseCsv(readFileSync(file, "utf8")).rows;
}
console.log(lookup(t, kind, query));
