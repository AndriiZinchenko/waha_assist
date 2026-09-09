import { useState } from "react";
import type { ArmyEntry } from "../lib/armies";
import { detachmentsForFaction, getDetachmentData } from "../data/detachments";
import { effectiveDetachment } from "../lib/detachment";
import { DetachmentBody } from "./DetachmentBody";
import { ToggleButton } from "./LeaderAssignmentScreen";

interface DetachmentPanelProps {
  army: ArmyEntry;
  detachmentOverrides: Record<string, string>;
  /** `null` goes back to the detachment the roster was built with. */
  onChoose: (armyId: string, detachment: string | null) => void;
}

/** Every detachment the army's faction can field, one expandable row each,
 * with the one in play marked and switchable. */
export function DetachmentPanel({ army, detachmentOverrides, onChoose }: DetachmentPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const rosterName = army.parsed.detachment ?? null;
  const current = effectiveDetachment(army, detachmentOverrides);

  // Everything synced for the faction; failing that, at least the roster's
  // own detachment when its data exists.
  let options = detachmentsForFaction(army.parsed.catalogue);
  if (options.length === 0) {
    const own = getDetachmentData(rosterName);
    if (own) options = [own];
  }

  if (options.length === 0) {
    return (
      <div className="px-4 text-[14.5px] text-[var(--ink-soft)]">
        No detachment data for {army.parsed.catalogue}. Run{" "}
        <code>npm run sync:stratagems</code> to fetch it.
      </div>
    );
  }

  return (
    <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-2 px-4 pb-4">
      {options.map((data) => {
        const selected = data.name === current;
        const fromRoster = data.name === rosterName;
        const open = expanded === data.name;
        return (
          <li
            key={data.name}
            className="rounded-[8px] overflow-hidden shrink-0"
            style={{
              background: "var(--panel)",
              border: `1px solid ${selected ? "var(--positive)" : "var(--rule)"}`,
            }}
          >
            <div className="flex items-center justify-between gap-3 p-3">
              <button
                type="button"
                onClick={() => setExpanded(open ? null : data.name)}
                aria-expanded={open}
                className="flex-1 min-w-0 min-h-[44px] flex items-center gap-2 text-left"
              >
                <span
                  className="inline-block transition-transform duration-150 shrink-0"
                  style={{
                    color: open ? "var(--accent)" : "var(--ink-soft)",
                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ›
                </span>
                <span className="min-w-0">
                  <span className="text-[14.5px] font-semibold truncate block">{data.name}</span>
                  <span className="text-[12.5px] text-[var(--ink-soft)]">
                    {data.rules.map((r) => r.name).join(" · ")}
                    {fromRoster ? " · from roster" : ""}
                  </span>
                </span>
              </button>
              <ToggleButton
                label={selected ? "Selected" : "Select"}
                active={selected}
                onClick={() => onChoose(army.id, fromRoster ? null : data.name)}
              />
            </div>
            <div className="expand-body" data-open={open}>
              <div>
                <div className="px-3 pb-3 flex flex-col gap-4">
                  <DetachmentBody data={data} />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
