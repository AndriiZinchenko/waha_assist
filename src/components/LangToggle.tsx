import type { Lang } from "../lib/i18n";

interface LangToggleProps {
  lang: Lang;
  onChange: (next: Lang) => void;
}

const OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "EN" },
  { value: "uk", label: "UA" },
];

export function LangToggle({ lang, onChange }: LangToggleProps) {
  return (
    <span
      className="flex rounded-[7px] p-[3px]"
      style={{ background: "var(--panel)" }}
    >
      {OPTIONS.map((option) => {
        const isActive = lang === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className="min-w-[36px] min-h-[36px] px-2 rounded-[5px] text-[12.5px] font-semibold"
            style={{
              color: isActive ? "var(--ink)" : "var(--ink-soft)",
              background: isActive ? "var(--paper-sunk)" : undefined,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}
