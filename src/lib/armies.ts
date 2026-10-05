import { parseRoster } from "../../parseRoster.mjs";
import type { ParsedArmy } from "../../parseRoster.mjs";
import { rosterEdition, type Edition } from "../../rosterEdition.mjs";

export interface ArmyEntry {
  id: string;
  fileName: string;
  /** The 40k edition the roster was built for. */
  edition: Edition;
  parsed: ParsedArmy;
}

export function buildArmyEntries(
  files: Record<string, { default: unknown }>,
): ArmyEntry[] {
  const entries: ArmyEntry[] = [];
  for (const [path, mod] of Object.entries(files)) {
    const id = path.replace(/^\/armies\//, "").replace(/\.json$/, "");
    try {
      const edition = rosterEdition(mod.default);
      if (edition === null) {
        console.warn(`Skipping ${path}: not a 40k 10th or 11th edition roster`);
        continue;
      }
      entries.push({ id, fileName: path, edition, parsed: parseRoster(mod.default) });
    } catch (err) {
      console.error(`Skipping ${path}: failed to parse`, err);
    }
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

const files = import.meta.glob<{ default: unknown }>("/armies/*.json", {
  eager: true,
});

export const armies: ArmyEntry[] = buildArmyEntries(files);
