import type { DiceExpr, ParsedUnit, RuleRef } from "../../parseRoster.mjs";
import { getLiveWeaponCount, getUnitLiveTotal } from "./loadouts";
import { mergeByProfileId } from "./weapons";

export interface DirectionModifiers {
  hitMod: -1 | 0 | 1;
  woundMod: -1 | 0 | 1;
  invulnOverride: number | null;
  apWorsened: boolean;
  halfRange: boolean;
  /** The attacking unit did not move this turn: Heavy weapons get +1 to hit. */
  stationary: boolean;
}

export function emptyModifiers(): DirectionModifiers {
  return {
    hitMod: 0,
    woundMod: 0,
    invulnOverride: null,
    apWorsened: false,
    halfRange: false,
    stationary: false,
  };
}

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
  /** Abilities behind the target's automatic hit penalty (e.g. Grand
   * Master Voldus's Sanctuary), separate from the plain numeric total in
   * `appliedHitMod` so the UI can name the source. */
  autoHitPenaltySources: RuleRef[];
  appliedHitMod: number;
  appliedWoundMod: number;
  apWorsened: boolean;
  halfRangeBonus: HalfRangeBonus | null;
  halfRangeApplied: boolean;
  conditionalInvulnAvailable: number | null;
  /** Extra attacks from Blast: one per full five models in the target. */
  blastBonus: number;
  /** Heavy weapon fired by a stationary unit: +1 to hit was applied. */
  heavyApplied: boolean;
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

const ANTI_X_PATTERN = /Anti-(\w+) (\d)\+/;

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

const MELTA_PATTERN = /^Melta (\d+)$/;
const RAPID_FIRE_PATTERN = /^Rapid Fire (\d+)$/;

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
): AttackRow[] {
  const merged = mergeByProfileId(attacker.weapons);
  const targetModels = getUnitLiveTotal(counts, target.id, target);

  return merged.map((weapon) => {
    const count = getLiveWeaponCount(counts, attacker.id, attacker, weapon.profileId);
    const heavyApplied = modifiers.stationary && hasKeyword(weapon.keywords, "Heavy");
    const totalHitMod = capHitMod(modifiers.hitMod + autoHitMod + (heavyApplied ? 1 : 0));
    const blastBonus = hasKeyword(weapon.keywords, "Blast") ? Math.floor(targetModels / 5) : 0;

    const effectiveAp = modifiers.apWorsened
      ? Math.min(weapon.ap + 1, 0)
      : weapon.ap;

    const sv = target.profile.SV;
    const armorTarget = sv != null ? sv - effectiveAp : null;

    // A conditional invuln (e.g. "5+ against ranged attacks only") isn't
    // auto-applied — we don't know which condition it is, just that one
    // exists — so it only counts toward the save when the user has manually
    // confirmed it applies via the Invuln override.
    const targetInvuln = target.invuln;
    const autoInvulnValue =
      targetInvuln != null && !targetInvuln.conditional ? targetInvuln.value : null;
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
            baseWoundTarget(weapon.strength, target.profile.T),
            antiX?.threshold ?? 6,
          )
        : 6;
    const woundTarget = clampTarget(baseWound - modifiers.woundMod);

    const hitTarget =
      weapon.skill === null ? null : clampTarget(weapon.skill - totalHitMod);

    const halfRangeBonus = findHalfRangeBonus(weapon.keywords);
    const halfRangeApplied = halfRangeBonus != null && modifiers.halfRange;

    const baseDamage =
      weapon.damage ?? { dice: 0, sides: 0, flat: 0, raw: "—", avg: 0 };
    const damage =
      halfRangeApplied && halfRangeBonus!.kind === "melta"
        ? applyBonus(baseDamage, halfRangeBonus!.value)
        : baseDamage;

    const baseAttacks =
      weapon.attacks ?? { dice: 0, sides: 0, flat: 0, raw: "—", avg: 0 };
    const rapidFireBonus =
      halfRangeApplied && halfRangeBonus!.kind === "rapidFire" ? halfRangeBonus!.value : 0;
    const attackBonus = rapidFireBonus + blastBonus;
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
      strength: weapon.strength,
      damage,
      range: weapon.range ?? null,
      keywords: weapon.keywords,
      rules: weapon.rules,
      leaderMods: weapon.leaderMods ?? [],
      autoHitPenaltySources: weapon.skill === null ? [] : autoHitPenaltySources,
      appliedHitMod: weapon.skill === null ? 0 : totalHitMod,
      appliedWoundMod: modifiers.woundMod,
      apWorsened: modifiers.apWorsened,
      halfRangeBonus,
      halfRangeApplied,
      conditionalInvulnAvailable,
      blastBonus,
      heavyApplied: weapon.skill === null ? false : heavyApplied,
      twinLinked: hasKeyword(weapon.keywords, "Twin-linked"),
      hazardous: hasKeyword(weapon.keywords, "Hazardous"),
      edited: weapon.edited === true,
    };
  });
}
