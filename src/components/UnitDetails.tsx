import type { ReactNode } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { EditedNotice } from "./EditedTag";
import { ModelCounter } from "./ModelCounter";
import { StatStrip, UnitKeywords } from "./StatStrip";
import { UnitInfo } from "./UnitInfo";
import { PhaseFilterBar } from "./PhaseFilterBar";
import { UnitRules } from "./UnitRules";
import { UnitStratagems } from "./UnitStratagems";
import { WeaponTable } from "./WeaponTable";

interface UnitDetailsProps {
  unit: ParsedUnit;
  counts: Record<string, number>;
  onCountChange: (key: string, next: number) => void;
  detachmentData: DetachmentData | null;
  /** "counter" (battle panels): per-loadout model counters with the weapon
   * tables tucked behind them. "table" (configuration): no counters, one
   * always-visible weapon table for the whole unit. */
  weapons?: "counter" | "table";
  /** Configuration screen only: opens the weapon editor. */
  onEditWeapons?: () => void;
  /** When set, shown in place of the weapon table (the open weapon editor). */
  editor?: ReactNode;
}

/** The expanded body of a unit: stats, keywords, models and weapons, info,
 * rules and stratagems. Shared by the battle panels' unit rows and the
 * army configuration screen so both show the same datasheet. Sits on
 * --panel with a rail in the side colour of the surrounding panel. */
export function UnitDetails({
  unit,
  counts,
  onCountChange,
  detachmentData,
  weapons = "counter",
  onEditWeapons,
  editor,
}: UnitDetailsProps) {
  return (
    <div
      className="flex flex-col"
      style={{ background: "var(--panel)", boxShadow: "inset 3px 0 0 var(--accent)" }}
    >
      <StatStrip unit={unit} />
      <UnitKeywords unit={unit} />
      {unit.weaponsEdited && <EditedNotice unit={unit} />}
      {weapons === "counter" ? (
        <ModelCounter unit={unit} counts={counts} onCountChange={onCountChange} />
      ) : (
        (unit.weapons.length > 0 || editor || onEditWeapons) && (
          <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
            <div className="flex items-center justify-between gap-[10px] px-[14px] pt-[12px] pb-[4px]">
              <span className="caption">Weapons</span>
              {onEditWeapons && !editor && (
                <button
                  type="button"
                  onClick={onEditWeapons}
                  className="min-h-[44px] px-[12px] rounded-[var(--r-control)] text-[15px] font-semibold"
                  style={{ border: "1px solid var(--rule)" }}
                >
                  Edit weapons
                </button>
              )}
            </div>
            {editor ?? <WeaponTable weapons={unit.weapons} />}
          </div>
        )
      )}
      <PhaseFilterBar />
      <UnitInfo unit={unit} />
      <UnitRules unit={unit} />
      <UnitStratagems unit={unit} detachmentData={detachmentData} />
    </div>
  );
}
