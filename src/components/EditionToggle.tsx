import { EDITIONS, type Edition } from "../lib/edition";

interface EditionToggleProps {
  edition: Edition;
  /** How many armies each edition has, shown beside its label. */
  counts: Record<Edition, number>;
  onChange: (next: Edition) => void;
}

/** Home screen switch between the 40k editions the armies were built for. */
export function EditionToggle({ edition, counts, onChange }: EditionToggleProps) {
  return (
    <span
      role="group"
      aria-label="Edition"
      className="inline-flex h-[46px] rounded-[var(--r-control)] overflow-hidden"
      style={{ border: "1px solid var(--rule)" }}
    >
      {EDITIONS.map((value, i) => {
        const active = edition === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={`${value}th edition`}
            onClick={() => onChange(value)}
            className={`min-w-[88px] px-[14px] flex items-center justify-center gap-[8px] ${active ? "selected" : ""}`}
            style={{
              color: active ? undefined : "var(--ink-2)",
              borderLeft: i > 0 ? "1px solid var(--rule)" : undefined,
            }}
          >
            <span className="display text-[16px] font-extrabold tracking-[0.08em]">
              {value}th
            </span>
            <span className="mono text-[13px] font-semibold" style={{ opacity: 0.75 }}>
              {counts[value]}
            </span>
          </button>
        );
      })}
    </span>
  );
}
