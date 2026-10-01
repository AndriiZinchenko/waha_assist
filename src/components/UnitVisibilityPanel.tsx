import { useState } from "react";
import type { ParsedArmy, ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { computeVisiblePoints } from "../lib/armyPoints";
import { Chevron } from "./Collapsible";
import type { UnitWeaponOverride } from "../lib/weaponOverrides";
import { EditedTag } from "./EditedTag";
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
  weaponOverrides: Record<string, UnitWeaponOverride>;
  onSetWeaponOverride: (unitId: string, override: UnitWeaponOverride | null) => void;
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
  const fill = limit ? Math.min(1, livePoints / limit) : 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 px-[16px] pb-[12px]">
        <div className="flex items-baseline gap-[6px]">
          <span
            className="mono font-bold text-[28px] leading-none"
            style={{ color: overLimit ? "var(--negative)" : "var(--ink)" }}
          >
            {livePoints}
          </span>
          {limit != null && (
            <span className="mono font-medium text-[18px]" style={{ color: "var(--ink-soft)" }}>
              / {limit}pts
            </span>
          )}
        </div>
        <div className="mt-[8px] h-[6px] w-full" style={{ background: "var(--paper-sunk)" }}>
          <div
            className="h-full"
            style={{
              width: `${fill * 100}%`,
              background: overLimit ? "var(--negative)" : "var(--ink-2)",
            }}
          />
        </div>
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain m-0 p-0 list-none pb-[env(safe-area-inset-bottom)]">
        {units.map((unit) => {
          const hidden = Boolean(hiddenUnitIds[unit.id]);
          const expanded = expandedId === unit.id;
          return (
            <li key={unit.id} style={{ borderTop: "1px solid var(--rule-soft)" }}>
              <div
                className="min-h-[54px] pl-[14px] pr-[12px] py-[5px] flex items-center gap-[10px]"
                style={{
                  background: expanded ? "var(--paper-sunk)" : undefined,
                  boxShadow: expanded ? "inset 3px 0 0 var(--accent)" : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : unit.id)}
                  aria-expanded={expanded}
                  className="flex-1 min-w-0 min-h-[44px] flex items-center gap-[10px] text-left"
                >
                  <Chevron open={expanded} />
                  <span
                    className="flex-1 min-w-0 text-[17px] leading-[1.2]"
                    style={{
                      fontWeight: expanded ? 700 : 600,
                      color: hidden ? "var(--ink-soft)" : undefined,
                      textDecoration: hidden ? "line-through" : undefined,
                    }}
                  >
                    {unit.name}
                    {unit.isWarlord && <span style={{ color: "var(--accent)" }}> ★</span>}
                    {unit.weaponsEdited && <EditedTag className="ml-[8px] align-middle" />}
                  </span>
                  <span
                    className="mono text-[14px] font-semibold shrink-0"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {unit.totalPoints}
                  </span>
                </button>
                <VisibilityToggle hidden={hidden} onClick={() => onToggle(unit.id)} />
              </div>
              <div className="expand-body" data-open={expanded}>
                <div>
                  <UnitDetails
                    unit={unit}
                    counts={counts}
                    onCountChange={onCountChange}
                    detachmentData={detachmentData}
                    weapons="table"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function VisibilityToggle({ hidden, onClick }: { hidden: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!hidden}
      onClick={onClick}
      className="display shrink-0 w-[80px] h-[44px] flex items-center justify-center gap-[6px] rounded-[var(--r-control)] text-[13px] font-bold uppercase tracking-[0.1em]"
      style={{
        border: hidden ? "1px dashed var(--ink-off)" : "1px solid var(--ink-2)",
        color: hidden ? "var(--ink-soft)" : "var(--ink)",
      }}
    >
      {!hidden && (
        <span
          aria-hidden="true"
          className="w-[7px] h-[7px] rounded-full"
          style={{ background: "var(--positive)" }}
        />
      )}
      {hidden ? "Hidden" : "Visible"}
    </button>
  );
}
