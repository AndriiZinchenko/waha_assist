import { factionOptions } from "./factions";
import type { UnitOptionsResult } from "./types";

export type {
  FactionUnitOptions,
  UnitOptions,
  UnitOptionsResult,
  WeaponOption,
  WeaponOptionProfile,
} from "./types";

const byCatalogue = new Map(factionOptions.map((f) => [f.catalogue, f]));

/** The weapons a unit's datasheet offers, or null when the faction was not
 * synced or the entry is not in it (run `npm run sync:options`). */
export function unitOptions(
  catalogue: string | null | undefined,
  entryId: string | null | undefined,
): UnitOptionsResult | null {
  if (!catalogue || !entryId) return null;
  const faction = byCatalogue.get(catalogue);
  const unit = faction?.units[entryId];
  if (!faction || !unit) return null;
  return { ...unit, rules: faction.rules };
}

/** `unitOptions` bound to one catalogue, for passing around. */
export function optionsLookup(catalogue: string | null | undefined) {
  return (entryId: string | null | undefined): UnitOptionsResult | null =>
    unitOptions(catalogue, entryId);
}
