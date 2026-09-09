import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import {
  getLoadoutLiveCount,
  getLoadoutWeapons,
  labelLoadout,
  loadoutCountKey,
} from "../lib/loadouts";
import { WeaponTable } from "./WeaponTable";

interface ModelCounterProps {
  unit: ParsedUnit;
  counts: Record<string, number>;
  onCountChange: (key: string, next: number) => void;
}

export function ModelCounter({ unit, counts, onCountChange }: ModelCounterProps) {
  const [openLoadouts, setOpenLoadouts] = useState<Set<string>>(() => new Set());

  if (unit.loadouts.length === 0) return null;

  function toggleOpen(loadoutKey: string) {
    setOpenLoadouts((prev) => {
      const next = new Set(prev);
      if (next.has(loadoutKey)) {
        next.delete(loadoutKey);
      } else {
        next.add(loadoutKey);
      }
      return next;
    });
  }

  return (
    <div>
      <div
        className="text-[12px] font-semibold uppercase tracking-[0.06em] mb-2"
        style={{ color: "var(--accent-heading)" }}
      >
        Models
      </div>
      {unit.loadouts.map((loadout) => {
        const key = loadoutCountKey(unit.id, loadout.key);
        const live = getLoadoutLiveCount(counts, unit.id, loadout);
        const label = labelLoadout(loadout, unit.loadouts);
        const isOpen = openLoadouts.has(loadout.key);
        const loadoutWeapons = getLoadoutWeapons(unit, loadout, live);
        const isCasualty = live < loadout.modelCount;

        return (
          <div
            key={loadout.key}
            className="border-t py-2"
            style={{ borderColor: "var(--rule)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => toggleOpen(loadout.key)}
                className="flex items-center gap-1.5 text-[14.5px]"
              >
                <span
                  className="inline-block transition-transform duration-150"
                  style={{
                    color: isOpen ? "var(--accent)" : "var(--ink-soft)",
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ›
                </span>
                {label}
              </button>
              <span className="mono text-[16.5px] flex items-center gap-2">
                <button
                  type="button"
                  disabled={live <= 0}
                  onClick={() => onCountChange(key, Math.max(0, live - 1))}
                  className="w-[26px] h-[26px] rounded-[5px] disabled:opacity-40"
                  style={{ background: "var(--panel)" }}
                >
                  −
                </button>
                <span
                  className="inline-block w-[1.5em] text-center"
                  style={{ color: isCasualty ? "var(--warn)" : "var(--accent)" }}
                >
                  {live}
                </span>
                <button
                  type="button"
                  disabled={live >= loadout.modelCount}
                  onClick={() =>
                    onCountChange(key, Math.min(loadout.modelCount, live + 1))
                  }
                  className="w-[26px] h-[26px] rounded-[5px] disabled:opacity-40"
                  style={{ background: "var(--panel)" }}
                >
                  +
                </button>
                <span className="text-[var(--ink-soft)]">
                  of {loadout.modelCount}
                </span>
              </span>
            </div>
            <div className="expand-body" data-open={isOpen}>
              <div>
                <div
                  className="mt-2.5 ml-5 rounded-[8px] py-1"
                  style={{ background: "var(--inset)" }}
                >
                  <WeaponTable weapons={loadoutWeapons} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
