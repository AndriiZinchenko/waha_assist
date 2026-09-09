import type { ParsedUnit } from "../../parseRoster.mjs";

/** Sum of `totalPoints` for every unit not marked hidden — the live total
 * a player sees while trimming a roster down to fit a smaller points
 * limit (e.g. hiding units to fit a 2000 or 1000 point game). */
export function computeVisiblePoints(
  units: ParsedUnit[],
  hiddenUnitIds: Record<string, boolean>,
): number {
  return units
    .filter((u) => !hiddenUnitIds[u.id])
    .reduce((sum, u) => sum + u.totalPoints, 0);
}

/** Units with hidden ones filtered out — what should actually appear in
 * the army list and combat calculator. */
export function visibleUnits(
  units: ParsedUnit[],
  hiddenUnitIds: Record<string, boolean>,
): ParsedUnit[] {
  return units.filter((u) => !hiddenUnitIds[u.id]);
}
