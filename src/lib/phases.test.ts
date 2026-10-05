import { describe, expect, it } from "vitest";
import { coreStratagems } from "../data/core-stratagems";
import { detachmentsForFaction } from "../data/detachments";
import { factionOptions } from "../data/unit-options/factions";
import {
  PHASES,
  mentionsPhase,
  partitionByPhase,
  stratagemInPhase,
  weaponModeFor,
} from "./phases";

describe("weaponModeFor", () => {
  it("maps Shooting to ranged and Fight to melee, the rest to none", () => {
    expect(weaponModeFor("shooting")).toBe("ranged");
    expect(weaponModeFor("fight")).toBe("melee");
    expect(weaponModeFor("command")).toBeNull();
    expect(weaponModeFor("movement")).toBeNull();
    expect(weaponModeFor("charge")).toBeNull();
  });
});

describe("mentionsPhase", () => {
  it("finds the phase by name in ability text, whoever's turn it is", () => {
    expect(mentionsPhase("In your Command phase, you can select one unit.", "command")).toBe(true);
    expect(mentionsPhase("at the start of the fight phase", "fight")).toBe(true);
    expect(mentionsPhase("until the end of the Charge phase.", "charge")).toBe(true);
  });

  it("does not match a different phase or a word that only starts like one", () => {
    expect(mentionsPhase("In your Command phase", "shooting")).toBe(false);
    expect(mentionsPhase("Each Charge roll is modified", "charge")).toBe(false);
    expect(mentionsPhase("Units with Fights First fight earlier", "fight")).toBe(false);
  });

  it("is false for missing text", () => {
    expect(mentionsPhase(null, "fight")).toBe(false);
    expect(mentionsPhase("", "fight")).toBe(false);
  });
});

describe("stratagemInPhase", () => {
  it("accepts the player's own phase, a reaction in it, and a shared timing", () => {
    expect(stratagemInPhase("Your Shooting phase", "shooting")).toBe(true);
    expect(
      stratagemInPhase(
        "Your opponent's Shooting phase, just after an enemy unit has selected its targets",
        "shooting",
      ),
    ).toBe(true);
    expect(stratagemInPhase("Your Shooting phase or the Fight phase", "fight")).toBe(true);
    expect(stratagemInPhase("Your Shooting phase or the Fight phase", "movement")).toBe(false);
  });

  it("accepts any-phase timings everywhere and never hides one with no timing", () => {
    for (const phase of PHASES) {
      expect(stratagemInPhase("Any phase", phase)).toBe(true);
      expect(stratagemInPhase(undefined, phase)).toBe(true);
      expect(stratagemInPhase("", phase)).toBe(true);
    }
  });

  it("recognises the timing of every stratagem in the data in at least one phase", () => {
    const all = [
      ...coreStratagems,
      ...factionOptions.flatMap((f) => detachmentsForFaction(f.catalogue).flatMap((d) => d.stratagems)),
    ];
    expect(all.length).toBeGreaterThan(100);
    const unrecognised = all
      .filter((s) => s.phase && !PHASES.some((p) => stratagemInPhase(s.phase, p)))
      .map((s) => `${s.name}: ${s.phase}`);
    expect(unrecognised).toEqual([]);
  });
});

describe("partitionByPhase", () => {
  const items = [
    { name: "A", text: "In your Command phase, do X." },
    { name: "B", text: "Passive." },
    { name: "C", text: "During the Command phase and also..." },
  ];

  it("splits into matching and other, keeping each order", () => {
    const { matching, other } = partitionByPhase(items, "command");
    expect(matching.map((i) => i.name)).toEqual(["A", "C"]);
    expect(other.map((i) => i.name)).toEqual(["B"]);
  });

  it("also matches on the item's name", () => {
    const { matching } = partitionByPhase([{ name: "Charge phase boost", text: null }], "charge");
    expect(matching).toHaveLength(1);
  });
});
