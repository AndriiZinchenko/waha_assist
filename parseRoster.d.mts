export interface DiceExpr {
  dice: number;
  sides: number;
  flat: number;
  raw: string;
  avg: number | null;
}

export interface Invuln {
  value: number;
  conditional: boolean;
}

export interface ModelEntry {
  name: string;
  count: number;
  group: string | null;
}

export interface Enhancement {
  name: string;
  points: number;
}

export interface Ability {
  type: string;
  name: string;
  text: string | null;
}

export interface AbilitySection {
  type: string;
  items: Ability[];
}

export interface RuleRef {
  name: string;
  text: string | null;
}

export interface WeaponEntry {
  profileId: string;
  name: string;
  subProfile: boolean;
  type: "ranged" | "melee";
  count: number;
  range: string | null;
  attacks: DiceExpr | null;
  skill: number | null;
  skillRaw: string | null;
  strength: number;
  ap: number;
  damage: DiceExpr | null;
  keywords: string[];
  rules: RuleRef[];
  /** App-level (not roster) leader-attachment bonuses baked into this
   * weapon's stats — e.g. Castellan Crowe's +1 Attacks to Purifying Flame
   * — so the UI can flag a stat as modified and name the source ability.
   * Absent/empty on a weapon straight from `parseRoster`. */
  leaderMods?: RuleRef[];
}

export interface LoadoutWeapon {
  profileId: string;
  name: string;
  perModel: number;
}

export interface WeaponLoadout {
  key: string;
  modelCount: number;
  weapons: LoadoutWeapon[];
  wargear: string[];
}

export interface UnitProfile {
  M: string | null;
  T: number | null;
  SV: number | null;
  W: number | null;
  LD: string | null;
  OC: number | null;
}

export interface ParsedUnit {
  id: string;
  name: string;
  kind: string;
  basePoints: number;
  totalPoints: number;
  modelCount: number;
  models: ModelEntry[];
  profile: UnitProfile;
  invuln: Invuln | null;
  keywords: string[];
  faction: string | null;
  isWarlord: boolean;
  enhancements: Enhancement[];
  weapons: WeaponEntry[];
  loadouts: WeaponLoadout[];
  abilities: Ability[];
  abilitySections: AbilitySection[];
  rules: RuleRef[];
}

export interface ParsedArmy {
  name: string;
  system: string;
  catalogue: string;
  catalogueRevision: number;
  generatedBy: string;
  pointsLimit: number | null;
  pointsTotal: number | null;
  battleSize?: string | null;
  detachment?: string | null;
  detachmentRules?: string[];
  units: ParsedUnit[];
}

export function parseRoster(json: unknown): ParsedArmy;
export function parseDice(raw: unknown): DiceExpr | null;
export function parseSkill(raw: unknown): number | null;
export function parseKeywords(raw: unknown): string[];
export function parseInvuln(
  profileName: string | null | undefined,
  text?: string | null,
): Invuln | null;
