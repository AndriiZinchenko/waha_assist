import type { DiceExpr, ParsedUnit, RuleRef } from "../../parseRoster.mjs";
import { getLiveWeaponCount, getUnitLiveTotal } from "./loadouts";
import { mergeByProfileId } from "./weapons";
import type { Edition } from "./edition";

export interface DirectionModifiers {
  hitMod: -1 | 0 | 1;
  woundMod: -1 | 0 | 1;
  invulnOverride: number | null;
  /** +1 improves every weapon's AP by 1 (e.g. a Crusade weapon upgrade),
   * -1 worsens it (e.g. Armour of Contempt). */
  apMod: -1 | 0 | 1;
  /** Added to every attack's Damage characteristic (never below 1): -1 for a
   * stratagem or ability the calculator does not pick up by itself, +1 for
   * a damage bonus. The target's own "-1 Damage" abilities are applied
   * automatically on top (see damageReductionSources). */
  damageMod: -1 | 0 | 1;
  halfRange: boolean;
  /** The attacking unit did not move this turn: Heavy weapons get +1 to hit. */
  stationary: boolean;
  /** A Monster or Vehicle in this matchup is within Engagement Range of an
   * enemy (Big Guns Never Tire). */
  engaged: boolean;
  /** The Waaagh! is active: changes only units with the Waaagh! ability. */
  waaagh: boolean;
  /** The target of ranged attacks has the Benefit of Cover. 10th: +1 to the
   * armour save; 11th: the attack's BS is worsened by 1. */
  cover: boolean;
  /** The attacking unit made a Charge move this turn: Lance weapons get +1
   * to wound. */
  charged: boolean;
  /** Units (by id) whose model is on its "Damaged: 1-N wounds remaining"
   * profile: -1 to hit for their attacks. */
  damaged: string[];
}

export function emptyModifiers(): DirectionModifiers {
  return {
    hitMod: 0,
    woundMod: 0,
    invulnOverride: null,
    apMod: 0,
    damageMod: 0,
    halfRange: false,
    stationary: false,
    engaged: false,
    waaagh: false,
    cover: false,
    charged: false,
    damaged: [],
  };
}

/** Units the Big Guns Never Tire rule is about. */
export function isMonsterOrVehicle(unit: ParsedUnit): boolean {
  return unit.keywords.some((k) => {
    const keyword = k.toLowerCase();
    return keyword === "monster" || keyword === "vehicle";
  });
}

/** Whether either unit is one, so the matchup can be marked engaged. */
export function canBeEngaged(unitA: ParsedUnit, unitB: ParsedUnit): boolean {
  return isMonsterOrVehicle(unitA) || isMonsterOrVehicle(unitB);
}

/**
 * Big Guns Never Tire: a Monster or Vehicle within Engagement Range of an
 * enemy shoots at -1 to Hit whoever it targets, and so does anyone shooting
 * at an engaged Monster or Vehicle. One flag covers both: with two Monsters
 * or Vehicles, either being engaged penalises shots in both directions.
 * Pistols are exempt (see computeAttackTable).
 */
export function bigGunsApplies(
  engaged: boolean,
  attacker: ParsedUnit,
  target: ParsedUnit,
): boolean {
  return engaged && canBeEngaged(attacker, target);
}

/** Orks units whose datasheet carries the Waaagh! army rule. */
export function hasWaaagh(unit: ParsedUnit): boolean {
  return unit.rules.some((r) => r.name.trim().toLowerCase() === "waaagh!");
}

/**
 * A model ability that always subtracts 1 from the Damage of attacks
 * allocated to it: 10th edition's "Each time an attack is allocated to this
 * model, subtract 1 from the Damage characteristic of that attack" (Duty
 * Eternal, Guardian Eternal, Necrodermis) and New Recruit's 11th edition
 * Timing/Result form ("this model is allocated an attack" / "reduce Damage
 * characteristic of the attack by 1", Implacable Resilience). Abilities with
 * a condition (once per battle, while affected by another unit, only against
 * some attacks) are left to the manual Damage modifier.
 */
const ALLOCATED_TO_THIS_MODEL = /allocated to this model|this model is allocated an attack/i;
const MINUS_ONE_DAMAGE =
  /subtract 1 from the Damage characteristic|reduce (the )?Damage characteristic of (that|the) attack by 1|Damage characteristic of (that|the) attack drops by 1/i;
const DAMAGE_CONDITION = /\b(once per|while|until|unless|if|select|strength|melee|ranged|psychic|mortal)\b/i;

function isMinusOneDamage(text: string): boolean {
  const plain = text.replace(/\*\*|\^\^/g, "");
  return (
    ALLOCATED_TO_THIS_MODEL.test(plain) &&
    MINUS_ONE_DAMAGE.test(plain) &&
    !DAMAGE_CONDITION.test(plain)
  );
}

/** The target's own abilities that take 1 off the Damage of every attack
 * allocated to it. */
export function damageReductionSources(unit: ParsedUnit): RuleRef[] {
  return unit.abilities
    .filter((a) => isMinusOneDamage(a.text ?? ""))
    .map((a) => ({ name: a.name, text: a.text }));
}

/** `base` with `mod` added to every roll, each result floored at 1, so
 * "D6" - 1 reads "D6-1" and averages (1+1+2+3+4+5)/6. */
export function applyDamageMod(base: DiceExpr, mod: number): DiceExpr {
  if (mod === 0 || base.raw === "—") return base;
  const flat = base.flat + mod;
  if (base.dice <= 0 || base.sides <= 0) {
    const value = Math.max(1, flat);
    return { ...base, flat: value, avg: value, raw: String(value) };
  }
  // Every total of the dice, floored at 1 after the modifier.
  let totals = [0];
  for (let i = 0; i < base.dice; i++) {
    const next: number[] = [];
    for (const t of totals) for (let f = 1; f <= base.sides; f++) next.push(t + f);
    totals = next;
  }
  const avg = totals.reduce((sum, t) => sum + Math.max(1, t + flat), 0) / totals.length;
  const dice = `${base.dice === 1 ? "" : base.dice}D${base.sides}`;
  const raw = flat > 0 ? `${dice}+${flat}` : flat < 0 ? `${dice}${flat}` : dice;
  return { ...base, flat, avg, raw };
}

/** Every model in the unit has Stealth (it is a unit-wide ability). */
export function hasStealth(unit: ParsedUnit): boolean {
  return [...unit.abilities, ...unit.rules].some((a) => a.name.trim().toLowerCase() === "stealth");
}

const DAMAGED_NAME = /^damaged\b/i;
const DAMAGED_HIT_PENALTY = /subtract 1 from the Hit roll|Hit roll\s*[-−]1/i;

/** The "Damaged: 1-N wounds remaining" ability of a unit, when it gives -1
 * to hit (every such profile in the rosters does). */
export function damagedProfile(unit: ParsedUnit): RuleRef | null {
  const a = unit.abilities.find(
    (x) => DAMAGED_NAME.test(x.name) && DAMAGED_HIT_PENALTY.test(x.text ?? ""),
  );
  return a ? { name: a.name, text: a.text } : null;
}

/** Whether any of the unit's weapons of this type is a Lance. */
export function hasLanceWeapon(unit: ParsedUnit, type?: "ranged" | "melee"): boolean {
  return unit.weapons.some(
    (w) => (type == null || w.type === type) && hasKeyword(w.keywords, "Lance"),
  );
}

/** Rules that change one attack direction and come from the board rather
 * than from the two units alone. */
export interface AttackContext {
  /** Necrons Command Protocols (11th, Awakened Dynasty): the attacker is
   * led by a Necrons Character, so its attacks get +1 to hit. */
  commandProtocols?: RuleRef | null;
}

/** The invulnerable save the Waaagh! grants in both editions. */
const WAAAGH_INVULN = 5;

export interface HalfRangeBonus {
  kind: "melta" | "rapidFire";
  value: number;
}

export interface AttackRow {
  profileId: string;
  name: string;
  type: "ranged" | "melee";
  subProfile: boolean;
  count: number;
  attacksRaw: string;
  totalAttacks: number;
  hitTarget: number | null;
  woundTarget: number;
  antiX: { keyword: string; threshold: number } | null;
  armorTarget: number | null;
  saveTarget: number | null;
  isInvulnFallback: boolean;
  ap: number;
  /** The weapon's Strength, for the "S4 vs T6" line. */
  strength: number;
  damage: DiceExpr;
  /** The weapon's printed range, shown beside its name. Null when the
   * export carries none. */
  range: string | null;
  keywords: string[];
  rules: RuleRef[];
  /** Leader-attachment bonuses baked into this weapon's stats (e.g. +1
   * Attacks from Castellan Crowe), for the UI to flag as modified. */
  leaderMods: RuleRef[];
  /** Crusade honours and scars that changed this weapon (see WeaponEntry). */
  crusadeMods: Array<{ ref: RuleRef; tone: "positive" | "negative" }>;
  /** The target's own "-1 Damage" abilities applied to this weapon. */
  damageReductionSources: RuleRef[];
  /** Net change to the Damage characteristic (manual + target abilities). */
  appliedDamageMod: number;
  /** Benefit of Cover changed this ranged attack: "save" in 10th (+1 to
   * the armour save), "bs" in 11th (BS worsened by 1). */
  coverApplied: "save" | "bs" | null;
  /** The cover came from the target's Stealth (11th). */
  coverFromStealth: boolean;
  /** Cover was switched on but did not apply: Ignores Cover, or a 3+ save
   * against AP 0 (10th). */
  coverBlocked: "ignoresCover" | "saveTooGood" | null;
  /** 10th edition Stealth: -1 to hit was applied to this ranged attack. */
  stealthApplied: boolean;
  /** Lance on the charge: +1 to wound was applied. */
  lanceApplied: boolean;
  /** The attacker's Damaged profile (-1 to hit) applied. */
  damagedSource: RuleRef | null;
  /** Command Protocols (+1 to hit) applied. */
  commandProtocolsSource: RuleRef | null;
  /** Abilities behind the target's automatic hit penalty (e.g. Grand
   * Master Voldus's Sanctuary), separate from the plain numeric total in
   * `appliedHitMod` so the UI can name the source. */
  autoHitPenaltySources: RuleRef[];
  appliedHitMod: number;
  appliedWoundMod: number;
  apWorsened: boolean;
  apImproved: boolean;
  /** 10th edition Waaagh!: +1 Strength and Attacks were applied (melee). */
  waaaghAttack: boolean;
  /** 11th edition Waaagh!: reminder that ranged attacks have [ASSAULT]. */
  waaaghAssault: boolean;
  /** The target's 5+ invuln comes from the Waaagh!. */
  waaaghInvuln: boolean;
  halfRangeBonus: HalfRangeBonus | null;
  halfRangeApplied: boolean;
  conditionalInvulnAvailable: number | null;
  /** Extra attacks from Blast: one per full five models in the target. */
  blastBonus: number;
  /** Heavy weapon fired by a stationary unit: +1 to hit was applied. */
  heavyApplied: boolean;
  /** Big Guns Never Tire: -1 to hit was applied to this ranged weapon. */
  engagedApplied: boolean;
  /** Reminders that change no number here: re-roll wound rolls / roll for
   * Hazardous after attacking. */
  twinLinked: boolean;
  hazardous: boolean;
  /** The weapon was changed by a weapon override (shown with an EDITED tag). */
  edited: boolean;
}

function baseWoundTarget(strength: number, toughness: number): number {
  if (strength >= 2 * toughness) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (2 * strength <= toughness) return 6;
  return 5;
}

function clampTarget(value: number): number {
  return Math.min(6, Math.max(2, value));
}

const ANTI_X_PATTERN = /Anti-(\w+) (\d)\+/i;

function findAntiX(
  weaponKeywords: string[],
  targetKeywords: string[],
): { keyword: string; threshold: number } | null {
  for (const kw of weaponKeywords) {
    const match = ANTI_X_PATTERN.exec(kw);
    if (!match) continue;
    const [, keyword, thresholdRaw] = match;
    // Rosters are inconsistent about casing ("Anti-INFANTRY 4+" in one
    // export, "Anti-Infantry 2+" in another) while unit keywords are
    // title-cased ("Infantry"), so compare case-insensitively.
    const wanted = keyword.toLowerCase();
    if (targetKeywords.some((k) => k.toLowerCase() === wanted)) {
      return { keyword, threshold: Number(thresholdRaw) };
    }
  }
  return null;
}

// 11th edition exports spell some keywords in capitals ("RAPID FIRE 2").
const MELTA_PATTERN = /^Melta (\d+)$/i;
const RAPID_FIRE_PATTERN = /^Rapid Fire (\d+)$/i;

function findHalfRangeBonus(weaponKeywords: string[]): HalfRangeBonus | null {
  for (const kw of weaponKeywords) {
    const melta = MELTA_PATTERN.exec(kw);
    if (melta) return { kind: "melta", value: Number(melta[1]) };
    const rapidFire = RAPID_FIRE_PATTERN.exec(kw);
    if (rapidFire) return { kind: "rapidFire", value: Number(rapidFire[1]) };
  }
  return null;
}

function hasKeyword(weaponKeywords: string[], name: string): boolean {
  const wanted = name.toLowerCase();
  return weaponKeywords.some((kw) => kw.trim().toLowerCase() === wanted);
}

/** Core rules: the net modifier to a Hit roll never exceeds +1 or -1. */
function capHitMod(total: number): number {
  return Math.max(-1, Math.min(1, total));
}

/** Core rules: the net modifier to a Wound roll never exceeds +1 or -1. */
function capWoundMod(total: number): number {
  return Math.max(-1, Math.min(1, total));
}

/** `base` with `bonus` added to its flat part, re-rendered as one
 * expression ("D6+3" + 2 -> "D6+5", not "D6+3+2"). */
function applyBonus(base: DiceExpr, bonus: number): DiceExpr {
  const flat = base.flat + bonus;
  const dice = base.dice > 0 ? `${base.dice === 1 ? "" : base.dice}D${base.sides}` : "";
  const raw = dice ? (flat > 0 ? `${dice}+${flat}` : dice) : String(flat);
  return { ...base, flat, avg: base.avg != null ? base.avg + bonus : base.avg, raw };
}

export function computeAttackTable(
  attacker: ParsedUnit,
  /** Live model counts for both units (the app keeps one map for all). */
  counts: Record<string, number>,
  target: ParsedUnit,
  modifiers: DirectionModifiers = emptyModifiers(),
  /** Automatic hit-roll modifier from the target's own leader (e.g. Grand
   * Master Voldus's Sanctuary: -1 to hit while he leads the target unit) —
   * summed with the manual `modifiers.hitMod`, kept separate so the manual
   * control stays a plain -1/0/1 toggle. */
  autoHitMod = 0,
  /** The abilities behind `autoHitMod`, echoed onto each row so the UI can
   * name them. */
  autoHitPenaltySources: RuleRef[] = [],
  /** Big Guns Never Tire applies to this attack (see bigGunsApplies). */
  engagedPenalty = false,
  /** Decides what the Waaagh!, cover and Stealth do. */
  edition: Edition = 10,
  context: AttackContext = {},
): AttackRow[] {
  const merged = mergeByProfileId(attacker.weapons);
  const targetModels = getUnitLiveTotal(counts, target.id, target);
  const attackerWaaagh = modifiers.waaagh && hasWaaagh(attacker);
  const targetWaaagh = modifiers.waaagh && hasWaaagh(target);
  const targetDamageReduction = damageReductionSources(target);
  const targetStealth = hasStealth(target);
  const attackerDamaged = modifiers.damaged.includes(attacker.id) ? damagedProfile(attacker) : null;
  const commandProtocols = context.commandProtocols ?? null;
  // Several such abilities on one model still take off 1 in total.
  const damageMod = modifiers.damageMod - (targetDamageReduction.length > 0 ? 1 : 0);

  return merged.map((weapon) => {
    const count = getLiveWeaponCount(counts, attacker.id, attacker, weapon.profileId);
    const heavyApplied = modifiers.stationary && hasKeyword(weapon.keywords, "Heavy");
    const engagedApplied =
      engagedPenalty &&
      weapon.type === "ranged" &&
      weapon.skill !== null &&
      !hasKeyword(weapon.keywords, "Pistol");
    const ranged = weapon.type === "ranged";
    const rolls = weapon.skill !== null; // Torrent weapons make no hit roll
    const ignoresCover = hasKeyword(weapon.keywords, "Ignores Cover");
    // 10th: Stealth is its own -1 to hit. 11th: it gives the Benefit of Cover,
    // which Ignores Cover removes too.
    const stealthApplied = edition === 10 && ranged && rolls && targetStealth;
    const wantsCover = ranged && (modifiers.cover || (edition === 11 && targetStealth));
    const damagedApplied = attackerDamaged != null && rolls;
    const commandProtocolsApplied = commandProtocols != null && rolls;
    const totalHitMod = capHitMod(
      modifiers.hitMod +
        autoHitMod +
        (weapon.crusadeHitMod ?? 0) +
        (heavyApplied ? 1 : 0) -
        (engagedApplied ? 1 : 0) -
        (stealthApplied ? 1 : 0) -
        (damagedApplied ? 1 : 0) +
        (commandProtocolsApplied ? 1 : 0),
    );
    const blastBonus = hasKeyword(weapon.keywords, "Blast") ? Math.floor(targetModels / 5) : 0;

    // AP is negative: improving it subtracts, and worsening never makes it
    // a bonus to the save.
    const effectiveAp = Math.min(weapon.ap - modifiers.apMod, 0);
    const waaaghAttack = attackerWaaagh && edition === 10 && weapon.type === "melee";
    const strength = weapon.strength + (waaaghAttack ? 1 : 0);

    const sv = target.profile.SV;
    let coverApplied: "save" | "bs" | null = null;
    let coverBlocked: "ignoresCover" | "saveTooGood" | null = null;
    if (wantsCover) {
      if (ignoresCover) coverBlocked = "ignoresCover";
      else if (edition === 11) coverApplied = rolls ? "bs" : null;
      else if (sv == null) coverApplied = null;
      // 10th: a 3+ save or better gets no cover against AP 0.
      else if (sv <= 3 && effectiveAp === 0) coverBlocked = "saveTooGood";
      else coverApplied = "save";
    }
    const armorTarget =
      sv != null ? sv - effectiveAp - (coverApplied === "save" ? 1 : 0) : null;

    // A conditional invuln (e.g. "5+ against ranged attacks only") isn't
    // auto-applied — we don't know which condition it is, just that one
    // exists — so it only counts toward the save when the user has manually
    // confirmed it applies via the Invuln override.
    const targetInvuln = target.invuln;
    const ownInvulnValue =
      targetInvuln != null && !targetInvuln.conditional ? targetInvuln.value : null;
    const waaaghInvuln =
      targetWaaagh && (ownInvulnValue == null || ownInvulnValue > WAAAGH_INVULN);
    const autoInvulnValue = waaaghInvuln ? WAAAGH_INVULN : ownInvulnValue;
    const invulnValue = modifiers.invulnOverride ?? autoInvulnValue;
    const conditionalInvulnAvailable =
      modifiers.invulnOverride == null && targetInvuln?.conditional
        ? targetInvuln.value
        : null;

    let saveTarget: number | null;
    let isInvulnFallback = false;

    if (armorTarget != null && armorTarget <= 6) {
      if (invulnValue != null && invulnValue < armorTarget) {
        saveTarget = invulnValue;
        isInvulnFallback = true;
      } else {
        saveTarget = armorTarget;
      }
    } else if (invulnValue != null) {
      saveTarget = invulnValue;
      isInvulnFallback = armorTarget != null;
    } else {
      saveTarget = null;
    }

    const antiX =
      target.profile.T != null
        ? findAntiX(weapon.keywords, target.keywords)
        : null;
    const baseWound =
      target.profile.T != null
        ? Math.min(
            baseWoundTarget(strength, target.profile.T),
            antiX?.threshold ?? 6,
          )
        : 6;
    const lanceApplied = modifiers.charged && hasKeyword(weapon.keywords, "Lance");
    const totalWoundMod = capWoundMod(modifiers.woundMod + (lanceApplied ? 1 : 0));
    const woundTarget = clampTarget(baseWound - totalWoundMod);

    // 11th edition cover worsens the BS characteristic itself, so it sits
    // outside the hit-roll modifier cap.
    const hitTarget =
      weapon.skill === null
        ? null
        : clampTarget(weapon.skill + (coverApplied === "bs" ? 1 : 0) - totalHitMod);

    const halfRangeBonus = findHalfRangeBonus(weapon.keywords);
    const halfRangeApplied = halfRangeBonus != null && modifiers.halfRange;

    const baseDamage =
      weapon.damage ?? { dice: 0, sides: 0, flat: 0, raw: "—", avg: 0 };
    const meltaDamage =
      halfRangeApplied && halfRangeBonus!.kind === "melta"
        ? applyBonus(baseDamage, halfRangeBonus!.value)
        : baseDamage;
    const hasDamage = weapon.damage != null;
    const damage = hasDamage ? applyDamageMod(meltaDamage, damageMod) : meltaDamage;

    const baseAttacks =
      weapon.attacks ?? { dice: 0, sides: 0, flat: 0, raw: "—", avg: 0 };
    const rapidFireBonus =
      halfRangeApplied && halfRangeBonus!.kind === "rapidFire" ? halfRangeBonus!.value : 0;
    const attackBonus = rapidFireBonus + blastBonus + (waaaghAttack ? 1 : 0);
    const attacksExpr = attackBonus > 0 ? applyBonus(baseAttacks, attackBonus) : baseAttacks;

    return {
      profileId: weapon.profileId,
      name: weapon.name,
      type: weapon.type,
      subProfile: weapon.subProfile,
      count,
      attacksRaw: attacksExpr.raw ?? "—",
      totalAttacks: count * (attacksExpr.avg ?? 0),
      hitTarget,
      woundTarget,
      antiX,
      armorTarget,
      saveTarget,
      isInvulnFallback,
      ap: effectiveAp,
      strength,
      damage,
      range: weapon.range ?? null,
      keywords: weapon.keywords,
      rules: weapon.rules,
      leaderMods: weapon.leaderMods ?? [],
      crusadeMods: weapon.crusadeMods ?? [],
      damageReductionSources: hasDamage ? targetDamageReduction : [],
      // A flat 1 stays 1: nothing changed, so nothing is flagged.
      appliedDamageMod: hasDamage && damage.raw !== meltaDamage.raw ? damageMod : 0,
      autoHitPenaltySources: weapon.skill === null ? [] : autoHitPenaltySources,
      appliedHitMod: weapon.skill === null ? 0 : totalHitMod,
      appliedWoundMod: totalWoundMod,
      coverApplied,
      coverFromStealth: coverApplied != null && !modifiers.cover,
      coverBlocked,
      stealthApplied,
      lanceApplied,
      damagedSource: damagedApplied ? attackerDamaged : null,
      commandProtocolsSource: commandProtocolsApplied ? commandProtocols : null,
      apWorsened: modifiers.apMod < 0,
      apImproved: modifiers.apMod > 0,
      waaaghAttack,
      waaaghAssault: attackerWaaagh && edition === 11 && weapon.type === "ranged",
      waaaghInvuln: waaaghInvuln && modifiers.invulnOverride == null,
      halfRangeBonus,
      halfRangeApplied,
      conditionalInvulnAvailable,
      blastBonus,
      heavyApplied: weapon.skill === null ? false : heavyApplied,
      engagedApplied,
      twinLinked: hasKeyword(weapon.keywords, "Twin-linked"),
      hazardous: hasKeyword(weapon.keywords, "Hazardous"),
      edited: weapon.edited === true,
    };
  });
}
