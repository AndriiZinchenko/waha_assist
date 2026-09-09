import type { ParsedUnit, RuleRef, WeaponEntry } from "../../parseRoster.mjs";

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
  const attacks = weapon.attacks;
  return {
    ...weapon,
    attacks: {
      ...attacks,
      flat: attacks.flat + bonus,
      avg: attacks.avg != null ? attacks.avg + bonus : attacks.avg,
      raw: /[Dd]/.test(attacks.raw)
        ? `${attacks.raw}+${bonus}`
        : String(attacks.flat + bonus),
    },
  };
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
): number {
  let penalty = 0;
  for (const { effect } of activeSourcedEffects(unit, units, assignments)) {
    if (effect.kind === "hitPenaltyWhenTargeted") penalty += effect.amount;
  }
  return penalty;
}

/** The abilities responsible for `leaderHitPenaltyAgainst`, so the UI can
 * name the source rather than showing a bare "-1". */
export function leaderHitPenaltySources(
  unit: ParsedUnit,
  units: ParsedUnit[],
  assignments: Record<string, string>,
): RuleRef[] {
  return activeSourcedEffects(unit, units, assignments)
    .filter(({ effect }) => effect.kind === "hitPenaltyWhenTargeted")
    .map(({ source }) => source);
}
