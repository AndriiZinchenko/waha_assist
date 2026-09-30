import type { ParsedUnit } from "../../parseRoster.mjs";
import { computeAttackTable, type DirectionModifiers } from "../lib/combat";
import {
  leaderHitPenaltyAgainst,
  leaderHitPenaltySources,
} from "../lib/leaderEffects";
import type { Side } from "./ArmyPanel";
import type { WeaponMode } from "../lib/route";
import { AttackRow } from "./AttackRow";
import { SideMark } from "./SideMark";

interface AttackTableProps {
  attacker: ParsedUnit;
  attackerCounts: Record<string, number>;
  target: ParsedUnit;
  /** Every unit on the target's side, for resolving whether the target has
   * a leader attached (e.g. Grand Master Voldus's Sanctuary: -1 to hit). */
  targetSideUnits: ParsedUnit[];
  leaderAssignments: Record<string, string>;
  /** The attacker's side. */
  side: Side;
  modifiers: DirectionModifiers;
  weaponFilter: WeaponMode;
}

const COLOR: Record<Side, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
};

/** One direction of the fight: "■ Attacker → ◆ Defender" and a block per
 * weapon the attacker brings. */
export function AttackTable({
  attacker,
  attackerCounts,
  target,
  targetSideUnits,
  leaderAssignments,
  side,
  modifiers,
  weaponFilter,
}: AttackTableProps) {
  const targetSide: Side = side === "a" ? "b" : "a";
  const autoHitMod = leaderHitPenaltyAgainst(
    target,
    targetSideUnits,
    leaderAssignments,
  );
  const autoHitPenaltySources = leaderHitPenaltySources(
    target,
    targetSideUnits,
    leaderAssignments,
  );
  const rows = computeAttackTable(
    attacker,
    attackerCounts,
    target,
    modifiers,
    autoHitMod,
    autoHitPenaltySources,
  );
  const filtered = rows.filter((row) => row.type === weaponFilter);

  return (
    <section className="pt-[14px]">
      <h3 className="m-0 mb-[10px] flex flex-wrap items-center gap-x-[8px] gap-y-[2px] text-[17px] font-semibold leading-[1.25]">
        <span className="flex items-center gap-[7px]" style={{ color: COLOR[side] }}>
          <SideMark side={side} size={12} />
          {attacker.name}
        </span>
        <span className="mono text-[14px]" style={{ color: "var(--ink-soft)" }}>
          →
        </span>
        <span className="flex items-center gap-[7px]" style={{ color: COLOR[targetSide] }}>
          <SideMark side={targetSide} size={12} />
          {target.name}
        </span>
      </h3>
      {filtered.length === 0 ? (
        <p className="m-0 text-[14px] font-medium" style={{ color: "var(--ink-2)" }}>
          No {weaponFilter} weapons.
        </p>
      ) : (
        <div className="flex flex-col gap-[16px]">
          {filtered.map((row) => (
            <AttackRow key={row.profileId} row={row} targetToughness={target.profile.T} />
          ))}
        </div>
      )}
    </section>
  );
}
