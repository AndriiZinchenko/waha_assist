import type { ParsedUnit, RuleRef, WeaponEntry } from "../../parseRoster.mjs";
import { applyBonus } from "./combat";

/**
 * Combat-relevant effects a Leader grants once actually attached to a unit
 * — keyed by the exact ability name New Recruit exports, since the effect
 * text itself ("add 1 to the Attacks characteristic of...") isn't safe to
 * parse generically. Surveyed across every army in `armies/`; most
 * "while this model is leading a unit" abilities are re-rolls, targeting
 * restrictions, or Feel No Pain — none of which this calculator models —
 * so only the two below translate into a plain stat modifier.
 */
export type LeaderEffect =
  | { kind: "weaponAttacksBonus"; weaponName: string; bonus: number }
  | { kind: "hitPenaltyWhenTargeted"; amount: number };

/** 11th edition Sanctuary: "Melee attacks that target this unit have -1 to
 * hit rolls" (and Stealth against ranged attacks, see leaderDefences). */
function penaltyAppliesTo(source: RuleRef, weaponType: "ranged" | "melee" | undefined): boolean {
  const text = (source.text ?? "").replace(/\*\*|\^\^/g, "");
  if (/melee attacks that target this unit/i.test(text)) return weaponType !== "ranged";
  if (/ranged attacks that target this unit/i.test(text)) return weaponType !== "melee";
  return true;
}

const LEADER_EFFECTS: Record<string, LeaderEffect> = {
  // Castellan Crowe, Grey Knights.
  "Champion of the Order of Purifiers (Psychic)": {
    kind: "weaponAttacksBonus",
    weaponName: "Purifying Flame",
    bonus: 1,
  },
  // Grand Master Voldus, Grey Knights.
  "Sanctuary (Psychic)": { kind: "hitPenaltyWhenTargeted", amount: -1 },
};

interface SourcedEffect {
  effect: LeaderEffect;
  /** The ability that granted it, for the UI to label and expand — the
   * "why was this modified" indicator. */
  source: RuleRef;
}

function sourcedEffectsOf(unit: ParsedUnit): SourcedEffect[] {
  const out: SourcedEffect[] = [];
  for (const a of unit.abilities) {
    const effect = LEADER_EFFECTS[a.name];
    if (effect) out.push({ effect, source: { name: a.name, text: a.text } });
  }
  return out;
}

/** Every leader currently attached to `unitId` within `units` — a unit can
 * have more than one (e.g. a Captain and an Apothecary both attached). */
function leadersOf(
  unitId: string,
  units: ParsedUnit[],
  assignments: Record<string, string>,
): ParsedUnit[] {
  const unitIds = new Set(units.map((u) => u.id));
  const leaderIds = Object.entries(assignments)
    .filter(([leaderId, targetId]) => targetId === unitId && unitIds.has(leaderId))
    .map(([leaderId]) => leaderId);
  return units.filter((u) => leaderIds.includes(u.id));
}

/** Every leader-derived effect currently active on `unit` — from its own
 * abilities if it's itself an attached leader, plus every leader attached
 * to it. */
function activeSourcedEffects(
  unit: ParsedUnit,
  units: ParsedUnit[],
  assignments: Record<string, string>,
): SourcedEffect[] {
  const out: SourcedEffect[] = [];

  const ownTarget = assignments[unit.id];
  if (ownTarget && units.some((u) => u.id === ownTarget)) {
    out.push(...sourcedEffectsOf(unit));
  }
  for (const leader of leadersOf(unit.id, units, assignments)) {
    out.push(...sourcedEffectsOf(leader));
  }
  return out;
}

function bumpAttacks(weapon: WeaponEntry, bonus: number): WeaponEntry {
  if (!weapon.attacks) return weapon;
  // "D6+1" + 1 reads "D6+2", not "D6+1+1".
  return { ...weapon, attacks: applyBonus(weapon.attacks, bonus) };
}

/**
 * `unit` with leader-attachment weapon bonuses applied to its own weapon
 * list. Once attached, a Leader and its Bodyguard unit act as one unit for
 * rules purposes, so a "weapons equipped by that unit" bonus applies both
 * to the Bodyguard's own copies AND the Leader's own matching weapon (e.g.
 * Castellan Crowe's own Purifying Flame gets +1 Attacks too, same as every
 * Purifier Squad model's) — so this checks both directions: `unit` acting
 * as an attached leader, and `unit` being led by someone else. Each
 * modified weapon carries `leaderMods`, naming the ability responsible, so
 * the UI can flag the stat as changed rather than showing a bare number.
 */
export function withLeaderWeaponBonuses(
  unit: ParsedUnit,
  units: ParsedUnit[],
  assignments: Record<string, string>,
): ParsedUnit {
  const contributors = activeSourcedEffects(unit, units, assignments);

  const bonusByWeaponName = new Map<string, number>();
  const sourcesByWeaponName = new Map<string, RuleRef[]>();
  for (const { effect, source } of contributors) {
    if (effect.kind !== "weaponAttacksBonus") continue;
    bonusByWeaponName.set(
      effect.weaponName,
      (bonusByWeaponName.get(effect.weaponName) ?? 0) + effect.bonus,
    );
    const list = sourcesByWeaponName.get(effect.weaponName) ?? [];
    list.push(source);
    sourcesByWeaponName.set(effect.weaponName, list);
  }
  if (bonusByWeaponName.size === 0) return unit;

  return {
    ...unit,
    weapons: unit.weapons.map((w) => {
      const bonus = bonusByWeaponName.get(w.name);
      if (!bonus) return w;
      return {
        ...bumpAttacks(w, bonus),
        leaderMods: sourcesByWeaponName.get(w.name),
      };
    }),
  };
}

/** Apply `withLeaderWeaponBonuses` across a whole (already visible-filtered)
 * unit list, resolving leader relationships within that same list. */
export function applyLeaderWeaponBonuses(
  units: ParsedUnit[],
  assignments: Record<string, string>,
): ParsedUnit[] {
  return units.map((u) => withLeaderWeaponBonuses(u, units, assignments));
}

/** Net hit-roll penalty (e.g. Grand Master Voldus's Sanctuary: -1) applied
 * to attacks made against `unit`, from every leader currently attached to
 * it within `units`. */
export function leaderHitPenaltyAgainst(
  unit: ParsedUnit,
  units: ParsedUnit[],
  assignments: Record<string, string>,
  /** The attacks being made; a melee-only penalty skips ranged ones. */
  weaponType?: "ranged" | "melee",
): number {
  let penalty = 0;
  for (const { effect, source } of activeSourcedEffects(unit, units, assignments)) {
    if (effect.kind === "hitPenaltyWhenTargeted" && penaltyAppliesTo(source, weaponType)) {
      penalty += effect.amount;
    }
  }
  return penalty;
}

/** The abilities responsible for `leaderHitPenaltyAgainst`, so the UI can
 * name the source rather than showing a bare "-1". */
export function leaderHitPenaltySources(
  unit: ParsedUnit,
  units: ParsedUnit[],
  assignments: Record<string, string>,
  weaponType?: "ranged" | "melee",
): RuleRef[] {
  return activeSourcedEffects(unit, units, assignments)
    .filter(
      ({ effect, source }) =>
        effect.kind === "hitPenaltyWhenTargeted" && penaltyAppliesTo(source, weaponType),
    )
    .map(({ source }) => source);
}

const GRANTS_STEALTH =
  /(this unit has|bearer.s unit have|led by the bearer gains|that unit ha(s|ve))[^.\n]{0,30}\bStealth\b/i;
const GRANTS_COVER = /(models in that unit|this unit|that unit)[^.\n]{0,20}ha(s|ve) the Benefit of Cover/i;

/**
 * Stealth or the Benefit of Cover that a unit has from an ability, its own or
 * an attached character's: Sanctuary (11th, "This unit has Stealth"), Phial
 * of the Abyss ("Models in the bearer's unit have the Stealth ability"),
 * Nether-realm Casket ("the unit led by the bearer gains Stealth"), Red Skull
 * Kommandos ("models in that unit have the Benefit of Cover"). Abilities that
 * add a condition (an objective, a phase) are left to the Cover toggle.
 */
export function leaderDefences(
  unit: ParsedUnit,
  units: ParsedUnit[],
  assignments: Record<string, string>,
): { stealth: RuleRef[]; cover: RuleRef[] } {
  const byId = new Map(units.map((u) => [u.id, u]));
  const bodyId = assignments[unit.id] && byId.has(assignments[unit.id]) ? assignments[unit.id] : unit.id;
  const attached = Object.entries(assignments)
    .filter(([id, target]) => target === bodyId && byId.has(id))
    .map(([id]) => byId.get(id)!);
  const members = [byId.get(bodyId) ?? unit, ...attached];
  const conditional = /\b(objective|once per|until|if |unless|phase)\b/i;
  const stealth: RuleRef[] = [];
  const cover: RuleRef[] = [];
  for (const m of members) {
    const isAttached = m.id !== bodyId;
    for (const a of m.abilities) {
      const text = (a.text ?? "").replace(/\*\*|\^\^/g, "");
      if (conditional.test(text)) continue;
      // "While this model is leading a unit" needs it to be attached.
      const needsLeading = /leading|led by the bearer|leads a unit/i.test(text);
      if (needsLeading && !isAttached) continue;
      const ref = { name: a.name, text: a.text };
      if (GRANTS_STEALTH.test(text)) stealth.push(ref);
      if (GRANTS_COVER.test(text)) cover.push(ref);
    }
  }
  return { stealth, cover };
}

const COMMAND_PROTOCOLS_HIT_BONUS = /Hit rolls?[^\n]*\+1/i;

/**
 * Necrons Command Protocols, 11th edition (Awakened Dynasty): "unit led by a
 * NECRONS CHARACTER model — Hit rolls for attacks by this unit's models: +1".
 * The rule rides on every unit of the roster; it applies when `unit` is part
 * of an attached unit with a Character leader, which also covers the leader's
 * own attacks. A Support character does not lead. 10th edition's Command
 * Protocols reads differently and is not matched.
 */
export function commandProtocolsFor(
  unit: ParsedUnit,
  units: ParsedUnit[],
  assignments: Record<string, string>,
): RuleRef | null {
  const rule = unit.rules.find((r) => r.name.trim().toLowerCase() === "command protocols");
  if (!rule || !COMMAND_PROTOCOLS_HIT_BONUS.test(rule.text ?? "")) return null;

  const byId = new Map(units.map((u) => [u.id, u]));
  const bodyId = assignments[unit.id] && byId.has(assignments[unit.id]) ? assignments[unit.id] : unit.id;
  const attached = Object.entries(assignments)
    .filter(([leaderId, targetId]) => targetId === bodyId && byId.has(leaderId))
    .map(([leaderId]) => byId.get(leaderId)!);
  const isLeader = (u: ParsedUnit) => {
    const kw = u.keywords.map((k) => k.toLowerCase());
    return kw.includes("character") && !kw.includes("support");
  };
  return attached.some(isLeader) ? { name: rule.name, text: rule.text } : null;
}
