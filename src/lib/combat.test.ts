import { describe, expect, it } from "vitest";
import type { ParsedUnit, WeaponEntry } from "../../parseRoster.mjs";
import {
  bigGunsApplies,
  computeAttackTable,
  emptyModifiers,
  canBeEngaged,
  isMonsterOrVehicle,
  type DirectionModifiers,
} from "./combat";

function makeWeapon(overrides: Partial<WeaponEntry> = {}): WeaponEntry {
  return {
    profileId: "w1",
    name: "Test weapon",
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
    keywords: [],
    rules: [],
    ...overrides,
  };
}

function makeUnit(overrides: Partial<ParsedUnit> = {}): ParsedUnit {
  return {
    id: "target",
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

function makeAttacker(weaponOverrides: Partial<WeaponEntry> = {}): ParsedUnit {
  const weapon = makeWeapon(weaponOverrides);
  return makeUnit({
    id: "attacker",
    weapons: [weapon],
    loadouts: [
      {
        key: "self",
        modelCount: 1,
        weapons: [
          { profileId: weapon.profileId, name: weapon.name, perModel: weapon.count },
        ],
        wargear: [],
      },
    ],
  });
}

describe("computeAttackTable — wound target", () => {
  it("S >= 2T wounds on 2+", () => {
    const [row] = computeAttackTable(makeAttacker({ strength: 8 }), {}, makeUnit());
    expect(row.woundTarget).toBe(2);
  });

  it("S > T wounds on 3+", () => {
    const [row] = computeAttackTable(makeAttacker({ strength: 5 }), {}, makeUnit());
    expect(row.woundTarget).toBe(3);
  });

  it("S == T wounds on 4+", () => {
    const [row] = computeAttackTable(makeAttacker({ strength: 4 }), {}, makeUnit());
    expect(row.woundTarget).toBe(4);
  });

  it("2S <= T wounds on 6+", () => {
    const target = makeUnit({ profile: { M: '6"', T: 8, SV: 3, W: 2, LD: "6+", OC: 1 } });
    const [row] = computeAttackTable(makeAttacker({ strength: 3 }), {}, target);
    expect(row.woundTarget).toBe(6);
  });

  it("otherwise (S < T, 2S > T) wounds on 5+", () => {
    const [row] = computeAttackTable(makeAttacker({ strength: 3 }), {}, makeUnit());
    expect(row.woundTarget).toBe(5);
  });
});

describe("computeAttackTable — save target", () => {
  it("plain armor save with no AP", () => {
    const [row] = computeAttackTable(makeAttacker({ ap: 0 }), {}, makeUnit());
    expect(row.saveTarget).toBe(3);
    expect(row.isInvulnFallback).toBe(false);
  });

  it("AP worsens the armor save", () => {
    const [row] = computeAttackTable(makeAttacker({ ap: -2 }), {}, makeUnit());
    expect(row.saveTarget).toBe(5);
    expect(row.isInvulnFallback).toBe(false);
  });

  it("falls back to invuln when it's better than the modified armor save", () => {
    const target = makeUnit({ invuln: { value: 4, conditional: false } });
    const [row] = computeAttackTable(makeAttacker({ ap: -2 }), {}, target);
    expect(row.saveTarget).toBe(4);
    expect(row.isInvulnFallback).toBe(true);
  });

  it("does not fall back when invuln is worse than the armor save", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: false } });
    const [row] = computeAttackTable(makeAttacker({ ap: 0 }), {}, target);
    expect(row.saveTarget).toBe(3);
    expect(row.isInvulnFallback).toBe(false);
  });

  it("is impossible when AP exceeds 6+ and there's no invuln", () => {
    const [row] = computeAttackTable(makeAttacker({ ap: -5 }), {}, makeUnit());
    expect(row.saveTarget).toBe(null);
  });

  it("uses the invuln when armor is impossible", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: false } });
    const [row] = computeAttackTable(makeAttacker({ ap: -5 }), {}, target);
    expect(row.saveTarget).toBe(5);
    expect(row.isInvulnFallback).toBe(true);
  });
});

describe("computeAttackTable — Anti-X", () => {
  it("overrides a worse wound target when the target has the keyword", () => {
    const attacker = makeAttacker({ strength: 3, keywords: ["Anti-Infantry 2+"] });
    const target = makeUnit({ keywords: ["Infantry"] });
    const [row] = computeAttackTable(attacker, {}, target);
    expect(row.woundTarget).toBe(2);
    expect(row.antiX).toEqual({ keyword: "Infantry", threshold: 2 });
  });

  it("does not override an already-better wound target", () => {
    const attacker = makeAttacker({ strength: 8, keywords: ["Anti-Infantry 4+"] });
    const target = makeUnit({ keywords: ["Infantry"] });
    const [row] = computeAttackTable(attacker, {}, target);
    expect(row.woundTarget).toBe(2);
  });

  it("matches the keyword case-insensitively (rosters export Anti-INFANTRY vs Infantry)", () => {
    const attacker = makeAttacker({ strength: 4, keywords: ["Anti-INFANTRY 4+", "Devastating Wounds"] });
    const target = makeUnit({ keywords: ["Infantry"] });
    const [row] = computeAttackTable(attacker, {}, target);
    // base wound 4+ (S4 vs T4) already equals the threshold; the point is antiX is reported
    expect(row.antiX).toEqual({ keyword: "INFANTRY", threshold: 4 });
    const weak = makeAttacker({ strength: 3, keywords: ["Anti-INFANTRY 4+"] });
    expect(computeAttackTable(weak, {}, target)[0].woundTarget).toBe(4);
  });

  it("does not apply when the target lacks the keyword", () => {
    const attacker = makeAttacker({ strength: 3, keywords: ["Anti-Infantry 2+"] });
    const target = makeUnit({ keywords: ["Vehicle"] });
    const [row] = computeAttackTable(attacker, {}, target);
    expect(row.woundTarget).toBe(5);
    expect(row.antiX).toBe(null);
  });
});

describe("computeAttackTable — auto-hit weapons", () => {
  it("Torrent (skill: null) reports hitTarget null; wound/save still computed", () => {
    const attacker = makeAttacker({ skill: null, skillRaw: "N/A" });
    const [row] = computeAttackTable(attacker, {}, makeUnit());
    expect(row.hitTarget).toBe(null);
    expect(row.woundTarget).toBe(4);
    expect(row.saveTarget).toBe(3);
  });
});

function modifiers(overrides: Partial<DirectionModifiers> = {}): DirectionModifiers {
  return { ...emptyModifiers(), ...overrides };
}

describe("computeAttackTable — hit/wound modifiers", () => {
  it("a +1 hit modifier lowers the target by 1", () => {
    const [row] = computeAttackTable(
      makeAttacker(), // skill: 3 by default
      {},
      makeUnit(),
      modifiers({ hitMod: 1 }),
    );
    expect(row.hitTarget).toBe(2);
    expect(row.appliedHitMod).toBe(1);
  });

  it("a -1 hit modifier raises the target by 1", () => {
    const [row] = computeAttackTable(
      makeAttacker(),
      {},
      makeUnit(),
      modifiers({ hitMod: -1 }),
    );
    expect(row.hitTarget).toBe(4);
  });

  it("hit target clamps at 2 and 6", () => {
    const better = computeAttackTable(
      makeAttacker({ skillRaw: "2+", skill: 2 }),
      {},
      makeUnit(),
      modifiers({ hitMod: 1 }),
    );
    expect(better[0].hitTarget).toBe(2);

    const worse = computeAttackTable(
      makeAttacker({ skillRaw: "6+", skill: 6 }),
      {},
      makeUnit(),
      modifiers({ hitMod: -1 }),
    );
    expect(worse[0].hitTarget).toBe(6);
  });

  it("auto-hit weapons (skill: null) are unaffected by hitMod", () => {
    const attacker = makeAttacker({ skill: null, skillRaw: "N/A" });
    const [row] = computeAttackTable(attacker, {}, makeUnit(), modifiers({ hitMod: 1 }));
    expect(row.hitTarget).toBe(null);
    expect(row.appliedHitMod).toBe(0);
  });

  it("wound modifier composes with Anti-X", () => {
    const attacker = makeAttacker({ strength: 3, keywords: ["Anti-Infantry 3+"] });
    const target = makeUnit({ keywords: ["Infantry"] });
    const [row] = computeAttackTable(attacker, {}, target, modifiers({ woundMod: 1 }));
    // base wound 5+ (S3 vs T4), Anti-Infantry 3+ -> min(5,3)=3, then -1 for the +1 modifier -> 2
    expect(row.woundTarget).toBe(2);
    expect(row.appliedWoundMod).toBe(1);
  });

  it("wound target clamps at 6", () => {
    const target = makeUnit({ profile: { M: '6"', T: 8, SV: 3, W: 2, LD: "6+", OC: 1 } });
    const [row] = computeAttackTable(
      makeAttacker({ strength: 3 }),
      {},
      target,
      modifiers({ woundMod: -1 }),
    );
    expect(row.woundTarget).toBe(6);
  });
});

describe("computeAttackTable — AP worsened by 1", () => {
  it("worsens AP-2 to effectively AP-1", () => {
    const [row] = computeAttackTable(
      makeAttacker({ ap: -2 }),
      {},
      makeUnit(),
      modifiers({ apWorsened: true }),
    );
    expect(row.ap).toBe(-1);
    expect(row.saveTarget).toBe(4); // SV3 - AP-1 = 4+
    expect(row.apWorsened).toBe(true);
  });

  it("never turns AP0 into a bonus", () => {
    const [row] = computeAttackTable(
      makeAttacker({ ap: 0 }),
      {},
      makeUnit(),
      modifiers({ apWorsened: true }),
    );
    expect(row.ap).toBe(0);
    expect(row.saveTarget).toBe(3);
  });

  it("combines with invuln fallback using the effective AP", () => {
    const target = makeUnit({ invuln: { value: 4, conditional: false } });
    const [row] = computeAttackTable(
      makeAttacker({ ap: -3 }),
      {},
      target,
      modifiers({ apWorsened: true }),
    );
    // effective AP -2, armor = 3 - (-2) = 5, invuln 4 is better -> fallback
    expect(row.ap).toBe(-2);
    expect(row.saveTarget).toBe(4);
    expect(row.isInvulnFallback).toBe(true);
  });
});

describe("computeAttackTable — invuln override", () => {
  it("substitutes the target's parsed invuln entirely", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: false } });
    const [row] = computeAttackTable(
      makeAttacker({ ap: -2 }),
      {},
      target,
      modifiers({ invulnOverride: 3 }),
    );
    // armor = 3 - (-2) = 5, override 3 is better -> fallback to 3, flagged
    expect(row.saveTarget).toBe(3);
    expect(row.isInvulnFallback).toBe(true);
  });

  it("applies even when the target has no invuln at all", () => {
    const [row] = computeAttackTable(
      makeAttacker({ ap: -2 }),
      {},
      makeUnit({ invuln: null }),
      modifiers({ invulnOverride: 4 }),
    );
    // armor = 3 - (-2) = 5, override 4 is better -> fallback to 4
    expect(row.saveTarget).toBe(4);
    expect(row.isInvulnFallback).toBe(true);
  });

  it("does not flag a fallback when the override is worse than armor", () => {
    const [row] = computeAttackTable(
      makeAttacker({ ap: 0 }),
      {},
      makeUnit(),
      modifiers({ invulnOverride: 5 }),
    );
    // armor = 3 - 0 = 3, override 5 is worse -> stays on armor
    expect(row.saveTarget).toBe(3);
    expect(row.isInvulnFallback).toBe(false);
  });
});

describe("computeAttackTable — conditional invuln (e.g. ranged-attacks-only)", () => {
  it("does not auto-apply a conditional invuln, even when it would be better than armor", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: true } });
    const [row] = computeAttackTable(makeAttacker({ ap: -3 }), {}, target, emptyModifiers());
    // armor = 3 - (-3) = 6, conditional invuln (5+) would be better but is skipped
    expect(row.saveTarget).toBe(6);
    expect(row.isInvulnFallback).toBe(false);
    expect(row.conditionalInvulnAvailable).toBe(5);
  });

  it("reports no conditional invuln available when the target's invuln isn't conditional", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: false } });
    const [row] = computeAttackTable(makeAttacker({ ap: -3 }), {}, target, emptyModifiers());
    expect(row.saveTarget).toBe(5);
    expect(row.isInvulnFallback).toBe(true);
    expect(row.conditionalInvulnAvailable).toBe(null);
  });

  it("lets the manual Invuln override apply a conditional invuln anyway", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: true } });
    const [row] = computeAttackTable(
      makeAttacker({ ap: -3 }),
      {},
      target,
      modifiers({ invulnOverride: 5 }),
    );
    expect(row.saveTarget).toBe(5);
    expect(row.isInvulnFallback).toBe(true);
    // the user has explicitly confirmed applicability via the override, so
    // there's nothing left unapplied to flag
    expect(row.conditionalInvulnAvailable).toBe(null);
  });

  it("reports no conditional invuln available when the target has no invuln at all", () => {
    const [row] = computeAttackTable(
      makeAttacker(),
      {},
      makeUnit({ invuln: null }),
      emptyModifiers(),
    );
    expect(row.conditionalInvulnAvailable).toBe(null);
  });
});

describe("computeAttackTable — Half range (Melta)", () => {
  it("adds the Melta value to damage when the halfRange modifier is on", () => {
    const attacker = makeAttacker({
      keywords: ["Melta 2"],
      damage: { dice: 1, sides: 6, flat: 0, raw: "D6", avg: 3.5 },
    });
    const [row] = computeAttackTable(
      attacker,
      {},
      makeUnit(),
      modifiers({ halfRange: true }),
    );
    expect(row.halfRangeBonus).toEqual({ kind: "melta", value: 2 });
    expect(row.halfRangeApplied).toBe(true);
    expect(row.damage.flat).toBe(2);
    expect(row.damage.avg).toBe(5.5);
    expect(row.damage.raw).toBe("D6+2");
    // Melta never touches attacks
    expect(row.totalAttacks).toBe(2);
  });

  it("appends the bonus to a flat raw damage value too", () => {
    const attacker = makeAttacker({
      keywords: ["Melta 2"],
      damage: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 },
    });
    const [row] = computeAttackTable(
      attacker,
      {},
      makeUnit(),
      modifiers({ halfRange: true }),
    );
    expect(row.damage.raw).toBe("3");
  });

  it("leaves damage unchanged when Melta is available but halfRange is off", () => {
    const attacker = makeAttacker({ keywords: ["Melta 2"] });
    const [row] = computeAttackTable(attacker, {}, makeUnit(), emptyModifiers());
    expect(row.halfRangeBonus).toEqual({ kind: "melta", value: 2 });
    expect(row.halfRangeApplied).toBe(false);
    expect(row.damage.flat).toBe(1); // makeWeapon's default damage.flat
    expect(row.damage.raw).toBe("1");
  });

  it("reports no half-range bonus for a weapon without the keyword, even with halfRange on", () => {
    const attacker = makeAttacker();
    const [row] = computeAttackTable(
      attacker,
      {},
      makeUnit(),
      modifiers({ halfRange: true }),
    );
    expect(row.halfRangeBonus).toBe(null);
    expect(row.halfRangeApplied).toBe(false);
  });
});

describe("computeAttackTable — Half range (Rapid Fire)", () => {
  it("adds the Rapid Fire value to attacks when the halfRange modifier is on, leaves damage alone", () => {
    const attacker = makeAttacker({
      keywords: ["Rapid Fire 2"],
      attacks: { dice: 0, sides: 0, flat: 2, raw: "2", avg: 2 },
    });
    const [row] = computeAttackTable(
      attacker,
      {},
      makeUnit(),
      modifiers({ halfRange: true }),
    );
    expect(row.halfRangeBonus).toEqual({ kind: "rapidFire", value: 2 });
    expect(row.halfRangeApplied).toBe(true);
    expect(row.attacksRaw).toBe("4");
    expect(row.totalAttacks).toBe(4); // count 1 * (2+2)
    expect(row.damage.raw).toBe("1"); // makeWeapon's default damage, untouched
  });

  it("appends the bonus to dice-based raw attacks too", () => {
    const attacker = makeAttacker({
      keywords: ["Rapid Fire 1"],
      attacks: { dice: 1, sides: 6, flat: 0, raw: "D6", avg: 3.5 },
    });
    const [row] = computeAttackTable(
      attacker,
      {},
      makeUnit(),
      modifiers({ halfRange: true }),
    );
    expect(row.attacksRaw).toBe("D6+1");
    expect(row.totalAttacks).toBe(4.5);
  });

  it("leaves attacks unchanged when Rapid Fire is available but halfRange is off", () => {
    const attacker = makeAttacker({ keywords: ["Rapid Fire 2"] });
    const [row] = computeAttackTable(attacker, {}, makeUnit(), emptyModifiers());
    expect(row.halfRangeBonus).toEqual({ kind: "rapidFire", value: 2 });
    expect(row.halfRangeApplied).toBe(false);
    expect(row.attacksRaw).toBe("2"); // makeWeapon's default attacks.raw
    expect(row.totalAttacks).toBe(2);
  });

  it("applies to every weapon with a half-range keyword simultaneously, not per-weapon", () => {
    // Two weapons on the same unit: one Melta, one Rapid Fire. A single
    // halfRange:true modifier must boost both at once (it's a per-direction
    // flag now, not a per-weapon toggle).
    const meltaWeapon = makeWeapon({
      profileId: "melta",
      keywords: ["Melta 2"],
      damage: { dice: 1, sides: 6, flat: 0, raw: "D6", avg: 3.5 },
    });
    const rapidFireWeapon = makeWeapon({
      profileId: "bolter",
      keywords: ["Rapid Fire 1"],
      attacks: { dice: 0, sides: 0, flat: 2, raw: "2", avg: 2 },
    });
    const attacker = makeUnit({
      id: "attacker",
      weapons: [meltaWeapon, rapidFireWeapon],
      loadouts: [
        {
          key: "self",
          modelCount: 1,
          weapons: [
            { profileId: "melta", name: meltaWeapon.name, perModel: 1 },
            { profileId: "bolter", name: rapidFireWeapon.name, perModel: 1 },
          ],
          wargear: [],
        },
      ],
    });

    const rows = computeAttackTable(
      attacker,
      {},
      makeUnit(),
      modifiers({ halfRange: true }),
    );

    const meltaRow = rows.find((r) => r.profileId === "melta")!;
    const bolterRow = rows.find((r) => r.profileId === "bolter")!;
    expect(meltaRow.damage.raw).toBe("D6+2");
    expect(bolterRow.attacksRaw).toBe("3");
  });
});

describe("computeAttackTable — attacksRaw preserves dice notation", () => {
  it("exposes the raw dice expression for a random-attacks weapon (e.g. Incinerator)", () => {
    const attacker = makeAttacker({
      attacks: { dice: 1, sides: 6, flat: 0, raw: "D6", avg: 3.5 },
    });
    const [row] = computeAttackTable(attacker, {}, makeUnit());
    expect(row.attacksRaw).toBe("D6");
    expect(row.totalAttacks).toBe(3.5);
  });
});

describe("computeAttackTable — live counts", () => {
  it("reflects a casualty-reduced loadout, not the full roster count", () => {
    const weapon = makeWeapon({ profileId: "bolter", count: 1 });
    const attacker = makeUnit({
      id: "squad",
      weapons: [weapon],
      loadouts: [
        {
          key: "bolter-loadout",
          modelCount: 5,
          weapons: [{ profileId: "bolter", name: weapon.name, perModel: 1 }],
          wargear: [],
        },
      ],
    });
    const target = makeUnit();

    const fullStrength = computeAttackTable(attacker, {}, target);
    expect(fullStrength[0].count).toBe(5);
    expect(fullStrength[0].totalAttacks).toBe(10);

    const counts = { "squad:bolter-loadout": 3 };
    const afterCasualties = computeAttackTable(attacker, counts, target);
    expect(afterCasualties[0].count).toBe(3);
    expect(afterCasualties[0].totalAttacks).toBe(6);
  });
});

function makeTargetWithModels(models: number, overrides: Partial<ParsedUnit> = {}): ParsedUnit {
  return makeUnit({
    id: "target",
    modelCount: models,
    loadouts: [{ key: "all", modelCount: models, weapons: [], wargear: [] }],
    ...overrides,
  });
}

describe("computeAttackTable — Blast", () => {
  it("adds 1 attack per full 5 models in the target unit", () => {
    const [row] = computeAttackTable(
      makeAttacker({ keywords: ["Blast"], attacks: { dice: 1, sides: 6, flat: 0, raw: "D6", avg: 3.5 } }),
      {},
      makeTargetWithModels(12),
    );
    expect(row.blastBonus).toBe(2);
    expect(row.attacksRaw).toBe("D6+2");
    expect(row.totalAttacks).toBe(5.5);
  });

  it("folds the bonus into an existing flat part (D6+3 becomes D6+5, not D6+3+2)", () => {
    const [row] = computeAttackTable(
      makeAttacker({ keywords: ["Blast"], attacks: { dice: 1, sides: 6, flat: 3, raw: "D6+3", avg: 6.5 } }),
      {},
      makeTargetWithModels(10),
    );
    expect(row.attacksRaw).toBe("D6+5");
    expect(row.totalAttacks).toBe(8.5);
  });

  it("uses the target's live count, after casualties", () => {
    const target = makeTargetWithModels(10);
    const [row] = computeAttackTable(
      makeAttacker({ keywords: ["Blast"] }),
      { "target:all": 4 },
      target,
    );
    expect(row.blastBonus).toBe(0);
    expect(row.attacksRaw).toBe("2");
  });

  it("does nothing for a weapon without Blast", () => {
    const [row] = computeAttackTable(makeAttacker(), {}, makeTargetWithModels(20));
    expect(row.blastBonus).toBe(0);
    expect(row.attacksRaw).toBe("2");
  });

  it("stacks with Rapid Fire at half range", () => {
    const [row] = computeAttackTable(
      makeAttacker({ keywords: ["Blast", "Rapid Fire 1"] }),
      {},
      makeTargetWithModels(5),
      modifiers({ halfRange: true }),
    );
    expect(row.attacksRaw).toBe("4");
  });
});

describe("computeAttackTable — Heavy", () => {
  it("gives Heavy weapons +1 to hit when the attacker was stationary", () => {
    const [row] = computeAttackTable(
      makeAttacker({ keywords: ["Heavy"] }),
      {},
      makeUnit(),
      modifiers({ stationary: true }),
    );
    expect(row.hitTarget).toBe(2);
    expect(row.appliedHitMod).toBe(1);
    expect(row.heavyApplied).toBe(true);
  });

  it("does not affect Heavy weapons when the attacker moved", () => {
    const [row] = computeAttackTable(makeAttacker({ keywords: ["Heavy"] }), {}, makeUnit());
    expect(row.hitTarget).toBe(3);
    expect(row.heavyApplied).toBe(false);
  });

  it("does not affect non-Heavy weapons when stationary", () => {
    const [row] = computeAttackTable(
      makeAttacker(),
      {},
      makeUnit(),
      modifiers({ stationary: true }),
    );
    expect(row.hitTarget).toBe(3);
    expect(row.appliedHitMod).toBe(0);
  });
});

describe("computeAttackTable — net hit modifier cap", () => {
  it("caps Heavy plus a manual +1 at a net +1", () => {
    const [row] = computeAttackTable(
      makeAttacker({ keywords: ["Heavy"], skill: 4, skillRaw: "4+" }),
      {},
      makeUnit(),
      modifiers({ stationary: true, hitMod: 1 }),
    );
    expect(row.appliedHitMod).toBe(1);
    expect(row.hitTarget).toBe(3);
  });

  it("caps a manual -1 plus a leader penalty at a net -1", () => {
    const [row] = computeAttackTable(
      makeAttacker(),
      {},
      makeUnit(),
      modifiers({ hitMod: -1 }),
      -1,
    );
    expect(row.appliedHitMod).toBe(-1);
    expect(row.hitTarget).toBe(4);
  });

  it("lets a +1 and a -1 cancel out", () => {
    const [row] = computeAttackTable(
      makeAttacker({ keywords: ["Heavy"] }),
      {},
      makeUnit(),
      modifiers({ stationary: true }),
      -1,
    );
    expect(row.appliedHitMod).toBe(0);
    expect(row.hitTarget).toBe(3);
  });
});

describe("computeAttackTable — reminder keywords", () => {
  it("flags Twin-linked and Hazardous, case-insensitively", () => {
    const [row] = computeAttackTable(
      makeAttacker({ keywords: ["Twin-Linked", "hazardous"] }),
      {},
      makeUnit(),
    );
    expect(row.twinLinked).toBe(true);
    expect(row.hazardous).toBe(true);
  });

  it("leaves them off for other weapons", () => {
    const [row] = computeAttackTable(makeAttacker(), {}, makeUnit());
    expect(row.twinLinked).toBe(false);
    expect(row.hazardous).toBe(false);
  });
});

describe("computeAttackTable — edited weapons", () => {
  it("carries the weapon's edited flag onto its row", () => {
    const [edited] = computeAttackTable(makeAttacker({ edited: true }), {}, makeUnit());
    expect(edited.edited).toBe(true);
    const [plain] = computeAttackTable(makeAttacker(), {}, makeUnit());
    expect(plain.edited).toBe(false);
  });
});

describe("Big Guns Never Tire", () => {
  const vehicle = makeUnit({ id: "v", keywords: ["Vehicle", "Transport"] });
  const monster = makeUnit({ id: "m", keywords: ["Monster"] });
  const infantry = makeUnit({ id: "i", keywords: ["Infantry"] });

  it("recognises Monsters and Vehicles, whatever the keyword casing", () => {
    expect(isMonsterOrVehicle(vehicle)).toBe(true);
    expect(isMonsterOrVehicle(monster)).toBe(true);
    expect(isMonsterOrVehicle(makeUnit({ keywords: ["MONSTER"] }))).toBe(true);
    expect(isMonsterOrVehicle(infantry)).toBe(false);
  });

  it("applies, in both directions, when the matchup is engaged and a Monster or Vehicle is in it", () => {
    expect(bigGunsApplies(true, vehicle, infantry)).toBe(true);
    // Shooting at an engaged Vehicle is penalised too.
    expect(bigGunsApplies(true, infantry, vehicle)).toBe(true);
    expect(bigGunsApplies(true, vehicle, monster)).toBe(true);
  });

  it("does not apply when not marked engaged, or when neither unit is a Monster or Vehicle", () => {
    expect(bigGunsApplies(false, vehicle, monster)).toBe(false);
    expect(bigGunsApplies(true, infantry, infantry)).toBe(false);
  });

  it("takes 1 off the Hit roll of ranged weapons and says so", () => {
    const [row] = computeAttackTable(makeAttacker(), {}, makeUnit(), modifiers(), 0, [], true);
    expect(row.hitTarget).toBe(4);
    expect(row.appliedHitMod).toBe(-1);
    expect(row.engagedApplied).toBe(true);
  });

  it("leaves Pistols, melee weapons and auto-hit weapons alone", () => {
    const pistol = computeAttackTable(
      makeAttacker({ keywords: ["Pistol"] }),
      {},
      makeUnit(),
      modifiers(),
      0,
      [],
      true,
    )[0];
    expect(pistol.hitTarget).toBe(3);
    expect(pistol.engagedApplied).toBe(false);

    const melee = computeAttackTable(
      makeAttacker({ type: "melee" }),
      {},
      makeUnit(),
      modifiers(),
      0,
      [],
      true,
    )[0];
    expect(melee.hitTarget).toBe(3);
    expect(melee.engagedApplied).toBe(false);

    const torrent = computeAttackTable(
      makeAttacker({ skill: null, skillRaw: "N/A" }),
      {},
      makeUnit(),
      modifiers(),
      0,
      [],
      true,
    )[0];
    expect(torrent.hitTarget).toBeNull();
    expect(torrent.engagedApplied).toBe(false);
  });

  it("stays inside the -1 cap with other penalties, and Heavy cancels it", () => {
    const capped = computeAttackTable(
      makeAttacker(),
      {},
      makeUnit(),
      modifiers({ hitMod: -1 }),
      0,
      [],
      true,
    )[0];
    expect(capped.appliedHitMod).toBe(-1);

    const heavy = computeAttackTable(
      makeAttacker({ keywords: ["Heavy"] }),
      {},
      makeUnit(),
      modifiers({ stationary: true }),
      0,
      [],
      true,
    )[0];
    expect(heavy.appliedHitMod).toBe(0);
    expect(heavy.hitTarget).toBe(3);
  });

  it("changes nothing when the penalty is not asked for", () => {
    const [row] = computeAttackTable(makeAttacker(), {}, makeUnit(), modifiers());
    expect(row.hitTarget).toBe(3);
    expect(row.engagedApplied).toBe(false);
  });
});

describe("canBeEngaged", () => {
  const vehicle = makeUnit({ keywords: ["Vehicle"] });
  const infantry = makeUnit({ keywords: ["Infantry"] });

  it("is true when either unit is a Monster or Vehicle", () => {
    expect(canBeEngaged(vehicle, infantry)).toBe(true);
    expect(canBeEngaged(infantry, vehicle)).toBe(true);
    expect(canBeEngaged(vehicle, vehicle)).toBe(true);
    expect(canBeEngaged(infantry, infantry)).toBe(false);
  });
});
