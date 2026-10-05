import type { ArmySelection } from "./armySetup";

export type { Edition } from "../../rosterEdition.mjs";
export { editionFromSystemName, rosterEdition } from "../../rosterEdition.mjs";
import type { Edition } from "../../rosterEdition.mjs";

export const EDITIONS: readonly Edition[] = [10, 11];

const STORAGE_KEY = "waha.edition";

export function armiesForEdition<T extends { edition: Edition }>(armies: T[], edition: Edition): T[] {
  return armies.filter((a) => a.edition === edition);
}

/** The selection with any side whose army is not of `edition` (or not known)
 * cleared, so a battle never mixes editions. */
export function dropOtherEdition(
  selection: ArmySelection,
  armies: Array<{ id: string; edition: Edition }>,
  edition: Edition,
): ArmySelection {
  const keep = (id: string | null) =>
    id !== null && armies.some((a) => a.id === id && a.edition === edition) ? id : null;
  return { a: keep(selection.a), b: keep(selection.b) };
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** The edition last chosen on the home screen; kept in this browser only. */
export function loadEdition(storage: StorageLike | null = browserStorage()): Edition {
  try {
    const value = Number(storage?.getItem(STORAGE_KEY));
    return value === 11 ? 11 : 10;
  } catch {
    return 10;
  }
}

export function saveEdition(edition: Edition, storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, String(edition));
  } catch {
    // Storage can be unavailable (private window); the choice then lasts
    // until reload.
  }
}
