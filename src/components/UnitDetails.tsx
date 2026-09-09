import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { ModelCounter } from "./ModelCounter";
import { StatStrip } from "./StatStrip";
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

/** The expanded body of a unit: stats, models and weapons, info, rules and
 * stratagems. Shared by the battle panels' unit rows and the army
 * configuration screen so both show the same card. */
export function UnitDetails({
  unit,
  counts,
  onCountChange,
  detachmentData,
  weapons = "counter",
}: UnitDetailsProps) {
  return (
    <div
      className="rounded-[10px] p-4 flex flex-col gap-3.5"
      style={{
        background: "var(--accent-wash)",
        border: "1px solid var(--rule)",
        borderLeft: "3px solid var(--accent)",
      }}
    >
      <StatStrip unit={unit} />
      {weapons === "counter" ? (
        <ModelCounter unit={unit} counts={counts} onCountChange={onCountChange} />
      ) : (
        unit.weapons.length > 0 && (
          <div>
            <div
              className="text-[12px] font-semibold uppercase tracking-[0.06em] mb-2"
              style={{ color: "var(--accent-heading)" }}
            >
              Weapons
            </div>
            <div className="rounded-[8px] py-1" style={{ background: "var(--inset)" }}>
              <WeaponTable weapons={unit.weapons} />
            </div>
          </div>
        )
      )}
      <UnitInfo unit={unit} />
      <UnitRules unit={unit} />
      <UnitStratagems unit={unit} detachmentData={detachmentData} />
    </div>
  );
}
