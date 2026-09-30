import type { Lang } from "../lib/i18n";

interface LangToggleProps {
  lang: Lang;
  onChange: (next: Lang) => void;
}

const OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "EN" },
  { value: "uk", label: "UA" },
];

/** EN | UA segmented control; the selected half is inverted. */
export function LangToggle({ lang, onChange }: LangToggleProps) {
  return (
    <span
      role="group"
      aria-label="Language"
      className="flex h-[46px] shrink-0 rounded-[var(--r-control)] overflow-hidden"
      style={{ border: "1px solid var(--rule)" }}
    >
      {OPTIONS.map((option, i) => {
        const isActive = lang === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`display w-[48px] text-[15px] font-extrabold tracking-[0.08em] ${isActive ? "selected" : ""}`}
            style={{
              color: isActive ? undefined : "var(--ink-2)",
              borderLeft: i > 0 ? "1px solid var(--rule)" : undefined,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}
