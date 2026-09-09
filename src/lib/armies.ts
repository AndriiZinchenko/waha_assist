import { parseRoster } from "../../parseRoster.mjs";
import type { ParsedArmy } from "../../parseRoster.mjs";

export interface ArmyEntry {
  id: string;
  fileName: string;
  parsed: ParsedArmy;
}

export function buildArmyEntries(
  files: Record<string, { default: unknown }>,
): ArmyEntry[] {
  const entries: ArmyEntry[] = [];
  for (const [path, mod] of Object.entries(files)) {
    const id = path.replace(/^\/armies\//, "").replace(/\.json$/, "");
    try {
      entries.push({ id, fileName: path, parsed: parseRoster(mod.default) });
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
