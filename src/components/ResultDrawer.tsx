import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { emptyModifiers, type DirectionModifiers } from "../lib/combat";
import { AttackTable } from "./AttackTable";
import { ModifierControls, type WeaponFilter } from "./ModifierControls";

interface ResultDrawerProps {
  unitA: ParsedUnit | null;
  unitB: ParsedUnit | null;
  unitsA: ParsedUnit[];
  unitsB: ParsedUnit[];
  leaderAssignments: Record<string, string>;
  counts: Record<string, number>;
  onClose: () => void;
}

export function ResultDrawer({
  unitA,
  unitB,
  unitsA,
  unitsB,
  leaderAssignments,
  counts,
  onClose,
}: ResultDrawerProps) {
  if (!unitA || !unitB) {
    return (
      <div
        className="shrink-0 border-t border-[var(--rule)] px-4 py-2 text-[14.5px] text-[var(--ink-soft)]"
        style={{ background: "var(--inset)" }}
      >
        Select a unit on both sides to see combat results.
      </div>
    );
  }

  return (
    <CombatResults
      key={`${unitA.id}:${unitB.id}`}
      unitA={unitA}
      unitB={unitB}
      unitsA={unitsA}
      unitsB={unitsB}
      leaderAssignments={leaderAssignments}
      counts={counts}
      onClose={onClose}
    />
  );
}

interface CombatResultsProps {
  unitA: ParsedUnit;
  unitB: ParsedUnit;
  unitsA: ParsedUnit[];
  unitsB: ParsedUnit[];
  leaderAssignments: Record<string, string>;
  counts: Record<string, number>;
  onClose: () => void;
}

function CombatResults({
  unitA,
  unitB,
  unitsA,
  unitsB,
  leaderAssignments,
  counts,
  onClose,
}: CombatResultsProps) {
  const [modifiers, setModifiers] = useState<DirectionModifiers>(emptyModifiers());
  const [weaponFilter, setWeaponFilter] = useState<WeaponFilter>("ranged");

  return (
    <div
      className="shrink-0 border-t border-[var(--rule)] max-h-[46vh] overflow-y-auto overscroll-contain"
      style={{ background: "var(--inset)" }}
    >
      <div
        className="sticky top-0 z-10 border-b border-[var(--rule)]"
        style={{ background: "var(--inset)" }}
      >
        <ModifierControls
          modifiers={modifiers}
          onChange={setModifiers}
          weaponFilter={weaponFilter}
          onWeaponFilterChange={setWeaponFilter}
          onClose={onClose}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 p-2">
        <AttackTable
          attacker={unitA}
          attackerCounts={counts}
          target={unitB}
          targetSideUnits={unitsB}
          leaderAssignments={leaderAssignments}
          side="a"
          modifiers={modifiers}
          weaponFilter={weaponFilter}
        />
        <AttackTable
          attacker={unitB}
          attackerCounts={counts}
          target={unitA}
          targetSideUnits={unitsA}
          leaderAssignments={leaderAssignments}
          side="b"
          modifiers={modifiers}
          weaponFilter={weaponFilter}
        />
      </div>
    </div>
  );
}
