import type { ArmyEntry } from "../lib/armies";
import { canStart, type ArmySelection, type Slot } from "../lib/armySetup";
import { effectiveDetachment } from "../lib/detachment";

interface ArmySetupScreenProps {
  armies: ArmyEntry[];
  selection: ArmySelection;
  detachmentOverrides: Record<string, string>;
  /** Put `armyId` on `slot`, or clear the slot if it already holds it. */
  onAssign: (slot: Slot, armyId: string) => void;
  onStart: () => void;
  onConfigure: (armyId: string) => void;
}

const ACCENT: Record<Slot, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
};

const SLOTS: Slot[] = ["a", "b"];

export function ArmySetupScreen({
  armies,
  selection,
  detachmentOverrides,
  onAssign,
  onStart,
  onConfigure,
}: ArmySetupScreenProps) {
  if (armies.length === 0) {
    return (
      <div className="p-4 text-[14.5px] text-[var(--ink-soft)]">
        No armies found. Add a New Recruit JSON export to the{" "}
        <code>armies/</code> folder.
      </div>
    );
  }

  const ready = canStart(selection);

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-[920px] w-full mx-auto">
      <div className="shrink-0 px-4 py-3 text-[14.5px] text-[var(--ink-soft)]">
        Tap an army to configure it. Use A | B to assign it to a side.
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-2 px-4">
        {armies.map((army) => {
          const onA = selection.a === army.id;
          const onB = selection.b === army.id;
          // Left-edge stripe: A's colour wins when the army sits on both sides.
          const stripe = onA ? ACCENT.a : onB ? ACCENT.b : "transparent";

          return (
            <li
              key={army.id}
              className="flex items-center rounded-[8px] overflow-hidden"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--rule)",
              }}
            >
              <button
                type="button"
                onClick={() => onConfigure(army.id)}
                aria-label={`Configure ${army.parsed.catalogue}`}
                className="flex-1 min-w-0 min-h-[44px] text-left flex items-center"
              >
                <span
                  className="self-stretch w-1 shrink-0"
                  style={{ background: stripe }}
                />
                <span className="flex-1 px-4 py-4 flex items-center justify-between gap-3 min-w-0">
                  <span className="min-w-0">
                    <span className="display block text-[19.5px] font-semibold">
                      {army.parsed.catalogue}
                    </span>
                    <span className="block text-[14.5px] text-[var(--ink-soft)] mt-0.5">
                      {[effectiveDetachment(army, detachmentOverrides), army.parsed.name]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="mono text-[16.5px] shrink-0">
                    {army.parsed.pointsTotal ?? "—"}pts
                  </span>
                </span>
              </button>
              <div
                role="group"
                aria-label={`Side for ${army.parsed.catalogue}`}
                className="self-stretch flex items-stretch shrink-0"
                style={{ borderLeft: "1px solid var(--rule)" }}
              >
                {SLOTS.map((slot) => {
                  const active = selection[slot] === army.id;
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Side ${slot.toUpperCase()}`}
                      onClick={() => onAssign(slot, army.id)}
                      className="mono min-w-[44px] flex items-center justify-center text-[16.5px] font-bold"
                      style={{
                        background: active ? ACCENT[slot] : "transparent",
                        color: active ? "var(--paper)" : "var(--ink-soft)",
                        borderLeft: slot === "b" ? "1px solid var(--rule)" : undefined,
                      }}
                    >
                      {slot.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="shrink-0 p-4">
        <button
          type="button"
          disabled={!ready}
          onClick={onStart}
          className="w-full min-h-[52px] rounded-[9px] text-[16.5px] font-semibold disabled:cursor-not-allowed"
          style={{
            background: ready ? "var(--side-a-fill)" : "var(--panel)",
            color: ready ? "var(--paper)" : "var(--ink-soft)",
          }}
        >
          Start
        </button>
      </div>
    </div>
  );
}
