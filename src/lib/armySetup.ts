export type Slot = "a" | "b";

export interface ArmySelection {
  a: string | null;
  b: string | null;
}

/**
 * Assigns `armyId` to `slot`, replacing whatever was there. Assigning the
 * army that already occupies the slot clears it instead, so the A | B
 * switcher on the setup screen toggles. The other slot is never touched,
 * and the same army may sit on both sides (a mirror match).
 */
export function assignArmy(
  selection: ArmySelection,
  slot: Slot,
  armyId: string,
): ArmySelection {
  return {
    ...selection,
    [slot]: selection[slot] === armyId ? null : armyId,
  };
}

export function canStart(selection: ArmySelection): boolean {
  return selection.a !== null && selection.b !== null;
}
