import type { ParsedUnit, WeaponEntry, WeaponLoadout } from "../../parseRoster.mjs";

export type CountsMap = Record<string, number>;

export function loadoutCountKey(unitId: string, loadoutKey: string): string {
  return `${unitId}:${loadoutKey}`;
}

export function getLoadoutLiveCount(
  counts: CountsMap,
  unitId: string,
  loadout: WeaponLoadout,
): number {
  const key = loadoutCountKey(unitId, loadout.key);
  return counts[key] ?? loadout.modelCount;
}

export function getUnitLiveTotal(
  counts: CountsMap,
  unitId: string,
  unit: ParsedUnit,
): number {
  return unit.loadouts.reduce(
    (sum, loadout) => sum + getLoadoutLiveCount(counts, unitId, loadout),
    0,
  );
}

/** `counts` without any live model count of `unitId`. Editing a unit's
 * weapons changes its groups, so counts kept for the old ones must go. */
export function clearUnitCounts(counts: CountsMap, unitId: string): CountsMap {
  const prefix = `${unitId}:`;
  return Object.fromEntries(Object.entries(counts).filter(([key]) => !key.startsWith(prefix)));
}

export function getLiveWeaponCount(
  counts: CountsMap,
  unitId: string,
  unit: ParsedUnit,
  profileId: string,
): number {
  let total = 0;
  for (const loadout of unit.loadouts) {
    const live = getLoadoutLiveCount(counts, unitId, loadout);
    // A profile can appear more than once in one loadout when a datasheet
    // mounts the same weapon from two wargear groups, so every matching
    // entry counts, not just the first.
    for (const weapon of loadout.weapons) {
      if (weapon.profileId !== profileId) continue;
      total += weapon.perModel * live;
    }
  }
  return total;
}

/**
 * A loadout's own weapon list (`WeaponLoadout.weapons`) only carries
 * `{profileId, name, perModel}` — enough to identify and count, not enough
 * to render (no stats). Cross-reference `unit.weapons` for the full
 * `WeaponEntry` and set each one's live `count` from *this loadout's own*
 * live model count — not summed across every loadout that carries it, the
 * way `getLiveWeaponCount` does for the merged whole-unit view.
 */
export function getLoadoutWeapons(
  unit: ParsedUnit,
  loadout: WeaponLoadout,
  liveCount: number,
): WeaponEntry[] {
  const out: WeaponEntry[] = [];
  for (const lw of loadout.weapons) {
    const full = unit.weapons.find((w) => w.profileId === lw.profileId);
    if (!full) continue;
    out.push({ ...full, count: lw.perModel * liveCount });
  }
  return out;
}

function loadoutItems(loadout: WeaponLoadout): string[] {
  return [...loadout.weapons.map((w) => w.name), ...loadout.wargear];
}

/**
 * Label a loadout by the item name(s) — weapons AND non-weapon wargear like
 * a Narthecium or a banner — that distinguish it from the unit's other
 * loadouts. Items common to every loadout (e.g. a psychic attack every
 * model in the unit has regardless of wargear) are excluded, since they
 * don't help a player pick which stepper to tap. Wargear matters here as
 * much as weapons do: a model whose only difference from its squad-mates is
 * a Narthecium still needs a label that says so, not one that falls back to
 * a weapon every loadout shares.
 */
export function labelLoadout(
  loadout: WeaponLoadout,
  allLoadouts: WeaponLoadout[],
): string {
  if (allLoadouts.length <= 1) return "Models";

  const itemSets = allLoadouts.map((l) => new Set(loadoutItems(l)));
  const common = [...itemSets[0]].filter((name) =>
    itemSets.every((set) => set.has(name)),
  );
  const commonSet = new Set(common);

  const items = loadoutItems(loadout);
  const distinguishing = items.filter((name) => !commonSet.has(name));

  const names = distinguishing.length > 0 ? distinguishing : items;

  return [...new Set(names)].join(" + ") || "Models";
}
