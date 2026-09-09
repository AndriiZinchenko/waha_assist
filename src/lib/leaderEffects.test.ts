import { describe, expect, it } from "vitest";
import type { ParsedUnit, WeaponEntry } from "../../parseRoster.mjs";
import {
  applyLeaderWeaponBonuses,
  leaderHitPenaltyAgainst,
  leaderHitPenaltySources,
  withLeaderWeaponBonuses,
} from "./leaderEffects";

function makeWeapon(overrides: Partial<WeaponEntry> = {}): WeaponEntry {
  return {
    profileId: "w1",
    name: "Purifying Flame",
    subProfile: false,
    type: "ranged",
    count: 1,
    range: '12"',
    attacks: { dice: 0, sides: 0, flat: 3, raw: "3", avg: 3 },
    skill: 3,
    skillRaw: "3+",
    strength: 4,
    ap: 0,
    damage: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 },
    keywords: [],
    rules: [],
    ...overrides,
  };
}

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

const CROWE_ABILITY = {
  type: "Abilities",
  name: "Champion of the Order of Purifiers (Psychic)",
  text: "While this model is leading a unit, add 1 to the Attacks characteristic of Purifying Flame weapons equipped by that unit.",
};

const SANCTUARY_ABILITY = {
  type: "Abilities",
  name: "Sanctuary (Psychic)",
  text: "While this model is leading a unit, each time an attack targets that unit, subtract 1 from the Hit roll.",
};

describe("withLeaderWeaponBonuses", () => {
  it("adds the leader's own weapon bonus to the LED unit's matching weapons", () => {
    const crowe = makeUnit({
      id: "crowe",
      name: "Castellan Crowe",
      abilities: [CROWE_ABILITY],
      weapons: [makeWeapon({ profileId: "crowe-flame", attacks: { dice: 0, sides: 0, flat: 3, raw: "3", avg: 3 } })],
    });
    const purifiers = makeUnit({
      id: "purifiers",
      name: "Purifier Squad",
      weapons: [makeWeapon({ profileId: "sq-flame", attacks: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 } })],
    });
    const units = [crowe, purifiers];
    const assignments = { crowe: "purifiers" };

    const result = withLeaderWeaponBonuses(purifiers, units, assignments);
    expect(result.weapons[0].attacks?.flat).toBe(2);
    expect(result.weapons[0].attacks?.raw).toBe("2");
  });

  it("tags the modified weapon with the source ability, for the UI to flag", () => {
    const crowe = makeUnit({
      id: "crowe",
      name: "Castellan Crowe",
      abilities: [CROWE_ABILITY],
    });
    const purifiers = makeUnit({
      id: "purifiers",
      name: "Purifier Squad",
      weapons: [makeWeapon()],
    });
    const result = withLeaderWeaponBonuses(purifiers, [crowe, purifiers], {
      crowe: "purifiers",
    });
    expect(result.weapons[0].leaderMods).toEqual([
      { name: CROWE_ABILITY.name, text: CROWE_ABILITY.text },
    ]);
  });

  it("leaves unaffected weapons without a leaderMods tag", () => {
    const crowe = makeUnit({
      id: "crowe",
      abilities: [CROWE_ABILITY],
      weapons: [makeWeapon({ profileId: "sword", name: "Nemesis force sword" })],
    });
    const purifiers = makeUnit({ id: "purifiers" });
    const result = withLeaderWeaponBonuses(crowe, [crowe, purifiers], {
      crowe: "purifiers",
    });
    expect(result.weapons[0].leaderMods).toBeUndefined();
  });

  it("also boosts the leader's OWN matching weapon, since it's part of the same attached unit", () => {
    const crowe = makeUnit({
      id: "crowe",
      name: "Castellan Crowe",
      abilities: [CROWE_ABILITY],
      weapons: [makeWeapon({ profileId: "crowe-flame", attacks: { dice: 0, sides: 0, flat: 3, raw: "3", avg: 3 } })],
    });
    const purifiers = makeUnit({ id: "purifiers", name: "Purifier Squad" });
    const units = [crowe, purifiers];
    const assignments = { crowe: "purifiers" };

    const result = withLeaderWeaponBonuses(crowe, units, assignments);
    expect(result.weapons[0].attacks?.flat).toBe(4);
    expect(result.weapons[0].attacks?.raw).toBe("4");
  });

  it("does nothing when the leader isn't actually attached", () => {
    const crowe = makeUnit({
      id: "crowe",
      abilities: [CROWE_ABILITY],
      weapons: [makeWeapon()],
    });
    const result = withLeaderWeaponBonuses(crowe, [crowe], {});
    expect(result).toBe(crowe);
  });

  it("only bumps weapons matching the ability's named weapon", () => {
    const crowe = makeUnit({
      id: "crowe",
      abilities: [CROWE_ABILITY],
      weapons: [
        makeWeapon({ profileId: "flame", name: "Purifying Flame" }),
        makeWeapon({ profileId: "sword", name: "Nemesis force sword", attacks: { dice: 0, sides: 0, flat: 4, raw: "4", avg: 4 } }),
      ],
    });
    const purifiers = makeUnit({ id: "purifiers" });
    const result = withLeaderWeaponBonuses(crowe, [crowe, purifiers], { crowe: "purifiers" });
    expect(result.weapons.find((w) => w.profileId === "flame")?.attacks?.flat).toBe(4);
    expect(result.weapons.find((w) => w.profileId === "sword")?.attacks?.flat).toBe(4);
  });

  it("preserves dice-based attacks notation when bumping", () => {
    const crowe = makeUnit({
      id: "crowe",
      abilities: [CROWE_ABILITY],
      weapons: [makeWeapon({ attacks: { dice: 1, sides: 6, flat: 0, raw: "D6", avg: 3.5 } })],
    });
    const purifiers = makeUnit({ id: "purifiers" });
    const result = withLeaderWeaponBonuses(crowe, [crowe, purifiers], { crowe: "purifiers" });
    expect(result.weapons[0].attacks?.raw).toBe("D6+1");
    expect(result.weapons[0].attacks?.avg).toBe(4.5);
  });

  it("sums bonuses from more than one attached leader", () => {
    const leader1 = makeUnit({ id: "l1", abilities: [CROWE_ABILITY] });
    const leader2 = makeUnit({ id: "l2", abilities: [CROWE_ABILITY] });
    const unit = makeUnit({
      id: "u1",
      weapons: [makeWeapon({ attacks: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 } })],
    });
    const result = withLeaderWeaponBonuses(unit, [leader1, leader2, unit], {
      l1: "u1",
      l2: "u1",
    });
    expect(result.weapons[0].attacks?.flat).toBe(3);
  });
});

describe("applyLeaderWeaponBonuses", () => {
  it("applies the transform across a whole unit list consistently", () => {
    const crowe = makeUnit({
      id: "crowe",
      abilities: [CROWE_ABILITY],
      weapons: [makeWeapon({ profileId: "crowe-flame" })],
    });
    const purifiers = makeUnit({
      id: "purifiers",
      weapons: [makeWeapon({ profileId: "sq-flame", attacks: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 } })],
    });
    const [outCrowe, outPurifiers] = applyLeaderWeaponBonuses(
      [crowe, purifiers],
      { crowe: "purifiers" },
    );
    expect(outCrowe.weapons[0].attacks?.flat).toBe(4);
    expect(outPurifiers.weapons[0].attacks?.flat).toBe(2);
  });
});

describe("leaderHitPenaltyAgainst", () => {
  it("returns the leader's hit penalty when attached", () => {
    const voldus = makeUnit({ id: "voldus", abilities: [SANCTUARY_ABILITY] });
    const squad = makeUnit({ id: "squad" });
    expect(
      leaderHitPenaltyAgainst(squad, [voldus, squad], { voldus: "squad" }),
    ).toBe(-1);
  });

  it("returns 0 when unattached", () => {
    const voldus = makeUnit({ id: "voldus", abilities: [SANCTUARY_ABILITY] });
    const squad = makeUnit({ id: "squad" });
    expect(leaderHitPenaltyAgainst(squad, [voldus, squad], {})).toBe(0);
  });

  it("returns 0 for a leader/ability that grants no hit penalty", () => {
    const crowe = makeUnit({ id: "crowe", abilities: [CROWE_ABILITY] });
    const squad = makeUnit({ id: "squad" });
    expect(
      leaderHitPenaltyAgainst(squad, [crowe, squad], { crowe: "squad" }),
    ).toBe(0);
  });
});

describe("leaderHitPenaltySources", () => {
  it("names the ability responsible for the penalty", () => {
    const voldus = makeUnit({ id: "voldus", abilities: [SANCTUARY_ABILITY] });
    const squad = makeUnit({ id: "squad" });
    expect(
      leaderHitPenaltySources(squad, [voldus, squad], { voldus: "squad" }),
    ).toEqual([{ name: SANCTUARY_ABILITY.name, text: SANCTUARY_ABILITY.text }]);
  });

  it("returns an empty list when unattached", () => {
    const voldus = makeUnit({ id: "voldus", abilities: [SANCTUARY_ABILITY] });
    const squad = makeUnit({ id: "squad" });
    expect(leaderHitPenaltySources(squad, [voldus, squad], {})).toEqual([]);
  });
});
