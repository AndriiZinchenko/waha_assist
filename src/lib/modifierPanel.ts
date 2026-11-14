import type { DirectionModifiers } from "./combat";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const STORAGE_KEY = "waha.modifiersCollapsed";

function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Whether the modifier panel was last left collapsed; kept in this browser only. */
export function loadModifiersCollapsed(storage: StorageLike | null = browserStorage()): boolean {
  try {
    return storage?.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveModifiersCollapsed(
  collapsed: boolean,
  storage: StorageLike | null = browserStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Storage can be unavailable (private window); the choice then lasts
    // until reload.
  }
}

const MINUS = "−";

function signed(mod: number): string {
  return mod > 0 ? `+${mod}` : `${MINUS}${-mod}`;
}

/** Labels for the toggles, so the summary reads in the current language. */
export interface ModifierLabels {
  halfRange: string;
  stationary: string;
  engaged: string;
  waaagh: string;
}

/** The modifiers that are switched on, as short chips for the collapsed panel. */
export function activeModifierChips(m: DirectionModifiers, labels: ModifierLabels): string[] {
  const chips: string[] = [];
  if (m.hitMod !== 0) chips.push(`Hit ${signed(m.hitMod)}`);
  if (m.woundMod !== 0) chips.push(`Wound ${signed(m.woundMod)}`);
  if (m.apMod !== 0) chips.push(`AP ${signed(m.apMod)}`);
  if (m.damageMod !== 0) chips.push(`D ${signed(m.damageMod)}`);
  if (m.invulnOverride !== null) chips.push(`${m.invulnOverride}++`);
  if (m.halfRange) chips.push(labels.halfRange);
  if (m.stationary) chips.push(labels.stationary);
  if (m.engaged) chips.push(labels.engaged);
  if (m.waaagh) chips.push(labels.waaagh);
  return chips;
}
