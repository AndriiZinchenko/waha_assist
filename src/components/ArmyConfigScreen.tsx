import { useState } from "react";
import type { ArmyEntry } from "../lib/armies";
import { getDetachmentData } from "../data/detachments";
import { effectiveDetachment } from "../lib/detachment";
import { applyLeaderWeaponBonuses } from "../lib/leaderEffects";
import { useUi } from "../lib/uiStrings";
import type { Side } from "./ArmyPanel";
import { DetachmentPanel } from "./DetachmentPanel";
import { LeaderAssignmentPanel } from "./LeaderAssignmentScreen";
import { SideMark } from "./SideMark";
import { UnitVisibilityPanel } from "./UnitVisibilityPanel";

type Tab = "units" | "leaders" | "detachment";

interface ArmyConfigScreenProps {
  army: ArmyEntry;
  /** The side this army is assigned to on the army list, if any. */
  side: Side | null;
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

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "units", label: "Units" },
  { id: "leaders", label: "Leaders" },
  { id: "detachment", label: "Detachment" },
];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  leaders: "Assign leaders to the units they attach to.",
  units: "Expand a unit for its full datasheet. Hide units to trim the list down to a smaller points limit.",
  detachment:
    "Expand a detachment for its rules and stratagems. Select one to play with it instead of the roster's.",
};

export function ArmyConfigScreen({
  army,
  side,
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
  const ui = useUi();
  const detachmentData = getDetachmentData(effectiveDetachment(army, detachmentOverrides));
  // Same transform the battle panels apply, so the expanded details match.
  const units = applyLeaderWeaponBonuses(army.parsed.units, leaderAssignments);

  return (
    <div
      className={`${side ? `side-${side}` : ""} flex flex-col flex-1 min-h-0 max-w-[920px] w-full mx-auto`}
    >
      <div
        className="shrink-0 px-[16px] pt-[8px] pb-[12px]"
        style={{ boxShadow: side ? "inset 0 3px 0 var(--accent)" : undefined }}
      >
        <button
          type="button"
          onClick={onBack}
          className="display min-h-[44px] -ml-[6px] px-[6px] flex items-center gap-[6px] text-[16px] font-bold"
          style={{ color: "var(--ink-2)" }}
        >
          <span aria-hidden="true" className="text-[20px] leading-none">
            ‹
          </span>
          Back
        </button>
        {side && (
          <div className="caption flex items-center gap-[6px] mb-[4px]" style={{ color: "var(--accent)" }}>
            <SideMark side={side} size={10} />
            {ui("side")} {side.toUpperCase()}
          </div>
        )}
        <h1 className="display font-bold text-[21px] leading-[1.15] m-0">{army.parsed.catalogue}</h1>
        <div
          role="tablist"
          className="mt-[12px] grid grid-cols-3 h-[46px] rounded-[var(--r-control)] overflow-hidden"
          style={{ border: "1px solid var(--rule)" }}
        >
          {TABS.map((t, i) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`display min-w-0 text-[14px] font-extrabold uppercase tracking-[0.1em] truncate px-[4px] ${active ? "selected" : ""}`}
                style={{
                  color: active ? undefined : "var(--ink-2)",
                  borderLeft: i > 0 ? "1px solid var(--rule)" : undefined,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="hint m-0 mt-[10px]">{TAB_DESCRIPTIONS[tab]}</p>
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
