import { forwardRef } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { getUnitLiveTotal } from "../lib/loadouts";
import { UnitDetails } from "./UnitDetails";

interface UnitRowProps {
  unit: ParsedUnit;
  expanded: boolean;
  onToggle: () => void;
  counts: Record<string, number>;
  onCountChange: (key: string, next: number) => void;
  detachmentData: DetachmentData | null;
  /** Nests this row under the leader unit directly above it — a unit with
   * a leader attached (see leaders.ts `groupUnitsByLeader`), not a
   * standalone list entry. */
  indent?: boolean;
  /** The unit's position in the list, shown as a badge while voice mode is
   * on so "3 against 7" can be read straight off the screen. */
  number?: number;
}

export const UnitRow = forwardRef<HTMLLIElement, UnitRowProps>(function UnitRow(
  {
    unit,
    expanded,
    onToggle,
    counts,
    onCountChange,
    detachmentData,
    indent = false,
    number,
  },
  ref,
) {
  const liveCount = getUnitLiveTotal(counts, unit.id, unit);
  const isCasualty = liveCount < unit.modelCount;
  const isAllied = unit.keywords.includes("Allied Units");

  return (
    <li
      ref={ref}
      className="border-b border-[var(--rule)]"
      style={{ background: indent ? "var(--paper-sunk)" : undefined }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full h-[48px] flex items-center justify-between ${indent ? "pl-9 pr-4" : "px-4"}`}
        style={{ background: expanded ? "var(--panel)" : undefined }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block transition-transform duration-150 shrink-0"
            style={{
              color: expanded ? "var(--accent)" : "var(--ink-soft)",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ›
          </span>
          {number !== undefined && (
            <span
              className="mono shrink-0 min-w-[26px] h-[22px] px-1.5 rounded-[5px] flex items-center justify-center text-[13px] font-semibold"
              style={{
                background: "var(--accent)",
                color: "var(--ink)",
              }}
            >
              {number}
            </span>
          )}
          <span className="truncate">
            {unit.name}
            {unit.isWarlord ? " ★" : ""}
          </span>
          {isAllied && unit.faction && (
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.04em] px-1.5 py-[1px] rounded-[4px] shrink-0"
              style={{
                background: "var(--accent-wash)",
                color: "var(--accent-heading)",
                border: "1px solid var(--accent)",
              }}
            >
              {unit.faction}
            </span>
          )}
        </span>
        <span className="mono text-[16.5px]">
          <span style={{ color: isCasualty ? "var(--warn)" : undefined }}>
            {liveCount}
          </span>
          /{unit.modelCount}
        </span>
      </button>
      <div className="expand-body" data-open={expanded}>
        <div>
          <div className="mx-4 mb-4">
            <UnitDetails
              unit={unit}
              counts={counts}
              onCountChange={onCountChange}
              detachmentData={detachmentData}
            />
          </div>
        </div>
      </div>
    </li>
  );
});
