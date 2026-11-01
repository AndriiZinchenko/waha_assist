// A co-op Crusade campaign: players, the units they carry from mission to
// mission, and the mission log. Pure data and rules only; the screen is
// components/CrusadeScreen.tsx and the shape is synced like the rest of the
// army config (see persistence.ts and server/stateStore.mjs).

import type { ParsedUnit } from "../../parseRoster.mjs";
import type { Edition } from "./edition";

export const HONOUR_IDS = [
  "marksmen",
  "ruthlessBlades",
  "furiousCharge",
  "hardened",
  "steadfast",
  "holdTheLine",
] as const;
export type HonourId = (typeof HONOUR_IDS)[number];

export const SCAR_IDS = [
  "grievousWound",
  "damagedGear",
  "limp",
  "concussion",
  "vengeance",
  "panic",
] as const;
export type ScarId = (typeof SCAR_IDS)[number];

export interface HonourInfo {
  name: string;
  effect: string;
  /** Applies to one weapon profile of this type, chosen when it is gained. */
  weaponType: "ranged" | "melee" | null;
}

/** The campaign book's d6 table, in roll order. */
export const HONOURS: Record<HonourId, HonourInfo> = {
  marksmen: {
    name: "Влучні стрільці",
    effect: "+1 до влучання одним профілем дальньої зброї",
    weaponType: "ranged",
  },
  ruthlessBlades: {
    name: "Безжальні клинки",
    effect: "+1 до AP одного профілю зброї ближнього бою",
    weaponType: "melee",
  },
  furiousCharge: { name: "Шалений натиск", effect: "Можна перекидати кидок чарджу", weaponType: null },
  hardened: {
    name: "Загартовані",
    effect: "Feel No Pain 6+ (якщо FNP вже є — оберіть іншу нагороду)",
    weaponType: null,
  },
  steadfast: {
    name: "Непохитні",
    effect: "+1 до тестів бойового шоку та тестів втрат",
    weaponType: null,
  },
  holdTheLine: { name: "Тримають рубіж", effect: "+1 OC кожній моделі загону", weaponType: null },
};

export const SCARS: Record<ScarId, { name: string; effect: string }> = {
  grievousWound: { name: "Важке поранення", effect: "−1 до влучання в ближньому бою" },
  damagedGear: { name: "Пошкоджене спорядження", effect: "−1 до влучання дальньою зброєю" },
  limp: { name: "Кульгавість", effect: "−2\" до руху" },
  concussion: { name: "Струс", effect: "−1 до тестів бойового шоку" },
  vengeance: {
    name: "Спрага помсти",
    effect: "Якщо може чарджити — мусить чарджити найближчого ворога",
  },
  panic: { name: "Паніка", effect: "−1 OC кожній моделі (мінімум 0)" },
};

/** A unit with this many scars is written off. */
export const SCARS_TO_WRITE_OFF = 3;

export interface CrusadeHonour {
  id: HonourId;
  /** The weapon profile name, for honours that apply to one profile. */
  weapon: string | null;
}

export interface CrusadeUnit {
  id: string;
  playerId: string;
  /** Name or mark that tells it apart, e.g. «золоті наплічники». */
  name: string;
  /** The roster units it is made of (a leader and its bodyguard are one),
   * in the player's 10th edition roster. */
  rosterUnitIds: string[];
  /** The same in another edition's roster, keyed by edition ("11"). Absent
   * to match by datasheet name (see `crusadeForEdition`). */
  rosterUnitIdsByEdition?: Record<string, string[]>;
  xp: number;
  honours: CrusadeHonour[];
  scars: ScarId[];
  skipsMission: boolean;
  /** Another campaign unit of the same player this one leads in battle
   * (a character attached to a squad that keeps its own progress). */
  leads?: string;
}

export type MissionResult = "win" | "loss";

export interface CrusadeMission {
  number: number;
  name: string;
  result: MissionResult | null;
  /** Points limit for each player. */
  pointsLimit: number;
  notes: string;
  /** The enemy force of this mission. Absent means: as the campaign book
   * has it (see `missionEnemy`); null for none. */
  enemy?: CrusadeEnemy | null;
  /** The edition the mission is played in; 10 when absent. */
  edition?: Edition;
}

export interface CrusadePlayer {
  id: string;
  name: string;
  /** The 10th edition roster (armies/<id>.json) its units come from. */
  armyId: string;
  /** Its roster in another edition, keyed by edition ("11"). */
  armyIds?: Record<string, string>;
}

/** One unit of an enemy force, from a roster in armies/. */
export interface EnemyUnitRef {
  armyId: string;
  unitId: string;
}

/** A mission's enemy: units picked from one or more rosters (a mission can
 * mix them, e.g. Chaos with enthralled Orks). */
export interface CrusadeEnemy {
  units: EnemyUnitRef[];
  /** leaderId -> the squad it leads in this mission. */
  leaders: Record<string, string>;
  /** The detachment the mission gives the enemy; null for none, absent to
   * use the roster's own. */
  detachment?: string | null;
}

export interface CrusadeState {
  name: string;
  players: CrusadePlayer[];
  units: CrusadeUnit[];
  missions: CrusadeMission[];
}

export interface Rank {
  name: string;
  minXp: number;
  /** Honours earned by reaching this rank and the ones below it. */
  honours: number;
}

export const RANKS: readonly Rank[] = [
  { name: "Новачок", minXp: 0, honours: 0 },
  { name: "Загартований", minXp: 3, honours: 1 },
  { name: "Ветеран", minXp: 6, honours: 2 },
  { name: "Герой", minXp: 10, honours: 3 },
];

export function rankFor(xp: number): Rank {
  let rank = RANKS[0];
  for (const r of RANKS) if (xp >= r.minXp) rank = r;
  return rank;
}

/** XP still needed for the next rank, or null at the top. */
export function xpToNextRank(xp: number): number | null {
  const next = RANKS.find((r) => r.minXp > xp);
  return next ? next.minXp - xp : null;
}

/** Honours a unit has earned from its ranks. The Hero rank's honour is
 * only for characters and elite units, which the book leaves to the
 * players; a unit without a Character is counted without it. Honours
 * given "out of turn" by mission results come on top of these. */
export function rankHonours(xp: number, hasCharacter: boolean): number {
  const rank = rankFor(xp);
  return rank.minXp >= 10 && !hasCharacter ? rank.honours - 1 : rank.honours;
}

export function isWrittenOff(unit: CrusadeUnit): boolean {
  return unit.scars.length >= SCARS_TO_WRITE_OFF;
}

/** Fields in play for the next mission: not sitting it out, not written off. */
export function isAvailable(unit: CrusadeUnit): boolean {
  return !unit.skipsMission && !isWrittenOff(unit);
}

export function availableHonours(unit: CrusadeUnit): HonourId[] {
  return HONOUR_IDS.filter((id) => !unit.honours.some((h) => h.id === id));
}

export function addHonour(unit: CrusadeUnit, id: HonourId, weapon: string | null): CrusadeUnit {
  if (unit.honours.some((h) => h.id === id)) return unit;
  const keepsWeapon = HONOURS[id].weaponType !== null;
  return { ...unit, honours: [...unit.honours, { id, weapon: keepsWeapon ? weapon : null }] };
}

export function removeHonour(unit: CrusadeUnit, id: HonourId): CrusadeUnit {
  return { ...unit, honours: unit.honours.filter((h) => h.id !== id) };
}

export function availableScars(unit: CrusadeUnit): ScarId[] {
  return SCAR_IDS.filter((id) => !unit.scars.includes(id));
}

export function addScar(unit: CrusadeUnit, id: ScarId): CrusadeUnit {
  if (unit.scars.includes(id)) return unit;
  return { ...unit, scars: [...unit.scars, id] };
}

export function removeScar(unit: CrusadeUnit, id: ScarId): CrusadeUnit {
  return { ...unit, scars: unit.scars.filter((s) => s !== id) };
}

export function setXp(unit: CrusadeUnit, xp: number): CrusadeUnit {
  return { ...unit, xp: Math.max(0, Math.floor(xp)) };
}

export function updateUnit(
  state: CrusadeState,
  unitId: string,
  change: (unit: CrusadeUnit) => CrusadeUnit,
): CrusadeState {
  return { ...state, units: state.units.map((u) => (u.id === unitId ? change(u) : u)) };
}

export function updateMission(
  state: CrusadeState,
  number: number,
  change: Partial<Omit<CrusadeMission, "number">>,
): CrusadeState {
  return {
    ...state,
    missions: state.missions.map((m) => (m.number === number ? { ...m, ...change } : m)),
  };
}

/** The first mission without a result, or null once all are played. */
export function nextMission(state: CrusadeState): CrusadeMission | null {
  return state.missions.find((m) => m.result === null) ?? null;
}

export function unitsOf(state: CrusadeState, playerId: string): CrusadeUnit[] {
  return state.units.filter((u) => u.playerId === playerId);
}

/** Roster units of the player's army not yet in any campaign unit. */
export function freeRosterUnits(
  state: CrusadeState,
  rosterUnits: ParsedUnit[],
): ParsedUnit[] {
  const used = new Set(state.units.flatMap((u) => u.rosterUnitIds));
  return rosterUnits.filter((r) => !used.has(r.id));
}

export function newUnitId(state: CrusadeState): string {
  const taken = new Set(state.units.map((u) => u.id));
  let n = state.units.length + 1;
  while (taken.has(`u${n}`)) n++;
  return `u${n}`;
}

export function addUnit(
  state: CrusadeState,
  playerId: string,
  name: string,
  rosterUnitIds: string[],
): CrusadeState {
  const unit: CrusadeUnit = {
    id: newUnitId(state),
    playerId,
    name,
    rosterUnitIds,
    xp: 0,
    honours: [],
    scars: [],
    skipsMission: false,
  };
  return { ...state, units: [...state.units, unit] };
}

export function removeUnit(state: CrusadeState, unitId: string): CrusadeState {
  return {
    ...state,
    units: state.units
      .filter((u) => u.id !== unitId)
      .map((u) => (u.leads === unitId ? { ...u, leads: undefined } : u)),
  };
}

/** The roster units behind a campaign unit; ids no longer in the roster
 * (the list was rebuilt on New Recruit) are reported as missing. */
export function resolveRosterUnits(
  unit: CrusadeUnit,
  rosterUnits: ParsedUnit[],
): { found: ParsedUnit[]; missing: string[] } {
  const found: ParsedUnit[] = [];
  const missing: string[] = [];
  for (const id of unit.rosterUnitIds) {
    const r = rosterUnits.find((x) => x.id === id);
    if (r) found.push(r);
    else missing.push(id);
  }
  return { found, missing };
}

export function unitPoints(unit: CrusadeUnit, rosterUnits: ParsedUnit[]): number {
  return resolveRosterUnits(unit, rosterUnits).found.reduce((sum, r) => sum + r.totalPoints, 0);
}

export function hasCharacter(unit: CrusadeUnit, rosterUnits: ParsedUnit[]): boolean {
  return resolveRosterUnits(unit, rosterUnits).found.some((r) =>
    r.keywords.some((k) => k.toLowerCase() === "character"),
  );
}

/** Points of the player's current force: units available for the next mission. */
export function forcePoints(
  state: CrusadeState,
  playerId: string,
  rosterUnits: ParsedUnit[],
): number {
  return unitsOf(state, playerId)
    .filter(isAvailable)
    .reduce((sum, u) => sum + unitPoints(u, rosterUnits), 0);
}

/** Enemy forces the campaign book gives each mission, for campaigns that
 * ship with the app; see data/crusade-seed.ts. */
export type BookEnemies = Record<string, Record<number, CrusadeEnemy>>;

/** The mission's enemy: the one set on the mission, else the book's. */
export function missionEnemy(
  state: CrusadeState,
  mission: CrusadeMission,
  book: BookEnemies,
): CrusadeEnemy | null {
  if (mission.enemy !== undefined) return mission.enemy;
  return book[state.name]?.[mission.number] ?? null;
}

/** Add or remove one enemy unit. Removing it also drops it as a leader or
 * a led squad. */
export function toggleEnemyUnit(
  enemy: CrusadeEnemy | null,
  armyId: string,
  unitId: string,
): CrusadeEnemy {
  const current = enemy ?? { units: [], leaders: {} };
  const has = current.units.some((u) => u.armyId === armyId && u.unitId === unitId);
  if (!has) return { ...current, units: [...current.units, { armyId, unitId }] };
  const leaders = Object.fromEntries(
    Object.entries(current.leaders).filter(([l, t]) => l !== unitId && t !== unitId),
  );
  return {
    ...current,
    units: current.units.filter((u) => !(u.armyId === armyId && u.unitId === unitId)),
    leaders,
  };
}

/** Distinct weapon profile names of one type across the unit's roster units. */
export function weaponProfiles(
  unit: CrusadeUnit,
  rosterUnits: ParsedUnit[],
  type: "ranged" | "melee",
): string[] {
  const names = resolveRosterUnits(unit, rosterUnits).found.flatMap((r) =>
    r.weapons.filter((w) => w.type === type).map((w) => w.name),
  );
  return [...new Set(names)];
}

// ---- Editions --------------------------------------------------------------
// A campaign can change edition between missions (the book plays 1-3 in
// 10th and 4-5 in 11th). Units keep their progress; only the roster their
// datasheets and points come from changes.

export function missionEdition(mission: CrusadeMission): Edition {
  return mission.edition ?? 10;
}

/** The edition the next mission is played in (the last one's once all are
 * played). */
export function currentEdition(state: CrusadeState): Edition {
  const mission = nextMission(state) ?? state.missions[state.missions.length - 1];
  return mission ? missionEdition(mission) : 10;
}

export function playerArmyId(player: CrusadePlayer, edition: Edition): string {
  return edition === 10 ? player.armyId : (player.armyIds?.[String(edition)] ?? player.armyId);
}

/**
 * The campaign as one edition sees it: each player's roster for that
 * edition, and each unit's roster ids in it. Units without ids for the
 * edition are matched by datasheet name, in campaign order, to roster
 * units not already taken (so two Hellblaster squads take the two
 * Hellblaster squads). A unit that finds no match keeps its 10th edition
 * ids, which then show as missing.
 */
export function crusadeForEdition(
  state: CrusadeState,
  edition: Edition,
  armies: Array<{ id: string; parsed: { units: ParsedUnit[] } }>,
): CrusadeState {
  if (edition === 10) return state;
  const key = String(edition);
  const unitsOfArmy = (id: string) => armies.find((a) => a.id === id)?.parsed.units ?? [];
  const resolved = new Map<string, string[]>();
  for (const player of state.players) {
    const from = unitsOfArmy(player.armyId);
    const to = unitsOfArmy(playerArmyId(player, edition));
    const mine = state.units.filter((u) => u.playerId === player.id);
    const taken = new Set<string>();
    for (const unit of mine) {
      const ids = unit.rosterUnitIdsByEdition?.[key];
      if (ids) {
        resolved.set(unit.id, ids);
        ids.forEach((id) => taken.add(id));
      }
    }
    for (const unit of mine) {
      if (resolved.has(unit.id)) continue;
      const ids = unit.rosterUnitIds.map((id) => {
        const name = from.find((r) => r.id === id)?.name;
        const match = name ? to.find((r) => r.name === name && !taken.has(r.id)) : undefined;
        if (!match) return id;
        taken.add(match.id);
        return match.id;
      });
      resolved.set(unit.id, ids);
    }
  }
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, armyId: playerArmyId(p, edition) })),
    units: state.units.map((u) => ({ ...u, rosterUnitIds: resolved.get(u.id) ?? u.rosterUnitIds })),
  };
}

/** Add a unit picked from an edition's roster: its ids go where that
 * edition reads them. */
export function addUnitInEdition(
  state: CrusadeState,
  playerId: string,
  name: string,
  rosterUnitIds: string[],
  edition: Edition,
): CrusadeState {
  if (edition === 10) return addUnit(state, playerId, name, rosterUnitIds);
  const added = addUnit(state, playerId, name, []);
  const id = added.units[added.units.length - 1].id;
  return updateUnit(added, id, (u) => ({
    ...u,
    rosterUnitIdsByEdition: { [String(edition)]: rosterUnitIds },
  }));
}

/** Whether an honour's chosen profile is this weapon. A profile named
 * without its mode ("Bolt Rifle") covers every mode of it ("Bolt Rifle -
 * Focused Fire", "Bolt Rifle - Saturation"), as editions split some
 * weapons into several profiles. */
export function honourCoversWeapon(honourWeapon: string | null, weaponName: string): boolean {
  if (!honourWeapon) return false;
  return weaponName === honourWeapon || weaponName.startsWith(`${honourWeapon} - `);
}
