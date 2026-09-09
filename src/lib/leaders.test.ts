import { describe, expect, it } from "vitest";
import type { ParsedUnit } from "../../parseRoster.mjs";
import {
  getEligibleTargets,
  getLeaderCandidates,
  groupUnitsByLeader,
  orderedUnits,
  parseLeaderEligibleNames,
} from "./leaders";

function makeUnit(overrides: Partial<ParsedUnit> = {}): ParsedUnit {
  return {
    id: "u1",
    name: "Test unit",
    kind: "unit",
    basePoints: 0,
    totalPoints: 0,
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

describe("parseLeaderEligibleNames", () => {
  it("extracts ■-bulleted names, dropping the intro line", () => {
    const text =
      "This model can be attached to the following units:\n■ CHAOS TERMINATOR SQUAD\n■ CHOSEN";
    expect(parseLeaderEligibleNames(text)).toEqual([
      "CHAOS TERMINATOR SQUAD",
      "CHOSEN",
    ]);
  });

  it("extracts markdown-bulleted, bold+underline-wrapped names", () => {
    const text =
      "This model can be attached to the following units:\n- **^^Brotherhood Terminator Squad^^**\n- **^^Paladin Squad^^**";
    expect(parseLeaderEligibleNames(text)).toEqual([
      "Brotherhood Terminator Squad",
      "Paladin Squad",
    ]);
  });

  it("extracts an inline comma-separated list (Marneus Calgar, Warpsmith exports)", () => {
    expect(
      parseLeaderEligibleNames(
        "This model can be attached to the following units: **^^Aggressor Squad, Assault Intercessor Squad, Victrix Honour Guard**^^",
      ),
    ).toEqual(["Aggressor Squad", "Assault Intercessor Squad", "Victrix Honour Guard"]);
    expect(
      parseLeaderEligibleNames(
        "This model can be attached to the following units: ^^**Chosen, Havocs, Legionaries**^^",
      ),
    ).toEqual(["Chosen", "Havocs", "Legionaries"]);
  });

  it("reads only the list, not a trailing paragraph about attachment rules", () => {
    const text =
      "This model can be attached to the following units:\n\n■ Intercessor Squad\n■ Tactical Squad\n\nYou can attach this model to one of the above units even if one Captain, Chapter Master or Lieutenant model has already been attached to it.";
    expect(parseLeaderEligibleNames(text)).toEqual(["Intercessor Squad", "Tactical Squad"]);
  });

  it("returns an empty list for null or non-bulleted text", () => {
    expect(parseLeaderEligibleNames(null)).toEqual([]);
    expect(parseLeaderEligibleNames("Some unrelated ability text.")).toEqual(
      [],
    );
  });
});

describe("getLeaderCandidates", () => {
  it("finds only units carrying a 'Leader' ability", () => {
    const leader = makeUnit({
      id: "l1",
      name: "Abaddon",
      abilities: [{ type: "Abilities", name: "Leader", text: "..." }],
    });
    const grunt = makeUnit({ id: "g1", name: "Legionaries" });
    expect(getLeaderCandidates([leader, grunt])).toEqual([leader]);
  });
});

describe("getEligibleTargets", () => {
  it("matches eligible names case-insensitively against units in the list", () => {
    const leader = makeUnit({
      id: "l1",
      name: "Abaddon",
      abilities: [
        {
          type: "Abilities",
          name: "Leader",
          text: "This model can be attached to the following units:\n■ CHAOS TERMINATOR SQUAD\n■ CHOSEN",
        },
      ],
    });
    const terminators = makeUnit({ id: "t1", name: "Chaos Terminator Squad" });
    const legionaries = makeUnit({ id: "g1", name: "Legionaries" });
    expect(getEligibleTargets(leader, [leader, terminators, legionaries])).toEqual([
      terminators,
    ]);
  });

  it("returns an empty list when the Leader ability has no parseable eligible names", () => {
    const leader = makeUnit({
      id: "l1",
      name: "Odd Leader",
      abilities: [{ type: "Abilities", name: "Leader", text: "No bullets here." }],
    });
    const other = makeUnit({ id: "u2", name: "Some Unit" });
    expect(getEligibleTargets(leader, [leader, other])).toEqual([]);
  });
});

describe("groupUnitsByLeader", () => {
  const leader = makeUnit({ id: "l1", name: "Abaddon" });
  const terminators = makeUnit({ id: "t1", name: "Chaos Terminator Squad" });
  const legionaries = makeUnit({ id: "g1", name: "Legionaries" });

  it("pulls an attached leader out of its own top-level slot", () => {
    const blocks = groupUnitsByLeader(
      [leader, terminators, legionaries],
      { l1: "t1" },
    );
    expect(blocks.map((b) => b.unit.id)).toEqual(["t1", "g1"]);
    expect(blocks[0].leaders).toEqual([leader]);
    expect(blocks[1].leaders).toEqual([]);
  });

  it("keeps original relative order for unattached units", () => {
    const blocks = groupUnitsByLeader([leader, terminators, legionaries], {});
    expect(blocks.map((b) => b.unit.id)).toEqual(["l1", "t1", "g1"]);
    expect(blocks.every((b) => b.leaders.length === 0)).toBe(true);
  });

  it("supports more than one leader attached to the same unit", () => {
    const leader2 = makeUnit({ id: "l2", name: "Lord Discordant" });
    const blocks = groupUnitsByLeader(
      [leader, leader2, terminators],
      { l1: "t1", l2: "t1" },
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].leaders.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("surfaces a leader as standalone instead of vanishing when its target isn't in the list", () => {
    const blocks = groupUnitsByLeader([leader, legionaries], {
      l1: "not-in-this-list",
    });
    expect(blocks.map((b) => b.unit.id)).toEqual(["l1", "g1"]);
  });
});

describe("orderedUnits", () => {
  it("flattens blocks into display order: each leader directly above its unit", () => {
    const captain = makeUnit({ id: "cap", name: "Captain" });
    const squad = makeUnit({ id: "sq", name: "Squad" });
    const tank = makeUnit({ id: "tank", name: "Tank" });
    const result = orderedUnits([squad, tank, captain], { cap: "sq" });
    expect(result.map((u) => u.id)).toEqual(["cap", "sq", "tank"]);
  });

  it("keeps an unattached leader in its own slot", () => {
    const captain = makeUnit({ id: "cap" });
    const squad = makeUnit({ id: "sq" });
    expect(orderedUnits([squad, captain], {}).map((u) => u.id)).toEqual([
      "sq",
      "cap",
    ]);
  });
});
