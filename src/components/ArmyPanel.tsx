import { useState } from "react";
import type { ArmyEntry } from "../lib/armies";
import { computeVisiblePoints, visibleUnits } from "../lib/armyPoints";
import { applyLeaderWeaponBonuses } from "../lib/leaderEffects";
import { optionsLookup } from "../data/unit-options";
import { applyWeaponOverrides, type UnitWeaponOverride } from "../lib/weaponOverrides";
import { getDetachmentData } from "../data/detachments";
import { DetachmentModal } from "./DetachmentModal";
import { PanelHeader } from "./PanelHeader";
import { UnitList } from "./UnitList";

export type Side = "a" | "b";

interface ArmyPanelProps {
  side: Side;
  army: ArmyEntry;
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string | null) => void;
  counts: Record<string, number>;
  onCountChange: (key: string, next: number) => void;
  /** Hidden below 900px when this side isn't the active portrait tab; always visible ≥900px. */
  hidden: boolean;
  /** leaderUnitId -> the unit id it's attached to, for nesting a leader under its unit in the list. */
  leaderAssignments: Record<string, string>;
  /** unitId -> true when excluded from this army's list and points total. */
  hiddenUnitIds: Record<string, boolean>;
  /** The detachment in play: the configured choice, else the roster's own. */
  detachment: string | null;
  /** unitId -> weapon override, applied before leader bonuses. */
  weaponOverrides: Record<string, UnitWeaponOverride>;
  /** Voice mode on — show each unit's list number. */
  showNumbers?: boolean;
}

export function ArmyPanel({
  side,
  army,
  selectedUnitId,
  onSelectUnit,
  counts,
  onCountChange,
  hidden,
  leaderAssignments,
  hiddenUnitIds,
  detachment,
  weaponOverrides,
  showNumbers = false,
}: ArmyPanelProps) {
  const [detachmentOpen, setDetachmentOpen] = useState(false);
  const detachmentData = getDetachmentData(detachment);

  const visible = visibleUnits(army.parsed.units, hiddenUnitIds);
  const hasHiddenUnits = visible.length < army.parsed.units.length;
  const points = hasHiddenUnits
    ? computeVisiblePoints(army.parsed.units, hiddenUnitIds)
    : army.parsed.pointsTotal;
  // Leader-attachment weapon bonuses (e.g. Castellan Crowe's +1 Attacks to
  // Purifying Flame) resolved against the visible list, so a hidden leader
  // doesn't still buff a unit that's effectively not in the game.
  const units = applyLeaderWeaponBonuses(
    applyWeaponOverrides(visible, weaponOverrides, optionsLookup(army.parsed.catalogue)),
    leaderAssignments,
  );

  return (
    <section
      aria-label={`Side ${side.toUpperCase()}: ${army.parsed.catalogue}`}
      className={`side-${side} ${hidden ? "hidden min-[900px]:flex" : "flex"} flex-col flex-1 min-w-0 h-full overflow-hidden`}
      style={{ background: "var(--paper)" }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
        <PanelHeader
          side={side}
          army={army.parsed}
          points={points}
          detachment={detachment}
          detachmentData={detachmentData}
          onOpenDetachment={() => setDetachmentOpen(true)}
        />
        <UnitList
          units={units}
          leaderAssignments={leaderAssignments}
          selectedUnitId={selectedUnitId}
          onSelectUnit={onSelectUnit}
          counts={counts}
          onCountChange={onCountChange}
          detachmentData={detachmentData}
          showNumbers={showNumbers}
        />
      </div>
      {detachmentOpen && detachmentData && (
        <DetachmentModal
          side={side}
          data={detachmentData}
          onClose={() => setDetachmentOpen(false)}
        />
      )}
    </section>
  );
}
