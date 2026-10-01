import { describe, expect, it } from "vitest";
import type { AttackRow } from "./combat";
import { rangeLabel, rowTones } from "./attackDisplay";

const base: AttackRow = {
  profileId: "p1",
  name: "Ectoplasma cannon",
  type: "ranged",
  subProfile: false,
  count: 3,
  attacksRaw: "D3",
  totalAttacks: 6,
  hitTarget: 3,
  woundTarget: 3,
  antiX: null,
  armorTarget: 4,
  saveTarget: 4,
  isInvulnFallback: false,
  ap: -3,
  strength: 8,
  damage: { dice: 0, sides: 0, flat: 3, raw: "3", avg: 3 },
  range: '36"',
  keywords: [],
  rules: [],
  leaderMods: [],
  autoHitPenaltySources: [],
  appliedHitMod: 0,
  appliedWoundMod: 0,
  apWorsened: false,
  halfRangeBonus: null,
  halfRangeApplied: false,
  conditionalInvulnAvailable: null,
  blastBonus: 0,
  heavyApplied: false,
  twinLinked: false,
  hazardous: false,
  edited: false,
};

describe("rowTones: hit", () => {
  it("has no tone when nothing modifies the hit roll", () => {
    expect(rowTones(base).hit).toBeNull();
  });

  it("marks an improved hit roll as a boost", () => {
    expect(rowTones({ ...base, appliedHitMod: 1 }).hit).toBe("boost");
  });

  it("marks a worsened hit roll as a warning", () => {
    expect(rowTones({ ...base, appliedHitMod: -1 }).hit).toBe("warn");
  });
});

describe("rowTones: wound", () => {
  it("has no tone when nothing modifies the wound roll", () => {
    expect(rowTones(base).wound).toBeNull();
  });

  it("marks an improved wound roll as a boost", () => {
    expect(rowTones({ ...base, appliedWoundMod: 1 }).wound).toBe("boost");
  });

  it("marks a worsened wound roll as a warning", () => {
    expect(rowTones({ ...base, appliedWoundMod: -1 }).wound).toBe("warn");
  });

  it("marks an Anti-X match as a boost", () => {
    expect(
      rowTones({ ...base, antiX: { keyword: "Infantry", threshold: 2 } }).wound,
    ).toBe("boost");
  });
});

describe("rowTones: save", () => {
  it("has no tone on a plain armour save", () => {
    expect(rowTones(base).save).toBeNull();
  });

  it("warns when the target falls back to an invulnerable save", () => {
    expect(rowTones({ ...base, isInvulnFallback: true }).save).toBe("warn");
  });

  it("warns when AP is worsened, which helps the target", () => {
    expect(rowTones({ ...base, apWorsened: true }).save).toBe("warn");
  });
});

describe("rowTones: attacks and damage", () => {
  it("has no tone when unmodified", () => {
    const tones = rowTones(base);
    expect(tones.attacks).toBeNull();
    expect(tones.damage).toBeNull();
  });

  it("boosts attacks on a leader bonus", () => {
    expect(
      rowTones({ ...base, leaderMods: [{ name: "Crowe", text: null }] }).attacks,
    ).toBe("boost");
  });

  it("boosts attacks on rapid fire at half range", () => {
    expect(
      rowTones({
        ...base,
        halfRangeApplied: true,
        halfRangeBonus: { kind: "rapidFire", value: 2 },
      }).attacks,
    ).toBe("boost");
  });

  it("boosts damage on melta at half range", () => {
    expect(
      rowTones({
        ...base,
        halfRangeApplied: true,
        halfRangeBonus: { kind: "melta", value: 2 },
      }).damage,
    ).toBe("boost");
  });

  it("leaves damage alone when the half range bonus is rapid fire", () => {
    expect(
      rowTones({
        ...base,
        halfRangeApplied: true,
        halfRangeBonus: { kind: "rapidFire", value: 2 },
      }).damage,
    ).toBeNull();
  });
});

describe("rangeLabel", () => {
  it("returns a ranged weapon's range", () => {
    expect(rangeLabel(base)).toBe('36"');
  });

  // Melee rows only ever appear under the melee filter, where every row
  // would repeat the same word.
  it("returns nothing for a melee weapon", () => {
    expect(rangeLabel({ ...base, type: "melee", range: "Melee" })).toBeNull();
  });

  it("returns nothing when a ranged weapon carries no range", () => {
    expect(rangeLabel({ ...base, range: null })).toBeNull();
  });

  it("returns nothing when a ranged weapon is marked melee-range", () => {
    expect(rangeLabel({ ...base, range: "Melee" })).toBeNull();
  });
});

describe("rowTones: Blast and Heavy", () => {
  it("boosts attacks when Blast added some", () => {
    expect(rowTones({ ...base, blastBonus: 2 }).attacks).toBe("boost");
  });

  it("boosts the hit roll when Heavy applied, through appliedHitMod", () => {
    expect(rowTones({ ...base, heavyApplied: true, appliedHitMod: 1 }).hit).toBe("boost");
  });
});
