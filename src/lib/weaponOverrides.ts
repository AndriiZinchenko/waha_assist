/** One weapon a model in a group carries. Stored by catalogue name, never
 * by stats, so a later `sync:options` updates edited units too. */
export interface WeaponOverrideWeapon {
  name: string;
  /** How many of this weapon each model in the group carries. */
  perModel: number;
}

/** A set of models that carry the same weapons. */
export interface WeaponOverrideGroup {
  /** Stable within one override ("g1", "g2", ...); names casualty counts. */
  key: string;
  modelCount: number;
  weapons: WeaponOverrideWeapon[];
}

export interface UnitWeaponOverride {
  groups: WeaponOverrideGroup[];
  /** Fingerprint of the roster unit's own loadouts when the edit was made. */
  rosterSignature: string;
}
