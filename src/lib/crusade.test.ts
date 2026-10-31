import { describe, expect, it } from "vitest";
import type { ParsedUnit } from "../../parseRoster.mjs";
import {
  addHonour,
  addScar,
  addUnit,
  availableHonours,
  missionEnemy,
  forcePoints,
  freeRosterUnits,
  hasCharacter,
  isAvailable,
  isWrittenOff,
  nextMission,
  rankFor,
  rankHonours,
  removeHonour,
  resolveRosterUnits,
  setXp,
  toggleEnemyUnit,
  updateMission,
  weaponProfiles,
  xpToNextRank,
  type CrusadeState,
  type CrusadeUnit,
} from "./crusade";

function roster(id: string, points: number, keywords: string[] = [], weapons: Array<[string, "ranged" | "melee"]> = []): ParsedUnit {
  return {
    id,
    name: id,
    totalPoints: points,
    keywords,
    weapons: weapons.map(([name, type]) => ({ name, type })),
  } as unknown as ParsedUnit;
}

function unit(overrides: Partial<CrusadeUnit> = {}): CrusadeUnit {
  return {
    id: "u1",
    playerId: "p1",
    name: "Test",
    rosterUnitIds: [],
    xp: 0,
    honours: [],
    scars: [],
    skipsMission: false,
    ...overrides,
  };
}

function campaign(units: CrusadeUnit[] = []): CrusadeState {
  return {
    name: "Test",
    players: [{ id: "p1", name: "A", armyId: "Grey" }],
    units,
    missions: [
      { number: 1, name: "One", result: "win", pointsLimit: 500, notes: "" },
      { number: 2, name: "Two", result: null, pointsLimit: 650, notes: "" },
    ],
  };
}

describe("ranks", () => {
  it.each([
    [0, "Новачок"],
    [2, "Новачок"],
    [3, "Загартований"],
    [5, "Загартований"],
    [6, "Ветеран"],
    [9, "Ветеран"],
    [10, "Герой"],
    [25, "Герой"],
  ])("%i XP is %s", (xp, name) => {
    expect(rankFor(xp).name).toBe(name);
  });

  it("counts XP to the next rank, none at Hero", () => {
    expect(xpToNextRank(4)).toBe(2);
    expect(xpToNextRank(10)).toBeNull();
  });

  it("gives one honour per rank reached; Hero only with a Character", () => {
    expect(rankHonours(2, false)).toBe(0);
    expect(rankHonours(3, false)).toBe(1);
    expect(rankHonours(6, false)).toBe(2);
    expect(rankHonours(10, true)).toBe(3);
    expect(rankHonours(10, false)).toBe(2);
  });
});

describe("honours", () => {
  it("never repeats an honour on one unit", () => {
    const once = addHonour(unit(), "hardened", null);
    expect(addHonour(once, "hardened", null).honours).toHaveLength(1);
    expect(availableHonours(once)).not.toContain("hardened");
  });

  it("keeps the weapon only for profile honours", () => {
    const u = addHonour(addHonour(unit(), "marksmen", "Bolt Rifle"), "steadfast", "Bolt Rifle");
    expect(u.honours).toEqual([
      { id: "marksmen", weapon: "Bolt Rifle" },
      { id: "steadfast", weapon: null },
    ]);
  });

  it("removes an honour", () => {
    expect(removeHonour(addHonour(unit(), "steadfast", null), "steadfast").honours).toEqual([]);
  });
});

describe("scars", () => {
  it("writes a unit off at three scars", () => {
    let u = addScar(addScar(unit(), "limp"), "panic");
    expect(isWrittenOff(u)).toBe(false);
    u = addScar(u, "concussion");
    expect(isWrittenOff(u)).toBe(true);
    expect(isAvailable(u)).toBe(false);
  });

  it("does not take the same scar twice", () => {
    expect(addScar(addScar(unit(), "limp"), "limp").scars).toEqual(["limp"]);
  });
});

describe("XP", () => {
  it("never goes below zero", () => {
    expect(setXp(unit(), -2).xp).toBe(0);
  });
});

describe("points and roster", () => {
  const rosterUnits = [
    roster("lib", 105, ["Character", "Infantry"]),
    roster("strike", 120, ["Infantry"], [["Storm bolter", "ranged"], ["Nemesis force weapon", "melee"], ["Storm bolter", "ranged"]]),
    roster("inter", 125),
  ];

  it("sums only units available for the next mission", () => {
    const state = campaign([
      unit({ id: "a", rosterUnitIds: ["lib", "strike"] }),
      unit({ id: "b", rosterUnitIds: ["inter"], skipsMission: true }),
    ]);
    expect(forcePoints(state, "p1", rosterUnits)).toBe(225);
  });

  it("reports roster ids that are gone", () => {
    const r = resolveRosterUnits(unit({ rosterUnitIds: ["lib", "nope"] }), rosterUnits);
    expect(r.found.map((x) => x.id)).toEqual(["lib"]);
    expect(r.missing).toEqual(["nope"]);
  });

  it("knows when a Character is in the unit", () => {
    expect(hasCharacter(unit({ rosterUnitIds: ["lib", "strike"] }), rosterUnits)).toBe(true);
    expect(hasCharacter(unit({ rosterUnitIds: ["strike"] }), rosterUnits)).toBe(false);
  });

  it("offers each roster unit to one campaign unit only", () => {
    const state = campaign([unit({ rosterUnitIds: ["lib", "strike"] })]);
    expect(freeRosterUnits(state, rosterUnits).map((r) => r.id)).toEqual(["inter"]);
  });

  it("lists distinct weapon profiles of a type", () => {
    const u = unit({ rosterUnitIds: ["strike"] });
    expect(weaponProfiles(u, rosterUnits, "ranged")).toEqual(["Storm bolter"]);
    expect(weaponProfiles(u, rosterUnits, "melee")).toEqual(["Nemesis force weapon"]);
  });

  it("adds a new unit with a fresh id and no progress", () => {
    const state = addUnit(campaign([unit({ id: "u1" })]), "p1", "Нові", ["inter"]);
    const added = state.units[1];
    expect(added.id).not.toBe("u1");
    expect(added).toMatchObject({ name: "Нові", xp: 0, honours: [], scars: [], rosterUnitIds: ["inter"] });
  });
});

describe("missions", () => {
  it("the next mission is the first without a result", () => {
    expect(nextMission(campaign())?.number).toBe(2);
    const done = updateMission(campaign(), 2, { result: "loss" });
    expect(nextMission(done)).toBeNull();
  });
});

describe("enemy", () => {
  const book = {
    Test: { 2: { units: [{ armyId: "Orks", unitId: "nobz" }], leaders: {}, detachment: "War Horde" } },
  };

  it("comes from the campaign book until the mission sets its own", () => {
    const state = campaign();
    const two = state.missions[1];
    expect(missionEnemy(state, two, book)?.units).toEqual([{ armyId: "Orks", unitId: "nobz" }]);
    expect(missionEnemy(state, state.missions[0], book)).toBeNull();
    expect(missionEnemy(state, { ...two, enemy: null }, book)).toBeNull();
    const own = { units: [{ armyId: "Chaos", unitId: "havocs" }], leaders: {} };
    expect(missionEnemy(state, { ...two, enemy: own }, book)).toBe(own);
    expect(missionEnemy({ ...state, name: "Other" }, two, book)).toBeNull();
  });

  it("adds units from several rosters and drops a removed unit's leader links", () => {
    let enemy = toggleEnemyUnit(null, "Orks", "boss");
    enemy = toggleEnemyUnit(enemy, "Orks", "nobz");
    enemy = toggleEnemyUnit(enemy, "Chaos", "havocs");
    enemy = { ...enemy, leaders: { boss: "nobz" } };
    expect(enemy.units).toEqual([
      { armyId: "Orks", unitId: "boss" },
      { armyId: "Orks", unitId: "nobz" },
      { armyId: "Chaos", unitId: "havocs" },
    ]);
    const without = toggleEnemyUnit(enemy, "Orks", "nobz");
    expect(without.units.map((u) => u.unitId)).toEqual(["boss", "havocs"]);
    expect(without.leaders).toEqual({});
  });
});
