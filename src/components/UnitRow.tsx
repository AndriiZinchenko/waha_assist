import { forwardRef } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { getUnitLiveTotal } from "../lib/loadouts";
import { Chevron } from "./Collapsible";
import { EditedTag } from "./EditedTag";
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
  const isDestroyed = liveCount === 0;
  const isAllied = unit.keywords.includes("Allied Units");

  return (
    <li ref={ref} style={{ borderBottom: "1px solid var(--rule-soft)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`relative w-full min-h-[54px] flex items-center gap-[10px] pr-[14px] py-[6px] text-left ${indent ? "pl-[40px]" : "pl-[14px]"}`}
        style={{
          background: expanded ? "var(--paper-sunk)" : undefined,
          boxShadow: expanded ? "inset 3px 0 0 var(--accent)" : undefined,
          opacity: isDestroyed && !expanded ? 0.45 : undefined,
        }}
      >
        {indent && <LeaderConnector />}
        <Chevron open={expanded} />
        {number !== undefined && (
          <span
            className="mono shrink-0 w-[30px] h-[30px] rounded-[var(--r-control)] flex items-center justify-center text-[15px] font-bold"
            style={{ border: "1.5px solid var(--accent)", color: "var(--accent)" }}
          >
            {number}
          </span>
        )}
        <span className="flex-1 min-w-0 flex flex-wrap items-center gap-x-[8px] gap-y-[2px]">
          <span
            className="text-[17px] leading-[1.2]"
            style={{
              fontWeight: expanded ? 700 : 600,
              textDecoration: isDestroyed ? "line-through" : undefined,
            }}
          >
            {unit.name}
            {unit.isWarlord && <span style={{ color: "var(--accent)" }}> ★</span>}
          </span>
          {isAllied && unit.faction && (
            <span
              className="display text-[10px] font-bold uppercase tracking-[0.12em] px-[5px] py-[1px] rounded-[var(--r-tag)]"
              style={{ border: "1px solid var(--ink-off)", color: "var(--ink-2)" }}
            >
              {unit.faction}
            </span>
          )}
          {unit.weaponsEdited && <EditedTag />}
        </span>
        <span className="mono text-[16px] font-semibold shrink-0">
          <span style={{ color: isCasualty ? "var(--negative)" : "var(--ink)" }}>
            {liveCount}
          </span>
          <span style={{ color: "var(--ink-soft)" }}>/{unit.modelCount}</span>
        </span>
      </button>
      <div className="expand-body" data-open={expanded}>
        <div>
          <UnitDetails
            unit={unit}
            counts={counts}
            onCountChange={onCountChange}
            detachmentData={detachmentData}
          />
        </div>
      </div>
    </li>
  );
});

/** The └ joining a bodyguard unit to the leader row above it. */
function LeaderConnector() {
  return (
    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[40px]">
      <span
        className="absolute left-[20px] top-0 h-1/2"
        style={{ width: 1.5, background: "var(--ink-off)" }}
      />
      <span
        className="absolute left-[20px] top-1/2 w-[11px]"
        style={{ height: 1.5, background: "var(--ink-off)" }}
      />
    </span>
  );
}
