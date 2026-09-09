import type { WeaponEntry } from "../../parseRoster.mjs";

/**
 * One row per weapon profile, carrying the total number of that weapon.
 *
 * A datasheet can mount the same profile from more than one wargear group —
 * the Forgefiend's ectoplasma cannons sit two on the arms and one on the
 * head — so a unit's weapon list can hold several entries sharing a
 * profileId. Their counts add up; keeping only the first would silently
 * drop the other mounts from both the weapon table and the attack maths.
 */
export function mergeByProfileId(weapons: WeaponEntry[]): WeaponEntry[] {
  const byId = new Map<string, WeaponEntry>();
  for (const w of weapons) {
    const seen = byId.get(w.profileId);
    if (seen) {
      seen.count += w.count;
    } else {
      byId.set(w.profileId, { ...w });
    }
  }
  return [...byId.values()];
}
