import { describe, expect, it } from "vitest";
import type { WeaponEntry } from "../../parseRoster.mjs";
import { mergeByProfileId } from "./weapons";

const bolter: WeaponEntry = {
  profileId: "bolter-id",
  name: "Storm bolter",
  subProfile: false,
  type: "ranged",
  count: 1,
  range: '24"',
  attacks: { dice: 0, sides: 0, flat: 2, raw: "2", avg: 2 },
  skill: 3,
  skillRaw: "3+",
  strength: 4,
  ap: 0,
  damage: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 },
  keywords: ["Rapid Fire 2"],
  rules: [{ name: "Rapid Fire", text: null }],
};

describe("mergeByProfileId", () => {
  it("keeps one row per distinct profileId", () => {
    const merged = mergeByProfileId([
      { ...bolter, count: 1 },
      { ...bolter, count: 3 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].profileId).toBe("bolter-id");
  });

  it("preserves distinct profileIds as separate rows", () => {
    const other = { ...bolter, profileId: "other-id", name: "Incinerator" };
    const merged = mergeByProfileId([bolter, other]);
    expect(merged.map((w) => w.profileId).sort()).toEqual([
      "bolter-id",
      "other-id",
    ]);
  });

  it("returns copies, not references into the input", () => {
    const original = { ...bolter };
    const merged = mergeByProfileId([bolter]);
    merged[0].count = 999;
    expect(bolter.count).toBe(original.count);
  });
});

describe("mergeByProfileId with a weapon mounted more than once", () => {
  // The Forgefiend carries two arm-mounted ectoplasma cannons and a third on
  // its head. Both mounts resolve to one weapon profile, so the unit's weapon
  // list holds two entries sharing a profileId; the row has to show all three.
  it("adds the counts of entries sharing a profileId", () => {
    const merged = mergeByProfileId([
      { ...bolter, name: "Ectoplasma cannon", count: 2 },
      { ...bolter, name: "Ectoplasma cannon", count: 1 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].count).toBe(3);
  });

  it("leaves a single entry's count untouched", () => {
    const merged = mergeByProfileId([{ ...bolter, count: 4 }]);
    expect(merged[0].count).toBe(4);
  });
});
