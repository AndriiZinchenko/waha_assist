import { useState } from "react";
import type { ArmyEntry } from "../lib/armies";
import { detachmentsForFaction, getDetachmentData } from "../data/detachments";
import { effectiveDetachment } from "../lib/detachment";
import { useUi } from "../lib/uiStrings";
import { Chevron } from "./Collapsible";
import { DetachmentBody } from "./DetachmentBody";

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
  const ui = useUi();
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
      <div className="px-[16px]">
        <div
          className="p-[20px] rounded-[var(--r-control)] text-[16px] font-medium"
          style={{ background: "var(--panel)", border: "1px dashed var(--rule)", color: "var(--ink-2)" }}
        >
          No detachment data for {army.parsed.catalogue}. Run <code>npm run sync:stratagems</code> to
          fetch it.
        </div>
      </div>
    );
  }

  return (
    <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain m-0 p-0 list-none pb-[env(safe-area-inset-bottom)]">
      {options.map((data) => {
        const selected = data.name === current;
        const fromRoster = data.name === rosterName;
        const open = expanded === data.name;
        return (
          <li key={data.name} style={{ borderTop: "1px solid var(--rule-soft)" }}>
            <div
              className="min-h-[56px] pl-[14px] pr-[12px] py-[6px] flex items-center gap-[10px]"
              style={{
                background: open ? "var(--paper-sunk)" : undefined,
                boxShadow: selected ? "inset 3px 0 0 var(--accent)" : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? null : data.name)}
                aria-expanded={open}
                className="flex-1 min-w-0 min-h-[44px] flex items-center gap-[10px] text-left"
              >
                <Chevron open={open} />
                <span className="min-w-0">
                  {fromRoster && (
                    <span className="caption caption-sm block mb-[2px]">{ui("det.roster")}</span>
                  )}
                  <span className="block text-[17px] leading-[1.2]" style={{ fontWeight: open ? 700 : 600 }}>
                    {data.name}
                  </span>
                  <span className="block text-[13px] mt-[2px]" style={{ color: "var(--ink-soft)" }}>
                    {data.rules.map((r) => r.name).join(" · ")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChoose(army.id, fromRoster ? null : data.name)}
                className={`display shrink-0 w-[92px] h-[44px] rounded-[var(--r-control)] text-[13px] font-bold uppercase tracking-[0.1em] ${selected ? "selected" : ""}`}
                style={{
                  border: `1px solid ${selected ? "var(--ink)" : "var(--rule)"}`,
                  color: selected ? undefined : "var(--ink-2)",
                }}
              >
                {selected ? "✓ Selected" : "Select"}
              </button>
            </div>
            <div className="expand-body" data-open={open}>
              <div>
                <div className="pl-[36px] pr-[14px] py-[14px] flex flex-col gap-[14px]" style={{ background: "var(--panel)" }}>
                  <DetachmentBody data={data} compact />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
