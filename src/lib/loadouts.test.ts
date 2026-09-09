import { describe, expect, it } from "vitest";
import type { WeaponEntry, WeaponLoadout } from "../../parseRoster.mjs";
import {
  getLiveWeaponCount,
  getLoadoutLiveCount,
  getLoadoutWeapons,
  getUnitLiveTotal,
  labelLoadout,
  loadoutCountKey,
} from "./loadouts";

// Mirrors the real Purifier Squad shape: a weapon (Purifying Flame) shared by
// every loadout, plus one distinguishing ranged weapon per loadout.
const bolter: WeaponLoadout = {
  key: "flame|bolter",
  modelCount: 6,
  weapons: [
    { profileId: "flame", name: "Purifying Flame", perModel: 1 },
    { profileId: "bolter", name: "Storm bolter", perModel: 1 },
  ],
  wargear: [],
};
const incinerator: WeaponLoadout = {
  key: "flame|incin",
  modelCount: 2,
  weapons: [
    { profileId: "flame", name: "Purifying Flame", perModel: 1 },
    { profileId: "incin", name: "Incinerator", perModel: 1 },
  ],
  wargear: [],
};
const psycannon: WeaponLoadout = {
  key: "flame|psy",
  modelCount: 2,
  weapons: [
    { profileId: "flame", name: "Purifying Flame", perModel: 1 },
    { profileId: "psy", name: "Psycannon", perModel: 1 },
  ],
  wargear: [],
};
const loadouts = [bolter, incinerator, psycannon];
const unit = { id: "purifiers", loadouts } as { id: string; loadouts: WeaponLoadout[] };

describe("loadoutCountKey", () => {
  it("joins unit id and loadout key", () => {
    expect(loadoutCountKey("purifiers", "flame|bolter")).toBe(
      "purifiers:flame|bolter",
    );
  });
});

describe("getLoadoutLiveCount", () => {
  it("defaults to the loadout's full model count when untouched", () => {
    expect(getLoadoutLiveCount({}, "purifiers", bolter)).toBe(6);
  });

  it("returns the stored live count when present", () => {
    const counts = { "purifiers:flame|bolter": 4 };
    expect(getLoadoutLiveCount(counts, "purifiers", bolter)).toBe(4);
  });
});

describe("getUnitLiveTotal", () => {
  it("sums every loadout's live count", () => {
    expect(getUnitLiveTotal({}, "purifiers", unit as never)).toBe(10);
  });

  it("reflects a partial casualty on one loadout only", () => {
    const counts = { "purifiers:flame|incin": 0 };
    expect(getUnitLiveTotal(counts, "purifiers", unit as never)).toBe(8);
  });
});

describe("getLiveWeaponCount", () => {
  it("sums a weapon shared by every loadout across all of them", () => {
    expect(getLiveWeaponCount({}, "purifiers", unit as never, "flame")).toBe(10);
  });

  it("tracks a weapon unique to one loadout only", () => {
    expect(getLiveWeaponCount({}, "purifiers", unit as never, "bolter")).toBe(6);
  });

  it("reduces correctly when a loadout takes casualties", () => {
    const counts = { "purifiers:flame|bolter": 4 };
    expect(getLiveWeaponCount(counts, "purifiers", unit as never, "bolter")).toBe(4);
    expect(getLiveWeaponCount(counts, "purifiers", unit as never, "flame")).toBe(8);
  });
});

function makeWeaponEntry(overrides: Partial<WeaponEntry>): WeaponEntry {
  return {
    profileId: "w",
    name: "Weapon",
    subProfile: false,
    type: "ranged",
    count: 1,
    range: '24"',
    attacks: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 },
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

describe("getLoadoutWeapons", () => {
  const unitWithWeapons = {
    id: "purifiers",
    loadouts,
    weapons: [
      makeWeaponEntry({ profileId: "flame", name: "Purifying Flame" }),
      makeWeaponEntry({ profileId: "bolter", name: "Storm bolter" }),
      makeWeaponEntry({ profileId: "incin", name: "Incinerator" }),
      makeWeaponEntry({ profileId: "psy", name: "Psycannon" }),
    ],
  };

  it("resolves this loadout's own weapons with full stats, counted against its own live count", () => {
    const weapons = getLoadoutWeapons(unitWithWeapons as never, bolter, 4);
    expect(weapons.map((w) => w.name).sort()).toEqual([
      "Purifying Flame",
      "Storm bolter",
    ]);
    const flame = weapons.find((w) => w.profileId === "flame")!;
    expect(flame.count).toBe(4); // perModel 1 * liveCount 4
    expect(flame.range).toBe('24"'); // full stats resolved, not just name/id
  });

  it("does not include weapons from a different loadout", () => {
    const weapons = getLoadoutWeapons(unitWithWeapons as never, incinerator, 2);
    expect(weapons.map((w) => w.name).sort()).toEqual([
      "Incinerator",
      "Purifying Flame",
    ]);
  });
});

describe("labelLoadout", () => {
  it("returns a plain label for a unit with only one loadout", () => {
    expect(labelLoadout(bolter, [bolter])).toBe("Models");
  });

  it("excludes weapon names common to every loadout", () => {
    expect(labelLoadout(bolter, loadouts)).toBe("Storm bolter");
    expect(labelLoadout(incinerator, loadouts)).toBe("Incinerator");
    expect(labelLoadout(psycannon, loadouts)).toBe("Psycannon");
  });

  it("falls back to the full weapon list when nothing distinguishes it", () => {
    const subset: WeaponLoadout = {
      key: "flame",
      modelCount: 1,
      weapons: [{ profileId: "flame", name: "Purifying Flame", perModel: 1 }],
      wargear: [],
    };
    expect(labelLoadout(subset, [subset, bolter])).toBe("Purifying Flame");
  });

  // Mirrors the real Terminator Squad: a Narthecium-carrying model shares its
  // only weapon (Nemesis force weapon) with the rest of the squad — the thing
  // that actually distinguishes it is non-weapon wargear.
  const termBolter: WeaponLoadout = {
    key: "force|bolter",
    modelCount: 4,
    weapons: [
      { profileId: "force", name: "Nemesis force weapon", perModel: 1 },
      { profileId: "bolter", name: "Storm bolter", perModel: 1 },
    ],
    wargear: [],
  };
  const termNarthecium: WeaponLoadout = {
    key: "force|narthecium",
    modelCount: 1,
    weapons: [{ profileId: "force", name: "Nemesis force weapon", perModel: 1 }],
    wargear: ["Apothecary's narthecium"],
  };

  it("labels a loadout by its distinguishing wargear when weapons alone don't distinguish it", () => {
    expect(labelLoadout(termNarthecium, [termBolter, termNarthecium])).toBe(
      "Apothecary's narthecium",
    );
  });

  it("does not let a wargear-only distinction hide a weapon that does distinguish the other loadout", () => {
    expect(labelLoadout(termBolter, [termBolter, termNarthecium])).toBe(
      "Storm bolter",
    );
  });

  it("combines weapon and wargear names when both distinguish a loadout", () => {
    const banner: WeaponLoadout = {
      key: "force|incin|banner",
      modelCount: 1,
      weapons: [
        { profileId: "force", name: "Nemesis force weapon", perModel: 1 },
        { profileId: "incin", name: "Incinerator", perModel: 1 },
      ],
      wargear: ["Ancient's Banner"],
    };
    expect(labelLoadout(banner, [termBolter, termNarthecium, banner])).toBe(
      "Incinerator + Ancient's Banner",
    );
  });
});

// The Forgefiend shape: one model, one loadout, and a weapon profile mounted
// twice within it (two on the arms, one on the head).
const forgefiend = {
  id: "forgefiend",
  loadouts: [
    {
      key: "self",
      modelCount: 1,
      weapons: [
        { profileId: "ecto", name: "Ectoplasma cannon", perModel: 2 },
        { profileId: "limbs", name: "Armoured limbs", perModel: 1 },
        { profileId: "ecto", name: "Ectoplasma cannon", perModel: 1 },
      ],
      wargear: [],
    },
  ],
} as { id: string; loadouts: WeaponLoadout[] };

describe("getLiveWeaponCount with a weapon mounted twice in one loadout", () => {
  it("counts every mount, not just the first", () => {
    expect(getLiveWeaponCount({}, "forgefiend", forgefiend as never, "ecto")).toBe(3);
  });

  it("still counts a weapon mounted once", () => {
    expect(getLiveWeaponCount({}, "forgefiend", forgefiend as never, "limbs")).toBe(1);
  });

  it("scales every mount with the live model count", () => {
    const counts = { "forgefiend:self": 0 };
    expect(getLiveWeaponCount(counts, "forgefiend", forgefiend as never, "ecto")).toBe(0);
  });
});
