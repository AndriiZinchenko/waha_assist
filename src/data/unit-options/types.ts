/** One firing mode or melee profile of a weapon, as the catalogue lists it.
 * Numbers and dice stay as raw text; the app parses them with the same
 * parsers it uses for rosters. */
export interface WeaponOptionProfile {
  id: string;
  name: string;
  type: "ranged" | "melee";
  range: string | null;
  attacks: string;
  skill: string | null;
  strength: number;
  ap: number;
  damage: string;
  keywords: string;
}

export interface WeaponOption {
  name: string;
  profiles: WeaponOptionProfile[];
  /** Names of the weapon rules it references; text is in `rules` of the faction. */
  rules: string[];
}

export interface UnitOptions {
  name: string;
  weapons: WeaponOption[];
}

export interface FactionUnitOptions {
  catalogue: string;
  /** rule name -> text, shared by every unit in the faction */
  rules: Record<string, string>;
  /** catalogue entry id -> that unit's options */
  units: Record<string, UnitOptions>;
}

/** What `unitOptions` returns: a unit's options plus the rule texts they use. */
export interface UnitOptionsResult extends UnitOptions {
  rules: Record<string, string>;
}
