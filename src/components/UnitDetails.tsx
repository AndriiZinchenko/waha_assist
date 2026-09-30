import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { ModelCounter } from "./ModelCounter";
import { StatStrip, UnitKeywords } from "./StatStrip";
import { UnitInfo } from "./UnitInfo";
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
}: UnitDetailsProps) {
  return (
    <div
      className="flex flex-col"
      style={{ background: "var(--panel)", boxShadow: "inset 3px 0 0 var(--accent)" }}
    >
      <StatStrip unit={unit} />
      <UnitKeywords unit={unit} />
      {weapons === "counter" ? (
        <ModelCounter unit={unit} counts={counts} onCountChange={onCountChange} />
      ) : (
        unit.weapons.length > 0 && (
          <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
            <div className="caption px-[14px] pt-[12px] pb-[4px]">Weapons</div>
            <WeaponTable weapons={unit.weapons} />
          </div>
        )
      )}
      <UnitInfo unit={unit} />
      <UnitRules unit={unit} />
      <UnitStratagems unit={unit} detachmentData={detachmentData} />
    </div>
  );
}
