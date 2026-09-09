import { describe, expect, it } from "vitest";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { computeVisiblePoints, visibleUnits } from "./armyPoints";

function makeUnit(overrides: Partial<ParsedUnit> = {}): ParsedUnit {
  return {
    id: "u1",
    name: "Test unit",
    kind: "unit",
    basePoints: 0,
    totalPoints: 100,
    modelCount: 1,
    models: [],
    profile: { M: '6"', T: 4, SV: 3, W: 2, LD: "6+", OC: 1 },
    invuln: null,
    keywords: [],
    faction: null,
    isWarlord: false,
    enhancements: [],
    weapons: [],
    loadouts: [],
    abilities: [],
    abilitySections: [],
    rules: [],
    ...overrides,
  };
}

describe("computeVisiblePoints", () => {
  it("sums every unit's totalPoints when none are hidden", () => {
    const units = [
      makeUnit({ id: "u1", totalPoints: 100 }),
      makeUnit({ id: "u2", totalPoints: 250 }),
    ];
    expect(computeVisiblePoints(units, {})).toBe(350);
  });

  it("excludes hidden units from the sum", () => {
    const units = [
      makeUnit({ id: "u1", totalPoints: 100 }),
      makeUnit({ id: "u2", totalPoints: 250 }),
    ];
    expect(computeVisiblePoints(units, { u2: true })).toBe(100);
  });

  it("ignores a hidden flag explicitly set to false", () => {
    const units = [makeUnit({ id: "u1", totalPoints: 100 })];
    expect(computeVisiblePoints(units, { u1: false })).toBe(100);
  });
});

describe("visibleUnits", () => {
  it("filters out hidden units, keeping the rest in order", () => {
    const units = [
      makeUnit({ id: "u1", name: "A" }),
      makeUnit({ id: "u2", name: "B" }),
      makeUnit({ id: "u3", name: "C" }),
    ];
    expect(visibleUnits(units, { u2: true }).map((u) => u.id)).toEqual([
      "u1",
      "u3",
    ]);
  });
});
