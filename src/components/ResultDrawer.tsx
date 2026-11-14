import { useState, type ReactNode } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import {
  damagedProfile,
  emptyModifiers,
  hasLanceWeapon,
  hasWaaagh,
  canBeEngaged,
  syncSharedModifiers,
  type DirectionModifiers,
} from "../lib/combat";
import { AttackTable } from "./AttackTable";
import type { WeaponMode } from "../lib/route";
import type { Edition } from "../lib/edition";
import { ModifierControls, type Direction } from "./ModifierControls";
import { loadModifiersCollapsed, saveModifiersCollapsed } from "../lib/modifierPanel";

interface ResultDrawerProps {
  unitA: ParsedUnit | null;
  unitB: ParsedUnit | null;
  unitsA: ParsedUnit[];
  unitsB: ParsedUnit[];
  leaderAssignments: Record<string, string>;
  counts: Record<string, number>;
  /** Ranged or melee, chosen in the header for the phase being played. */
  weapons: WeaponMode;
  edition: Edition;
  onClose: () => void;
}

/**
 * Always docked at the bottom of the battle area, never taller than 58% of it on
 * phones and 46% on tablets, so the unit lists above stay usable. The
 * controls stick to the top of the drawer while the results scroll.
 */
function Drawer({ children }: { children: ReactNode }) {
  return (
    <div
      className="shrink-0 flex flex-col max-h-[58%] min-[900px]:max-h-[46%] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
      style={{
        background: "var(--panel)",
        borderTop: "2px solid var(--ink)",
        boxShadow: "var(--shadow-up)",
      }}
    >
      <div aria-hidden="true" className="shrink-0 flex justify-center pt-[6px]">
        <span className="w-[36px] h-[4px] rounded-full" style={{ background: "var(--rule)" }} />
      </div>
      {children}
    </div>
  );
}

export function ResultDrawer({
  unitA,
  unitB,
  unitsA,
  unitsB,
  leaderAssignments,
  counts,
  weapons,
  edition,
  onClose,
}: ResultDrawerProps) {
  if (!unitA || !unitB) {
    return (
      <Drawer>
        <p className="m-0 p-[28px] text-center text-[16px] font-medium" style={{ color: "var(--ink-2)" }}>
          Select a unit on both sides to see combat results.
        </p>
      </Drawer>
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
      weapons={weapons}
      edition={edition}
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
  weapons: WeaponMode;
  edition: Edition;
  onClose: () => void;
}

function CombatResults({
  unitA,
  unitB,
  unitsA,
  unitsB,
  leaderAssignments,
  counts,
  weapons,
  edition,
  onClose,
}: CombatResultsProps) {
  // Each attack direction has its own modifiers (cover on one target, a
  // charge by one attacker...); the board-wide ones are kept in step.
  const [mods, setMods] = useState<Record<Direction, DirectionModifiers>>(() => ({
    ab: emptyModifiers(),
    ba: emptyModifiers(),
  }));
  const [direction, setDirection] = useState<Direction>("ab");
  const otherDirection: Direction = direction === "ab" ? "ba" : "ab";

  function setModifiers(next: DirectionModifiers) {
    setMods((prev) => ({
      ...prev,
      [direction]: next,
      [otherDirection]: syncSharedModifiers(next, prev[otherDirection]),
    }));
  }
  const [collapsed, setCollapsed] = useState(() => loadModifiersCollapsed());

  function toggleCollapsed() {
    setCollapsed(!collapsed);
    saveModifiersCollapsed(!collapsed);
  }

  return (
    <Drawer>
      <div
        className="sticky top-0 z-10"
        style={{ background: "var(--panel)", borderBottom: "1px solid var(--rule)" }}
      >
        <ModifierControls
          modifiers={mods[direction]}
          onChange={setModifiers}
          direction={{
            value: direction,
            onChange: setDirection,
            names: { a: unitA.name, b: unitB.name },
            otherModifiers: mods[otherDirection],
          }}
          onClose={onClose}
          showEngaged={weapons === "ranged" && canBeEngaged(unitA, unitB)}
          showWaaagh={hasWaaagh(unitA) || hasWaaagh(unitB)}
          showCover={weapons === "ranged"}
          showCharged={hasLanceWeapon(unitA, weapons) || hasLanceWeapon(unitB, weapons)}
          damagedUnits={[unitA, unitB]
            .filter((u, i, all) => damagedProfile(u) && all.findIndex((x) => x.id === u.id) === i)
            .map((u) => ({ id: u.id, name: u.name }))}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </div>
      <div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-x-[24px] px-[12px] pb-[16px]">
        <AttackTable
          attacker={unitA}
          attackerCounts={counts}
          target={unitB}
          targetSideUnits={unitsB}
          attackerSideUnits={unitsA}
          leaderAssignments={leaderAssignments}
          side="a"
          modifiers={mods.ab}
          weaponFilter={weapons}
          edition={edition}
        />
        <AttackTable
          attacker={unitB}
          attackerCounts={counts}
          target={unitA}
          targetSideUnits={unitsA}
          attackerSideUnits={unitsB}
          leaderAssignments={leaderAssignments}
          side="b"
          modifiers={mods.ba}
          weaponFilter={weapons}
          edition={edition}
        />
      </div>
    </Drawer>
  );
}
