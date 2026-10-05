import { useState, type ReactNode } from "react";
import { usePhaseFilter } from "../lib/phaseFilter";
import { PHASE_NAMES, type Phase } from "../lib/phases";
import { useUi } from "../lib/uiStrings";

const smallButton =
  "min-h-[44px] px-[12px] rounded-[var(--r-control)] text-[15px] font-semibold shrink-0";

/**
 * Above Info on a battle-screen datasheet: says what the stratagems,
 * abilities and rules below are filtered to, and switches the filter off
 * (one setting for every unit). Renders nothing outside the battle screen.
 */
export function PhaseFilterBar() {
  const { phase, showAll, setShowAll } = usePhaseFilter();
  const ui = useUi();
  if (phase === null) return null;
  return (
    <div
      className="px-[14px] py-[4px] flex items-center justify-between gap-[10px]"
      style={{ borderTop: "1px solid var(--rule)" }}
    >
      <span className="caption">
        {showAll ? ui("phase.showingAll") : ui("phase.filtered", { phase: PHASE_NAMES[phase] })}
      </span>
      <button
        type="button"
        aria-pressed={showAll}
        onClick={() => setShowAll(!showAll)}
        className={smallButton}
        style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
      >
        {showAll ? ui("phase.filterByPhase") : ui("phase.showAll")}
      </button>
    </div>
  );
}

/** Marks an ability or rule that names the phase being played. */
export function PhaseTag({ phase }: { phase: Phase }) {
  return (
    <span
      className="display text-[10px] font-bold uppercase tracking-[0.12em] px-[5px] py-[1px] rounded-[var(--r-tag)]"
      style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
    >
      {PHASE_NAMES[phase]}
    </span>
  );
}

/** The collapsed group holding what did not match the phase. */
export function PhaseFold({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ui = useUi();
  return (
    <div className="flex flex-col gap-[12px]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${smallButton} self-start`}
        style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
      >
        {open ? "▾ " : "▸ "}
        {ui("phase.other", { n: String(count) })}
      </button>
      {open && children}
    </div>
  );
}
