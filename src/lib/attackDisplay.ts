import type { AttackRow } from "./combat";

/**
 * How a stat cell should be tinted. `boost` means the number moved in the
 * attacker's favour, `warn` against it, `null` means nothing touched it.
 */
export type StatTone = "boost" | "warn" | null;

export interface RowTones {
  attacks: StatTone;
  hit: StatTone;
  wound: StatTone;
  save: StatTone;
  damage: StatTone;
}

function directional(mod: number): StatTone {
  if (mod > 0) return "boost";
  if (mod < 0) return "warn";
  return null;
}

/**
 * Decide the tint for every stat cell of one attack row in a single place.
 *
 * Each cell used to make this call inline, which is how three of them ended
 * up out of step: the hit cell ignored the manual modifier, the wound cell
 * had no tint at all, and the save cell ignored the worsened AP. Any number
 * the calculator changes has to say so, so the rule lives here and the row
 * only maps a tone to a colour.
 *
 * A save is read from the attacker's side: an invulnerable fallback or a
 * worsened AP both make the target harder to hurt, so both warn.
 */
export function rowTones(row: AttackRow): RowTones {
  const attacksBoosted =
    (row.halfRangeApplied && row.halfRangeBonus?.kind === "rapidFire") ||
    row.leaderMods.length > 0 ||
    row.blastBonus > 0;

  return {
    attacks: attacksBoosted ? "boost" : null,
    hit: directional(row.appliedHitMod),
    wound: row.appliedWoundMod !== 0
      ? directional(row.appliedWoundMod)
      : row.antiX
        ? "boost"
        : null,
    save: row.isInvulnFallback || row.apWorsened ? "warn" : null,
    damage:
      row.halfRangeApplied && row.halfRangeBonus?.kind === "melta"
        ? "boost"
        : null,
  };
}

/**
 * The range to show beside a weapon's name, or null when it would be noise.
 * Melee rows are only ever listed under the melee filter, where every row
 * would repeat the same word.
 */
export function rangeLabel(row: AttackRow): string | null {
  if (row.type !== "ranged") return null;
  if (!row.range || row.range === "Melee") return null;
  return row.range;
}
