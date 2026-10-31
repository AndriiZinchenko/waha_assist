// The campaign as battle sides: the players' campaign units together on
// one side, a mission's enemy on the other. Each is an ordinary ArmyEntry,
// so the battle screen and calculator need nothing new; App puts them next
// to the real armies under the ids below (one enemy id per mission).

import type { Ability, ParsedUnit, RuleRef, WeaponEntry } from "../../parseRoster.mjs";
import type { ArmyEntry } from "./armies";
import {
  HONOURS,
  SCARS,
  isAvailable,
  missionEnemy,
  nextMission,
  resolveRosterUnits,
  type BookEnemies,
  type CrusadeMission,
  type CrusadeState,
  type CrusadeUnit,
} from "./crusade";
import { effectiveDetachment } from "./detachment";
import { getLeaderCandidates } from "./leaders";

export const CRUSADE_ALLIES_ID = "crusade-allies";
const ENEMY_PREFIX = "crusade-enemy-";

export function crusadeEnemyId(missionNumber: number): string {
  return `${ENEMY_PREFIX}${missionNumber}`;
}

/** The mission an enemy side id stands for, or null for any other id. */
export function missionOfArmyId(id: string | null): number | null {
  if (!id?.startsWith(ENEMY_PREFIX)) return null;
  const n = Number(id.slice(ENEMY_PREFIX.length));
  return Number.isInteger(n) ? n : null;
}

export function isCrusadeArmyId(id: string | null): boolean {
  return id === CRUSADE_ALLIES_ID || missionOfArmyId(id) !== null;
}

function sumPoints(units: ParsedUnit[]): number {
  return units.reduce((sum, u) => sum + u.totalPoints, 0);
}

type CrusadeMod = { ref: RuleRef; tone: "positive" | "negative" };

function honourRef(id: keyof typeof HONOURS): RuleRef {
  return { name: HONOURS[id].name, text: `Нагорода кампанії. ${HONOURS[id].effect}.` };
}

function scarRef(id: keyof typeof SCARS): RuleRef {
  return { name: SCARS[id].name, text: `Бойовий шрам. ${SCARS[id].effect}.` };
}

/** One weapon with the campaign unit's honours and scars that touch it:
 * Marksmen +1 to hit and Ruthless Blades +1 AP on the chosen profile,
 * Grievous Wound / Damaged Gear -1 to hit in melee / at range. */
function weaponWithMods(weapon: WeaponEntry, unit: CrusadeUnit): WeaponEntry {
  const mods: CrusadeMod[] = [];
  let hitMod = 0;
  let ap = weapon.ap;
  for (const honour of unit.honours) {
    if (honour.weapon !== weapon.name) continue;
    if (honour.id === "marksmen" && weapon.type === "ranged") {
      hitMod += 1;
      mods.push({ ref: honourRef("marksmen"), tone: "positive" });
    }
    if (honour.id === "ruthlessBlades" && weapon.type === "melee") {
      ap -= 1;
      mods.push({ ref: honourRef("ruthlessBlades"), tone: "positive" });
    }
  }
  if (unit.scars.includes("grievousWound") && weapon.type === "melee") {
    hitMod -= 1;
    mods.push({ ref: scarRef("grievousWound"), tone: "negative" });
  }
  if (unit.scars.includes("damagedGear") && weapon.type === "ranged") {
    hitMod -= 1;
    mods.push({ ref: scarRef("damagedGear"), tone: "negative" });
  }
  if (mods.length === 0) return weapon;
  return { ...weapon, ap, crusadeHitMod: hitMod, crusadeMods: mods };
}

/** Honours and scars that change no number here, listed on the datasheet
 * under «Кампанія» so they are not forgotten at the table. A profile honour
 * without a chosen profile is listed too, since it cannot apply yet. */
function campaignAbilities(unit: CrusadeUnit): Ability[] {
  const out: Ability[] = [];
  for (const honour of unit.honours) {
    const info = HONOURS[honour.id];
    if (info.weaponType && honour.weapon) continue;
    const text = info.weaponType
      ? `${info.effect}. Профіль зброї не вибрано на сторінці кампанії, тож калькулятор його не враховує.`
      : `${info.effect}.`;
    out.push({ type: "Кампанія", name: info.name, text });
  }
  for (const id of unit.scars) {
    if (id === "grievousWound" || id === "damagedGear") continue;
    out.push({ type: "Кампанія", name: `Шрам: ${SCARS[id].name}`, text: `${SCARS[id].effect}.` });
  }
  return out;
}

/** A roster unit as the campaign has it: weapon honours and scars baked in,
 * the rest listed among its abilities. */
export function withCrusadeMods(roster: ParsedUnit, unit: CrusadeUnit): ParsedUnit {
  const extra = campaignAbilities(unit);
  return {
    ...roster,
    weapons: roster.weapons.map((w) => weaponWithMods(w, unit)),
    abilities: [...roster.abilities, ...extra],
    abilitySections:
      extra.length > 0
        ? [...roster.abilitySections, { type: "Кампанія", items: extra }]
        : roster.abilitySections,
  };
}

/**
 * The allied side: every campaign unit available for the next mission,
 * from each player's roster, with its honours and scars applied. A campaign
 * unit made of one roster unit takes its campaign name, so the two
 * Hellblaster squads stay apart. (A weapon override set in army
 * configuration rebuilds a unit's weapons and drops the honours on them.)
 */
function alliedSide(crusade: CrusadeState, armies: ArmyEntry[]): ArmyEntry | null {
  const units: ParsedUnit[] = [];
  const catalogues: string[] = [];
  for (const player of crusade.players) {
    const army = armies.find((a) => a.id === player.armyId);
    if (!army) continue;
    catalogues.push(army.parsed.catalogue);
    for (const unit of crusade.units) {
      if (unit.playerId !== player.id || !isAvailable(unit)) continue;
      const { found } = resolveRosterUnits(unit, army.parsed.units);
      const modded = found.map((r) => withCrusadeMods(r, unit));
      const named = modded.length === 1 && unit.name ? [{ ...modded[0], name: unit.name }] : modded;
      units.push(...named);
    }
  }
  if (units.length === 0) return null;
  return {
    id: CRUSADE_ALLIES_ID,
    fileName: "",
    edition: 10,
    fromCrusade: true,
    sourceCatalogues: catalogues,
    parsed: {
      name: crusade.name,
      system: "",
      catalogue: "Союзники кампанії",
      catalogueRevision: 0,
      generatedBy: "",
      pointsLimit: nextMission(crusade)?.pointsLimit ?? null,
      pointsTotal: sumPoints(units),
      // Each player has their own detachment, so the side shows none.
      detachment: null,
      units,
    },
  };
}

/**
 * An enemy unit as a mission fields it: without the enhancements its
 * roster gave it (the missions grant none), so neither their abilities nor
 * their points come along.
 */
function withoutEnhancements(unit: ParsedUnit): ParsedUnit {
  if (unit.enhancements.length === 0) return unit;
  const names = new Set(unit.enhancements.map((e) => e.name));
  return {
    ...unit,
    enhancements: [],
    totalPoints: unit.basePoints,
    abilities: unit.abilities.filter((a) => !names.has(a.name)),
    abilitySections: unit.abilitySections.map((section) => ({
      ...section,
      items: section.items.filter((a) => !names.has(a.name)),
    })),
  };
}

/** The resolved units of a mission's enemy, in the order the mission lists
 * them; units no longer in their roster are left out. */
function enemyUnits(
  crusade: CrusadeState,
  mission: CrusadeMission,
  armies: ArmyEntry[],
  book: BookEnemies,
): Array<{ army: ArmyEntry; unit: ParsedUnit }> {
  const enemy = missionEnemy(crusade, mission, book);
  const out: Array<{ army: ArmyEntry; unit: ParsedUnit }> = [];
  for (const ref of enemy?.units ?? []) {
    const army = armies.find((a) => a.id === ref.armyId);
    const unit = army?.parsed.units.find((u) => u.id === ref.unitId);
    if (army && unit) out.push({ army, unit: withoutEnhancements(unit) });
  }
  return out;
}

function enemySide(
  crusade: CrusadeState,
  mission: CrusadeMission,
  armies: ArmyEntry[],
  detachmentOverrides: Record<string, string>,
  book: BookEnemies,
): ArmyEntry | null {
  const resolved = enemyUnits(crusade, mission, armies, book);
  if (resolved.length === 0) return null;
  const sources = [...new Set(resolved.map((r) => r.army))];
  const main = sources[0];
  const enemy = missionEnemy(crusade, mission, book);
  // The mission names the detachment (or none); otherwise a single roster
  // brings its own, and a mixed force has none.
  const detachment =
    enemy?.detachment !== undefined
      ? enemy.detachment
      : sources.length === 1
        ? effectiveDetachment(main, detachmentOverrides)
        : null;
  return {
    id: crusadeEnemyId(mission.number),
    fileName: main.fileName,
    edition: main.edition,
    fromCrusade: true,
    sourceCatalogues: sources.map((a) => a.parsed.catalogue),
    parsed: {
      ...main.parsed,
      catalogue: sources.map((a) => a.parsed.catalogue).join(" + "),
      name: `Місія ${mission.number}. ${mission.name}`,
      pointsTotal: sumPoints(resolved.map((r) => r.unit)),
      detachment,
      units: resolved.map((r) => r.unit),
    },
  };
}

/** Points of a mission's enemy force. */
export function missionEnemyPoints(
  crusade: CrusadeState,
  mission: CrusadeMission,
  armies: ArmyEntry[],
  book: BookEnemies,
): number {
  return sumPoints(enemyUnits(crusade, mission, armies, book).map((r) => r.unit));
}

/** The allied side and one enemy side per mission, where the campaign
 * can fill them. */
export function crusadeBattleArmies(
  crusade: CrusadeState | null,
  armies: ArmyEntry[],
  detachmentOverrides: Record<string, string>,
  book: BookEnemies,
): ArmyEntry[] {
  if (!crusade) return [];
  return [
    alliedSide(crusade, armies),
    ...crusade.missions.map((m) => enemySide(crusade, m, armies, detachmentOverrides, book)),
  ].filter((a): a is ArmyEntry => a !== null);
}

/**
 * Leaders in a campaign battle, in place of the armies' own configuration:
 * a campaign unit made of a leader and a squad is that leader attached to
 * that squad, and the enemy's leaders are attached as the mission says.
 */
export function crusadeLeaderAssignments(
  crusade: CrusadeState | null,
  armies: ArmyEntry[],
  missionNumber: number | null,
  book: BookEnemies,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!crusade) return out;
  const mission = crusade.missions.find((m) => m.number === missionNumber);
  if (mission) Object.assign(out, missionEnemy(crusade, mission, book)?.leaders ?? {});
  for (const unit of crusade.units) {
    const army = armies.find(
      (a) => a.id === crusade.players.find((p) => p.id === unit.playerId)?.armyId,
    );
    if (!army) continue;
    const { found } = resolveRosterUnits(unit, army.parsed.units);
    const leaders = getLeaderCandidates(found);
    const squad = found.find((u) => !leaders.includes(u));
    if (!squad) continue;
    for (const leader of leaders) out[leader.id] = squad.id;
  }
  return out;
}
