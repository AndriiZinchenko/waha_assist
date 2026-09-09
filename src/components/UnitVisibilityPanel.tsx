import { useState } from "react";
import type { ParsedArmy, ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { computeVisiblePoints } from "../lib/armyPoints";
import { ToggleButton } from "./LeaderAssignmentScreen";
import { UnitDetails } from "./UnitDetails";

interface UnitVisibilityPanelProps {
  army: ParsedArmy;
  /** The army's units with leader weapon bonuses applied, so the expanded
   * details match what the battle panels show. Defaults to the raw roster
   * units. */
  units?: ParsedUnit[];
  hiddenUnitIds: Record<string, boolean>;
  onToggle: (unitId: string) => void;
  counts: Record<string, number>;
  onCountChange: (key: string, next: number) => void;
  detachmentData: DetachmentData | null;
}

export function UnitVisibilityPanel({
  army,
  units = army.units,
  hiddenUnitIds,
  onToggle,
  counts,
  onCountChange,
  detachmentData,
}: UnitVisibilityPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const livePoints = computeVisiblePoints(units, hiddenUnitIds);
  const limit = army.pointsLimit;
  const overLimit = limit != null && livePoints > limit;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="shrink-0 mx-4 mb-2 px-3 py-2 rounded-[8px] flex items-center justify-between"
        style={{ background: "var(--inset)", border: "1px solid var(--rule)" }}
      >
        <span className="text-[12.5px] text-[var(--ink-soft)] uppercase tracking-[0.03em]">
          Live total
        </span>
        <span
          className="mono text-[16.5px] font-semibold"
          style={{ color: overLimit ? "var(--warn)" : "var(--positive)" }}
        >
          {livePoints}
          {limit != null && (
            <span className="text-[var(--ink-soft)]"> / {limit}pts</span>
          )}
        </span>
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-2 px-4 pb-4">
        {units.map((unit) => {
          const hidden = Boolean(hiddenUnitIds[unit.id]);
          const expanded = expandedId === unit.id;
          return (
            <li
              key={unit.id}
              className="rounded-[8px] overflow-hidden shrink-0"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--rule)",
                opacity: hidden ? 0.55 : 1,
              }}
            >
              <div className="flex items-center justify-between gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : unit.id)}
                  aria-expanded={expanded}
                  className="flex-1 min-w-0 min-h-[44px] flex items-center gap-2 text-left"
                >
                  <span
                    className="inline-block transition-transform duration-150 shrink-0"
                    style={{
                      color: expanded ? "var(--accent)" : "var(--ink-soft)",
                      transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  >
                    ›
                  </span>
                  <span className="min-w-0">
                    <span className="text-[14.5px] font-semibold truncate block">
                      {unit.name}
                      {unit.isWarlord ? " ★" : ""}
                    </span>
                    <span className="mono text-[12.5px] text-[var(--ink-soft)]">
                      {unit.totalPoints}pts
                    </span>
                  </span>
                </button>
                <ToggleButton
                  label={hidden ? "Hidden" : "Visible"}
                  active={!hidden}
                  onClick={() => onToggle(unit.id)}
                />
              </div>
              <div className="expand-body" data-open={expanded}>
                <div>
                  <div className="px-3 pb-3">
                    <UnitDetails
                      unit={unit}
                      counts={counts}
                      onCountChange={onCountChange}
                      detachmentData={detachmentData}
                      weapons="table"
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
