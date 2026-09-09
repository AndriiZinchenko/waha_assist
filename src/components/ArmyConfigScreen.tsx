import { useState } from "react";
import type { ArmyEntry } from "../lib/armies";
import { getDetachmentData } from "../data/detachments";
import { effectiveDetachment } from "../lib/detachment";
import { applyLeaderWeaponBonuses } from "../lib/leaderEffects";
import { DetachmentPanel } from "./DetachmentPanel";
import { LeaderAssignmentPanel } from "./LeaderAssignmentScreen";
import { UnitVisibilityPanel } from "./UnitVisibilityPanel";

type Tab = "leaders" | "units" | "detachment";

interface ArmyConfigScreenProps {
  army: ArmyEntry;
  leaderAssignments: Record<string, string>;
  onAssignLeader: (leaderId: string, targetId: string | null) => void;
  hiddenUnitIds: Record<string, boolean>;
  onToggleHidden: (unitId: string) => void;
  counts: Record<string, number>;
  onCountChange: (key: string, next: number) => void;
  detachmentOverrides: Record<string, string>;
  onChooseDetachment: (armyId: string, detachment: string | null) => void;
  onBack: () => void;
}

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  leaders: "Assign leaders to the units they attach to.",
  units: "Expand a unit for its full datasheet. Hide units to trim the list down to a smaller points limit.",
  detachment:
    "Expand a detachment for its rules and stratagems. Select one to play with it instead of the roster's.",
};

export function ArmyConfigScreen({
  army,
  leaderAssignments,
  onAssignLeader,
  hiddenUnitIds,
  onToggleHidden,
  counts,
  onCountChange,
  detachmentOverrides,
  onChooseDetachment,
  onBack,
}: ArmyConfigScreenProps) {
  const [tab, setTab] = useState<Tab>("units");
  const detachmentData = getDetachmentData(effectiveDetachment(army, detachmentOverrides));
  // Same transform the battle panels apply, so the expanded details match.
  const units = applyLeaderWeaponBonuses(army.parsed.units, leaderAssignments);

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-[920px] w-full mx-auto">
      <div className="shrink-0 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3 rounded-[7px] text-[14.5px] font-semibold shrink-0"
          style={{ color: "var(--ink-soft)" }}
        >
          ‹ Back
        </button>
        <div className="display text-[16.5px] font-semibold truncate min-w-0">
          {army.parsed.catalogue}
        </div>
      </div>

      <div className="shrink-0 flex gap-1.5 px-4">
        <TabButton
          label="Units"
          active={tab === "units"}
          onClick={() => setTab("units")}
        />
        <TabButton
          label="Leaders"
          active={tab === "leaders"}
          onClick={() => setTab("leaders")}
        />
        <TabButton
          label="Detachment"
          active={tab === "detachment"}
          onClick={() => setTab("detachment")}
        />
      </div>
      <div className="shrink-0 px-4 pt-1.5 pb-3 text-[12.5px] text-[var(--ink-soft)]">
        {TAB_DESCRIPTIONS[tab]}
      </div>

      {tab === "leaders" ? (
        <LeaderAssignmentPanel
          units={army.parsed.units}
          assignments={leaderAssignments}
          onAssign={onAssignLeader}
        />
      ) : tab === "detachment" ? (
        <DetachmentPanel
          army={army}
          detachmentOverrides={detachmentOverrides}
          onChoose={onChooseDetachment}
        />
      ) : (
        <UnitVisibilityPanel
          army={army.parsed}
          units={units}
          hiddenUnitIds={hiddenUnitIds}
          onToggle={onToggleHidden}
          counts={counts}
          onCountChange={onCountChange}
          detachmentData={detachmentData}
        />
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[36px] px-4 rounded-[7px] text-[13px] font-semibold"
      style={{
        background: active ? "var(--panel)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-soft)",
        border: `1px solid ${active ? "var(--rule)" : "transparent"}`,
      }}
    >
      {label}
    </button>
  );
}
