import { describe, expect, it } from "vitest";
import { armies } from "../lib/armies";
import {
  HONOURS,
  forcePoints,
  missionEnemy,
  nextMission,
  rankFor,
  resolveRosterUnits,
  unitsOf,
} from "../lib/crusade";
import { getEligibleTargets } from "../lib/leaders";
import { ASHES_OF_ARMAGEDDON as seed, BOOK_ENEMIES } from "./crusade-seed";

function rosterUnits(armyId: string) {
  const army = armies.find((a) => a.id === armyId && a.edition === 10);
  if (!army) throw new Error(`no 10th edition roster armies/${armyId}.json`);
  return army.parsed.units;
}

const rosters: Record<string, ReturnType<typeof rosterUnits>> = {
  Grey: rosterUnits("Grey"),
  Ultramar: rosterUnits("Ultramar"),
};

function rosterOf(playerId: string) {
  const player = seed.players.find((p) => p.id === playerId)!;
  return rosters[player.armyId];
}

describe("«Попіл Армагеддону» after mission 2", () => {
  it("finds every unit in its player's 10th edition roster", () => {
    for (const unit of seed.units) {
      expect(resolveRosterUnits(unit, rosterOf(unit.playerId)).missing, unit.name).toEqual([]);
    }
  });

  it("matches the campaign book's XP, ranks and honours", () => {
    const summary = seed.units.map((u) => [
      u.name,
      u.xp,
      rankFor(u.xp).name,
      u.honours.map((h) => HONOURS[h.id].name + (h.weapon ? ` (${h.weapon})` : "")),
    ]);
    expect(summary).toEqual([
      ["Бібліотекар + Страйк-сквад", 10, "Герой", ["Безжальні клинки", "Загартовані", "Шалений натиск", "Непохитні"]],
      ["Інтерсептори", 6, "Ветеран", ["Шалений натиск", "Безжальні клинки"]],
      ["Страйк-сквад (другий)", 4, "Загартований", ["Безжальні клинки", "Тримають рубіж"]],
      ["Хеллбластери «золоті наплічники»", 8, "Ветеран", ["Влучні стрільці (Plasma Incinerator - Standard)", "Загартовані"]],
      ["Хеллбластери «білі наплічники»", 4, "Загартований", ["Влучні стрільці (Plasma Incinerator - Standard)", "Непохитні"]],
      ["Інтерсесори", 4, "Загартований", ["Влучні стрільці (Bolt Rifle)", "Тримають рубіж"]],
      ["Техмарин", 3, "Загартований", ["Тримають рубіж"]],
      ["Елімінатори", 2, "Новачок", []],
      ["Апотекарій", 2, "Новачок", []],
    ]);
  });

  it("names honour weapons that the roster actually has", () => {
    for (const unit of seed.units) {
      const weapons = resolveRosterUnits(unit, rosterOf(unit.playerId)).found.flatMap((r) =>
        r.weapons.map((w) => w.name),
      );
      for (const h of unit.honours) {
        if (h.weapon) expect(weapons, unit.name).toContain(h.weapon);
      }
    }
  });

  it("fits both forces within the 500 points of mission 2", () => {
    expect(forcePoints(seed, "andrii", rosterOf("andrii"))).toBe(470);
    expect(forcePoints(seed, "sashko", rosterOf("sashko"))).toBe(490);
    expect(unitsOf(seed, "andrii")).toHaveLength(3);
    expect(unitsOf(seed, "sashko")).toHaveLength(6);
  });

  const enemyRosters: Record<string, ReturnType<typeof rosterUnits>> = {
    Orks: rosterUnits("Orks"),
    Chaos: rosterUnits("Chaos"),
  };

  function enemyNames(number: number) {
    const mission = seed.missions.find((m) => m.number === number)!;
    const enemy = missionEnemy(seed, mission, BOOK_ENEMIES)!;
    return enemy.units.map((u) => enemyRosters[u.armyId].find((r) => r.id === u.unitId)?.name);
  }

  it("gives every mission the enemy force the campaign book lists", () => {
    expect(enemyNames(1)).toEqual([
      "Warboss", "Nobz", "Gretchin", "Lootas", "Mek", "Warbikers", "Boss Snikrot", "Kommandos",
    ]);
    expect(enemyNames(2)).toEqual([
      "Warboss", "Nobz", "Gretchin", "Mek", "Big Mek", "Lootas", "Warbikers", "Killa Kans",
    ]);
    expect(enemyNames(3)).toEqual([
      "Warboss in Mega Armour", "Meganobz", "Warboss", "Nobz", "Big Mek", "Killa Kans", "Gretchin",
      "Lootas", "Mek", "Warbikers", "Morkanaut", "Warboss in Mega Armour", "Meganobz", "Nobz",
    ]);
    expect(enemyNames(4)).toEqual([
      "Master of Possession", "Legionaries", "Legionaries", "Traitor Guardsmen Squad", "Havocs",
      "Warpsmith", "Forgefiend", "Chaos Rhino", "Master of Executions", "Obliterators",
      "Venomcrawler", "Warboss in Mega Armour", "Meganobz", "Gretchin", "Nobz",
    ]);
    // The whole Chaos roster.
    expect(enemyNames(5)).toHaveLength(enemyRosters.Chaos.length);
    expect(enemyNames(5)).toEqual(expect.arrayContaining(enemyRosters.Chaos.map((u) => u.name)));
  });

  it("attaches each mission's leaders only where the datasheet allows", () => {
    for (const mission of seed.missions) {
      const enemy = missionEnemy(seed, mission, BOOK_ENEMIES)!;
      for (const [leaderId, targetId] of Object.entries(enemy.leaders)) {
        const roster = Object.values(enemyRosters).find((r) => r.some((u) => u.id === leaderId))!;
        const leader = roster.find((u) => u.id === leaderId)!;
        const allowed = getEligibleTargets(leader, roster).map((u) => u.id);
        expect(allowed, `mission ${mission.number}: ${leader.name}`).toContain(targetId);
        expect(enemy.units.some((u) => u.unitId === targetId)).toBe(true);
      }
    }
  });

  it("logs two wins with mission 3 «WAAAGH!» at 650 next", () => {
    expect(seed.missions.map((m) => [m.number, m.result, m.pointsLimit])).toEqual([
      [1, "win", 500],
      [2, "win", 500],
      [3, null, 650],
      [4, null, 650],
      [5, null, 800],
    ]);
    expect(nextMission(seed)).toMatchObject({ number: 3, name: "WAAAGH!", pointsLimit: 650 });
  });
});
