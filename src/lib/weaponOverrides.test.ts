import { describe, expect, it } from "vitest";
import type { ParsedUnit, WeaponEntry } from "../../parseRoster.mjs";
import type { UnitOptionsResult } from "../data/unit-options/types";
import { getUnitLiveTotal } from "./loadouts";
import {
  addGroup,
  addWeapon,
  applyWeaponOverride,
  applyWeaponOverrides,
  removeGroup,
  removeWeapon,
  resolveWeapon,
  rosterGroups,
  rosterSignature,
  setGroupModelCount,
  setWeaponPerModel,
  startOverride,
  swapWeapon,
  type OptionsLookup,
  type UnitWeaponOverride,
} from "./weaponOverrides";

const options: UnitOptionsResult = {
  name: "Custodian Guard",
  rules: { Assault: "Assault rule text." },
  weapons: [
    {
      name: "Guardian Spear",
      rules: ["Assault"],
      profiles: [
        { id: "sp-m", name: "Guardian Spear", type: "melee", range: "Melee", attacks: "5", skill: "2+", strength: 7, ap: -2, damage: "2", keywords: "-" },
        { id: "sp-r", name: "Guardian Spear", type: "ranged", range: '24"', attacks: "2", skill: "2+", strength: 4, ap: -1, damage: "2", keywords: "Assault" },
      ],
    },
    {
      name: "Sentinel blade",
      rules: ["Assault"],
      profiles: [
        { id: "sb-m", name: "Sentinel Blade", type: "melee", range: "Melee", attacks: "5", skill: "2+", strength: 6, ap: -2, damage: "1", keywords: "-" },
        { id: "sb-r", name: "Sentinel Blade", type: "ranged", range: '12"', attacks: "2", skill: "2+", strength: 4, ap: -1, damage: "1", keywords: "Assault" },
      ],
    },
    {
      name: "Misericordia",
      rules: [],
      profiles: [
        { id: "mi", name: "Misericordia", type: "melee", range: "Melee", attacks: "4", skill: "2+", strength: 4, ap: -1, damage: "1", keywords: "-" },
      ],
    },
  ],
};

const lookup: OptionsLookup = () => options;
const noOptions: OptionsLookup = () => null;

function rosterWeapon(profileId: string, name: string, type: "ranged" | "melee", count: number): WeaponEntry {
  return {
    profileId, name, subProfile: true, type, count,
    range: type === "melee" ? "Melee" : '12"',
    attacks: { dice: 0, sides: 0, flat: 5, raw: "5", avg: 5 },
    skill: 2, skillRaw: "2+", strength: 6, ap: -2,
    damage: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 },
    keywords: [], rules: [],
  };
}

// Five Custodian Guard, all with Sentinel Blade (two profiles).
function guard(): ParsedUnit {
  return {
    id: "guard", entryId: "e-guard", name: "Custodian Guard", kind: "unit",
    basePoints: 150, totalPoints: 150, modelCount: 5, models: [],
    profile: { M: '6"', T: 6, SV: 2, W: 3, LD: "6+", OC: 2 },
    invuln: null, keywords: [], faction: null, isWarlord: false, enhancements: [],
    weapons: [
      rosterWeapon("r-sb-m", "Sentinel Blade", "melee", 5),
      rosterWeapon("r-sb-r", "Sentinel Blade", "ranged", 5),
    ],
    loadouts: [
      {
        key: "k1", modelCount: 5, wargear: [],
        weapons: [
          { profileId: "r-sb-m", name: "Sentinel Blade", perModel: 1 },
          { profileId: "r-sb-r", name: "Sentinel Blade", perModel: 1 },
        ],
      },
    ],
    abilities: [], abilitySections: [], rules: [],
  };
}

describe("rosterGroups", () => {
  it("collapses a weapon's profiles into its catalogue option name", () => {
    expect(rosterGroups(guard(), options)).toEqual([
      { key: "g1", modelCount: 5, weapons: [{ name: "Sentinel blade", perModel: 1 }] },
    ]);
  });

  it("keeps roster names when there are no options", () => {
    expect(rosterGroups(guard(), null)).toEqual([
      { key: "g1", modelCount: 5, weapons: [{ name: "Sentinel Blade", perModel: 1 }] },
    ]);
  });

  it("sums a profile mounted twice in one loadout", () => {
    const unit = guard();
    unit.loadouts[0].weapons = [
      { profileId: "r-sb-m", name: "Sentinel Blade", perModel: 2 },
      { profileId: "r-sb-m", name: "Sentinel Blade", perModel: 1 },
    ];
    expect(rosterGroups(unit, options)[0].weapons).toEqual([{ name: "Sentinel blade", perModel: 3 }]);
  });
});

describe("rosterSignature", () => {
  it("is the same for the same loadouts and changes with them", () => {
    expect(rosterSignature(guard())).toBe(rosterSignature(guard()));
    const other = guard();
    other.loadouts[0].modelCount = 4;
    expect(rosterSignature(other)).not.toBe(rosterSignature(guard()));
  });
});

describe("resolveWeapon", () => {
  it("builds entries from the catalogue option, case-insensitively", () => {
    const entries = resolveWeapon("guardian spear", options, guard());
    expect(entries).toHaveLength(2);
    const melee = entries!.find((e) => e.type === "melee")!;
    expect(melee.profileId).toBe("opt:sp-m");
    expect(melee.subProfile).toBe(true);
    expect(melee.attacks).toMatchObject({ flat: 5, raw: "5" });
    expect(melee.skill).toBe(2);
    expect(melee.strength).toBe(7);
    expect(melee.ap).toBe(-2);
    const ranged = entries!.find((e) => e.type === "ranged")!;
    expect(ranged.keywords).toEqual(["Assault"]);
    expect(ranged.rules).toEqual([{ name: "Assault", text: "Assault rule text." }]);
  });

  it("falls back to the roster unit's own weapon of that name", () => {
    const entries = resolveWeapon("Sentinel Blade", null, guard());
    expect(entries!.map((e) => e.profileId)).toEqual(["r-sb-m", "r-sb-r"]);
  });

  it("is null for a weapon found nowhere", () => {
    expect(resolveWeapon("Plasma sword", options, guard())).toBeNull();
  });
});

describe("applyWeaponOverride", () => {
  const mixed: UnitWeaponOverride = {
    rosterSignature: rosterSignature(guard()),
    groups: [
      { key: "g1", modelCount: 3, weapons: [{ name: "Sentinel blade", perModel: 1 }] },
      { key: "g2", modelCount: 2, weapons: [{ name: "Guardian Spear", perModel: 1 }] },
    ],
  };

  it("rebuilds loadouts, weapons and the model count from the groups", () => {
    const unit = applyWeaponOverride(guard(), mixed, lookup);
    expect(unit.modelCount).toBe(5);
    expect(unit.loadouts.map((l) => [l.key, l.modelCount])).toEqual([["ovr:g1", 3], ["ovr:g2", 2]]);
    const byId = Object.fromEntries(unit.weapons.map((w) => [w.profileId, w.count]));
    expect(byId).toEqual({ "opt:sb-m": 3, "opt:sb-r": 3, "opt:sp-m": 2, "opt:sp-r": 2 });
    expect(getUnitLiveTotal({}, unit.id, unit)).toBe(5);
    expect(unit.weaponsEdited).toBe(true);
    expect(unit.rosterChanged).toBe(false);
    expect(unit.missingWeapons).toEqual([]);
  });

  it("flags weapons that were added or whose total changed, not unchanged ones", () => {
    const unit = applyWeaponOverride(guard(), mixed, lookup);
    const edited = (name: string) => unit.weapons.filter((w) => w.name === name).map((w) => w.edited);
    expect(edited("Guardian Spear")).toEqual([true, true]);
    expect(edited("Sentinel Blade")).toEqual([true, true]);

    const same = applyWeaponOverride(guard(), startOverride(guard(), options), lookup);
    expect(same.weapons.every((w) => w.edited === false)).toBe(true);
  });

  it("sums a weapon carried by two groups", () => {
    const o: UnitWeaponOverride = {
      rosterSignature: rosterSignature(guard()),
      groups: [
        { key: "g1", modelCount: 2, weapons: [{ name: "Misericordia", perModel: 1 }] },
        { key: "g2", modelCount: 3, weapons: [{ name: "Misericordia", perModel: 2 }] },
      ],
    };
    const unit = applyWeaponOverride(guard(), o, lookup);
    expect(unit.weapons.find((w) => w.profileId === "opt:mi")!.count).toBe(8);
  });

  it("flags a roster that changed since the edit", () => {
    const stale = { ...mixed, rosterSignature: "something else" };
    expect(applyWeaponOverride(guard(), stale, lookup).rosterChanged).toBe(true);
  });

  it("lists weapons it cannot resolve and still resolves the rest", () => {
    const o: UnitWeaponOverride = {
      rosterSignature: rosterSignature(guard()),
      groups: [{ key: "g1", modelCount: 5, weapons: [{ name: "Plasma sword", perModel: 1 }, { name: "Misericordia", perModel: 1 }] }],
    };
    const unit = applyWeaponOverride(guard(), o, lookup);
    expect(unit.missingWeapons).toEqual(["Plasma sword"]);
    expect(unit.weapons.map((w) => w.profileId)).toEqual(["opt:mi"]);
  });

  it("works with no catalogue data, using the roster unit's own weapons", () => {
    const o: UnitWeaponOverride = {
      rosterSignature: rosterSignature(guard()),
      groups: [{ key: "g1", modelCount: 4, weapons: [{ name: "Sentinel Blade", perModel: 1 }] }],
    };
    const unit = applyWeaponOverride(guard(), o, noOptions);
    expect(unit.modelCount).toBe(4);
    expect(unit.weapons.map((w) => [w.profileId, w.count])).toEqual([["r-sb-m", 4], ["r-sb-r", 4]]);
  });

  it("handles a group with 0 models and a group with no weapons", () => {
    const o: UnitWeaponOverride = {
      rosterSignature: rosterSignature(guard()),
      groups: [
        { key: "g1", modelCount: 0, weapons: [{ name: "Misericordia", perModel: 1 }] },
        { key: "g2", modelCount: 2, weapons: [] },
      ],
    };
    const unit = applyWeaponOverride(guard(), o, lookup);
    expect(unit.modelCount).toBe(2);
    expect(unit.weapons.map((w) => w.count)).toEqual([0]);
    expect(getUnitLiveTotal({}, unit.id, unit)).toBe(2);
  });
});

describe("applyWeaponOverrides", () => {
  it("passes units without an override through unchanged and ignores overrides for absent units", () => {
    const a = guard();
    const out = applyWeaponOverrides(
      [a],
      { ghost: { groups: [{ key: "g1", modelCount: 1, weapons: [] }], rosterSignature: "" } },
      lookup,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(a);
  });
});

describe("override editing helpers", () => {
  const base = (): UnitWeaponOverride => startOverride(guard(), options);

  it("sets a group's model count, never below 0", () => {
    expect(setGroupModelCount(base(), "g1", 3).groups[0].modelCount).toBe(3);
    expect(setGroupModelCount(base(), "g1", -2).groups[0].modelCount).toBe(0);
  });

  it("sets a weapon's per-model count, never below 1", () => {
    const o = setWeaponPerModel(base(), "g1", "Sentinel blade", 2);
    expect(o.groups[0].weapons[0].perModel).toBe(2);
    expect(setWeaponPerModel(base(), "g1", "Sentinel blade", 0).groups[0].weapons[0].perModel).toBe(1);
  });

  it("swaps a weapon, merging into one the group already has", () => {
    expect(swapWeapon(base(), "g1", "Sentinel blade", "Guardian Spear").groups[0].weapons).toEqual([
      { name: "Guardian Spear", perModel: 1 },
    ]);
    const two = addWeapon(base(), "g1", "Misericordia");
    expect(swapWeapon(two, "g1", "Misericordia", "Sentinel blade").groups[0].weapons).toEqual([
      { name: "Sentinel blade", perModel: 1 },
    ]);
  });

  it("adds a weapon, or one more of a weapon already there", () => {
    const added = addWeapon(base(), "g1", "Misericordia");
    expect(added.groups[0].weapons.map((w) => w.name)).toEqual(["Sentinel blade", "Misericordia"]);
    expect(addWeapon(base(), "g1", "sentinel BLADE").groups[0].weapons[0].perModel).toBe(2);
  });

  it("removes a weapon", () => {
    expect(removeWeapon(base(), "g1", "Sentinel blade").groups[0].weapons).toEqual([]);
  });

  it("adds a group with a fresh key and removes one only when others remain", () => {
    const two = addGroup(base());
    expect(two.groups.map((g) => g.key)).toEqual(["g1", "g2"]);
    expect(two.groups[1]).toEqual({ key: "g2", modelCount: 1, weapons: [] });
    expect(addGroup(removeGroup(two, "g1")).groups.map((g) => g.key)).toEqual(["g2", "g3"]);
    expect(removeGroup(base(), "g1").groups).toHaveLength(1);
  });

  it("never mutates its input", () => {
    const o = base();
    const copy = JSON.parse(JSON.stringify(o));
    setGroupModelCount(o, "g1", 9);
    addWeapon(o, "g1", "Misericordia");
    addGroup(o);
    expect(o).toEqual(copy);
  });
});
