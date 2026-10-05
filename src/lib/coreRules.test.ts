import { describe, expect, it } from "vitest";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { referencedCoreRules } from "./coreRules";

const base = {
  id: "u", entryId: null, name: "Techmarine", kind: "unit", basePoints: 0, totalPoints: 0,
  modelCount: 1, models: [], profile: { M: '6"', T: 4, SV: 3, W: 4, LD: "6+", OC: 1 },
  invuln: null, keywords: [], faction: null, isWarlord: false, enhancements: [],
  weapons: [], loadouts: [], abilitySections: [],
} as unknown as ParsedUnit;

function unit(abilities: Array<[string, string]>, rules: Array<[string, string]> = []): ParsedUnit {
  return {
    ...base,
    abilities: abilities.map(([name, text]) => ({ name, text, type: "Abilities" })),
    rules: rules.map(([name, text]) => ({ name, text })),
  } as unknown as ParsedUnit;
}

describe("referencedCoreRules", () => {
  it("adds the definition of a core ability an ability's text refers to", () => {
    const u = unit([["Techmarine", "While near Vehicles, this model has the Lone Operative ability"]]);
    expect(referencedCoreRules(u).map((r) => r.name)).toEqual(["Lone Operative"]);
    expect(referencedCoreRules(u)[0].text).toMatch(/12"/);
  });

  it("adds a core ability the unit has as an ability of its own", () => {
    const u = unit([["Stealth", "x"]]);
    expect(referencedCoreRules(u).map((r) => r.name)).toEqual(["Stealth"]);
  });

  it("skips one the unit already lists as a rule, even with a value after the name", () => {
    const u = unit(
      [["Techmarine", "this model has the Deep Strike ability"]],
      [["Deep Strike", "x"]],
    );
    expect(referencedCoreRules(u)).toEqual([]);
    const v = unit([["X", "Deadly Demise applies"]], [["Deadly Demise D3", "y"]]);
    expect(referencedCoreRules(v)).toEqual([]);
  });

  it("does not match inside another word", () => {
    expect(referencedCoreRules(unit([["X", "Hoverboards are not Hover"]])).map((r) => r.name)).toEqual(["Hover"]);
    expect(referencedCoreRules(unit([["X", "Hoverboards only"]]))).toEqual([]);
  });

  it("returns each core ability once, in a stable order", () => {
    const u = unit([
      ["A", "Lone Operative and Stealth"],
      ["B", "Stealth again, then Lone Operative"],
    ]);
    expect(referencedCoreRules(u).map((r) => r.name)).toEqual(["Lone Operative", "Stealth"]);
  });
});
