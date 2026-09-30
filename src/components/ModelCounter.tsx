import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import {
  getLoadoutLiveCount,
  getLoadoutWeapons,
  labelLoadout,
  loadoutCountKey,
} from "../lib/loadouts";
import { Chevron } from "./Collapsible";
import { Stepper } from "./Stepper";
import { WeaponTable } from "./WeaponTable";

interface ModelCounterProps {
  unit: ParsedUnit;
  counts: Record<string, number>;
  onCountChange: (key: string, next: number) => void;
}

/** MODELS: one row per wargear loadout with a casualty stepper; each row
 * opens the weapon table for that loadout. */
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
    <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
      <div className="caption px-[14px] pt-[12px] pb-[6px]">Models</div>
      {unit.loadouts.map((loadout) => {
        const key = loadoutCountKey(unit.id, loadout.key);
        const live = getLoadoutLiveCount(counts, unit.id, loadout);
        const label =
          unit.loadouts.length <= 1 ? unit.name : labelLoadout(loadout, unit.loadouts);
        // Weapons only: a loadout's wargear list also carries abilities
        // (invulnerable saves and the like), which are noise here.
        const gear = [...new Set(loadout.weapons.map((w) => w.name))].join(", ");
        const isOpen = openLoadouts.has(loadout.key);
        const loadoutWeapons = getLoadoutWeapons(unit, loadout, live);
        const isCasualty = live < loadout.modelCount;

        return (
          <div key={loadout.key} style={{ borderTop: "1px solid var(--rule-soft)" }}>
            <div
              className="min-h-[56px] pl-[14px] pr-[10px] py-[6px] flex items-center gap-[10px]"
              style={{ background: isOpen ? "var(--paper-sunk)" : undefined }}
            >
              <button
                type="button"
                onClick={() => toggleOpen(loadout.key)}
                aria-expanded={isOpen}
                className="flex-1 min-w-0 min-h-[44px] flex items-center gap-[10px] text-left"
              >
                <Chevron open={isOpen} />
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-[1.2]">{label}</span>
                  {gear && gear !== label && (
                    <span
                      className="block text-[13px] leading-[1.3] mt-[2px]"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {gear}
                    </span>
                  )}
                </span>
              </button>
              <Stepper
                value={live}
                valueWidth={38}
                valueColor={isCasualty ? "var(--negative)" : undefined}
                decrementLabel={`Remove a model from ${label}`}
                incrementLabel={`Add a model to ${label}`}
                decrementDisabled={live <= 0}
                incrementDisabled={live >= loadout.modelCount}
                onDecrement={() => onCountChange(key, Math.max(0, live - 1))}
                onIncrement={() => onCountChange(key, Math.min(loadout.modelCount, live + 1))}
              />
              <span
                className="mono font-medium text-[13px] shrink-0 w-[34px]"
                style={{ color: "var(--ink-soft)" }}
              >
                of {loadout.modelCount}
              </span>
            </div>
            <div className="expand-body" data-open={isOpen}>
              <div>
                <div style={{ background: "var(--paper-sunk)" }}>
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
