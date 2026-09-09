import type { ParsedUnit } from "../../parseRoster.mjs";
import { computeAttackTable, type DirectionModifiers } from "../lib/combat";
import {
  leaderHitPenaltyAgainst,
  leaderHitPenaltySources,
} from "../lib/leaderEffects";
import type { Side } from "./ArmyPanel";
import type { WeaponFilter } from "./ModifierControls";
import { AttackRow } from "./AttackRow";

interface AttackTableProps {
  attacker: ParsedUnit;
  attackerCounts: Record<string, number>;
  target: ParsedUnit;
  /** Every unit on the target's side, for resolving whether the target has
   * a leader attached (e.g. Grand Master Voldus's Sanctuary: -1 to hit). */
  targetSideUnits: ParsedUnit[];
  leaderAssignments: Record<string, string>;
  side: Side;
  modifiers: DirectionModifiers;
  weaponFilter: WeaponFilter;
}

const ACCENT: Record<Side, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
};

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
    <div>
      <div className="px-4 py-2 text-[14.5px] mb-1">
        <span style={{ color: ACCENT[side] }}>{attacker.name}</span>
        <span className="text-[var(--ink-soft)]"> → </span>
        <span style={{ color: ACCENT[side === "a" ? "b" : "a"] }}>{target.name}</span>
      </div>
      <AttackSection rows={filtered} />
    </div>
  );
}

function AttackSection({
  rows,
}: {
  rows: ReturnType<typeof computeAttackTable>;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-1">
      {rows.map((row) => (
        <AttackRow key={row.profileId} row={row} />
      ))}
    </div>
  );
}
