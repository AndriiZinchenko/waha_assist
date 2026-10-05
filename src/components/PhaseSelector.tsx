import type { ReactNode } from "react";
import { PHASES, PHASE_NAMES, type Phase } from "../lib/phases";

interface PhaseSelectorProps {
  phase: Phase;
  onChange: (next: Phase) => void;
}

/**
 * Header switch for the phase being played, five icons with no text (the
 * phase name is each button's label and tooltip). It stays where it is while
 * different unit pairs are compared, so a whole phase runs on one tap.
 */
export function PhaseSelector({ phase, onChange }: PhaseSelectorProps) {
  return (
    <span
      role="group"
      aria-label="Phase"
      className="flex h-[46px] shrink-0 rounded-[var(--r-control)] overflow-hidden"
      style={{ border: "1px solid var(--rule)" }}
    >
      {PHASES.map((value, i) => {
        const active = phase === value;
        const label = `${PHASE_NAMES[value]} phase`;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(value)}
            className={`min-w-[36px] w-[44px] flex items-center justify-center ${active ? "selected" : ""}`}
            style={{
              color: active ? undefined : "var(--ink-2)",
              borderLeft: i > 0 ? "1px solid var(--rule)" : undefined,
            }}
          >
            {ICONS[value]}
          </button>
        );
      })}
    </span>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<Phase, ReactNode> = {
  // Rank chevrons: the commander's insignia.
  command: (
    <Icon>
      <path d="M5 11l7-6 7 6" />
      <path d="M5 18l7-6 7 6" />
    </Icon>
  ),
  // An arrow with a trail behind it.
  movement: (
    <Icon>
      <path d="M9 12h11" />
      <path d="M15 6l6 6-6 6" />
      <path d="M3 9v6" />
      <path d="M6 10.5v3" />
    </Icon>
  ),
  // Crosshair.
  shooting: (
    <Icon>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </Icon>
  ),
  // Two chevrons driving forward.
  charge: (
    <Icon>
      <path d="M5 5l7 7-7 7" />
      <path d="M13 5l7 7-7 7" />
    </Icon>
  ),
  // Sword, point up.
  fight: (
    <Icon>
      <path d="M12 2.5l2 3v9.5h-4V5.5z" />
      <path d="M7 15h10" />
      <path d="M12 15v4.5" />
      <circle cx="12" cy="20.5" r="1.3" />
    </Icon>
  ),
};
