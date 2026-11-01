import { describe, expect, it } from "vitest";
import { armies } from "../lib/armies";
import {
  HONOURS,
  crusadeForEdition,
  currentEdition,
  forcePoints,
  honourCoversWeapon,
  missionEnemy,
  nextMission,
  rankFor,
  resolveRosterUnits,
  unitsOf,
} from "../lib/crusade";
import { getEligibleTargets } from "../lib/leaders";
import { ASHES_OF_ARMAGEDDON as seed, BOOK_ENEMIES } from "./crusade-seed";

function rosterUnits(armyId: string) {
  const army = armies.find((a) => a.id === armyId);
  if (!army) throw new Error(`no roster armies/${armyId}.json`);
  return army.parsed.units;
}

const eleventh = crusadeForEdition(seed, 11, armies);

function rosterOf(playerId: string, edition: 10 | 11) {
  const state = edition === 10 ? seed : eleventh;
  return rosterUnits(state.players.find((p) => p.id === playerId)!.armyId);
}

describe("«Попіл Армагеддону» after mission 3", () => {
  it("has the Librarian lead the Terminators, as the book has it from mission 4", () => {
    expect(seed.units.find((u) => u.name === "Бібліотекар")?.leads).toBe(
      seed.units.find((u) => u.name === "Термінатори Братства")?.id,
    );
  });


  it("finds every unit in its player's roster in both editions", () => {
    for (const edition of [10, 11] as const) {
      const state = edition === 10 ? seed : eleventh;
      for (const unit of state.units) {
        expect(resolveRosterUnits(unit, rosterOf(unit.playerId, edition)).missing, `${unit.name} (${edition})`).toEqual([]);
      }
    }
  });

  it("matches the campaign book's XP, ranks and honours", () => {
    const summary = seed.units.map((u) => [
      u.name,
      u.xp,
      rankFor(u.xp).name,
      u.honours.map((h) => HONOURS[h.id].name),
    ]);
    expect(summary).toEqual([
      ["Бібліотекар", 14, "Герой", ["Загартовані", "Непохитні"]],
      ["Страйк-сквад (перший)", 14, "Герой", ["Безжальні клинки", "Шалений натиск"]],
      ["Термінатори Братства", 10, "Герой", ["Безжальні клинки", "Загартовані", "Шалений натиск"]],
      ["Інтерсептори", 9, "Ветеран", ["Шалений натиск", "Безжальні клинки", "Загартовані"]],
      ["Страйк-сквад (другий)", 8, "Ветеран", ["Безжальні клинки", "Тримають рубіж", "Непохитні"]],
      ["Хеллбластери «золоті наплічники»", 9, "Ветеран", ["Влучні стрільці", "Загартовані"]],
      ["Хеллбластери «білі наплічники»", 6, "Ветеран", ["Влучні стрільці", "Непохитні", "Загартовані"]],
      ["Інтерсесори", 5, "Загартований", ["Влучні стрільці", "Тримають рубіж", "Загартовані"]],
      ["Техмарин", 4, "Загартований", ["Тримають рубіж"]],
      ["Апотекарій", 3, "Загартований", ["Непохитні"]],
      ["Редемптор", 3, "Загартований", ["Влучні стрільці"]],
      ["Елімінатори", 2, "Новачок", []],
    ]);
  });

  it("names honour weapons that the 11th edition rosters have", () => {
    for (const unit of eleventh.units) {
      const weapons = resolveRosterUnits(unit, rosterOf(unit.playerId, 11)).found.flatMap((r) =>
        r.weapons.map((w) => w.name),
      );
      for (const h of unit.honours) {
        if (h.weapon) expect(weapons.some((w) => honourCoversWeapon(h.weapon, w)), `${unit.name}: ${h.weapon}`).toBe(true);
      }
    }
  });

  it("plays mission 4 next, in 11th edition, and both forces fit its 700 points", () => {
    expect(currentEdition(seed)).toBe(11);
    expect(nextMission(seed)).toMatchObject({ number: 4, pointsLimit: 700 });
    expect(forcePoints(eleventh, "andrii", rosterOf("andrii", 11))).toBeLessThanOrEqual(700);
    expect(forcePoints(eleventh, "sashko", rosterOf("sashko", 11))).toBeLessThanOrEqual(700);
    expect(unitsOf(seed, "andrii")).toHaveLength(5);
    expect(unitsOf(seed, "sashko")).toHaveLength(7);
  });

  it("logs three wins, with 4-5 in 11th edition at 700 and 850", () => {
    expect(seed.missions.map((m) => [m.number, m.result, m.pointsLimit, m.edition ?? 10])).toEqual([
      [1, "win", 500, 10],
      [2, "win", 500, 10],
      [3, "win", 650, 10],
      [4, null, 700, 11],
      [5, null, 850, 11],
    ]);
  });

  function enemy(number: number) {
    const mission = seed.missions.find((m) => m.number === number)!;
    return missionEnemy(seed, mission, BOOK_ENEMIES)!;
  }

  function enemyNames(number: number) {
    return enemy(number).units.map((u) => rosterUnits(u.armyId).find((r) => r.id === u.unitId)?.name);
  }

  it("gives every mission the enemy force the campaign book lists", () => {
    expect(enemyNames(1)).toEqual([
      "Warboss", "Nobz", "Gretchin", "Lootas", "Mek", "Warbikers", "Boss Snikrot", "Kommandos",
    ]);
    expect(enemyNames(3)).toHaveLength(14);
    expect(enemyNames(4)).toEqual([
      "Master of Possession", "Legionaries", "Legionaries", "Traitor Guardsmen Squad", "Havocs",
      "Warpsmith", "Forgefiend", "Chaos Rhino", "Master of Executions", "Obliterators", "Venomcrawler",
      "Warboss in Mega Armour", "Meganobz", "Gretchin", "Killa Kans", "Big Mek", "Warboss", "Nobz",
      "Battlewagon", "Lootas [Legends]", "Mek", "Warbikers",
    ]);
    // The whole 11th edition Chaos roster, the Rampager and four Ork units.
    expect(enemyNames(5)).toHaveLength(rosterUnits("Chaos 11").length + 1 + 4);
    expect(enemyNames(5)).toEqual(expect.arrayContaining([...rosterUnits("Chaos 11").map((u) => u.name), "Knight Rampager"]));
    for (const n of [1, 2, 3, 4, 5]) expect(enemyNames(n), `mission ${n}`).not.toContain(undefined);
  });

  it("attaches each mission's leaders only where the datasheet allows", () => {
    for (const mission of seed.missions) {
      const e = enemy(mission.number);
      for (const [leaderId, targetId] of Object.entries(e.leaders)) {
        const ref = e.units.find((u) => u.unitId === leaderId)!;
        const roster = rosterUnits(ref.armyId);
        const leader = roster.find((u) => u.id === leaderId)!;
        const allowed = getEligibleTargets(leader, roster).map((u) => u.id);
        expect(allowed, `mission ${mission.number}: ${leader.name}`).toContain(targetId);
        expect(e.units.some((u) => u.unitId === targetId)).toBe(true);
      }
    }
  });
});
