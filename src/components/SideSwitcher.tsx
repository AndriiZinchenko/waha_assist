import type { Side } from "./ArmyPanel";

interface SideSwitcherProps {
  active: Side;
  onSelect: (side: Side) => void;
  labelA: string;
  labelB: string;
}

const ACCENT: Record<Side, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
};

export function SideSwitcher({
  active,
  onSelect,
  labelA,
  labelB,
}: SideSwitcherProps) {
  const segments: Array<{ side: Side; label: string }> = [
    { side: "a", label: labelA },
    { side: "b", label: labelB },
  ];

  return (
    <div
      className="min-[900px]:hidden flex border-b border-[var(--rule)]"
      style={{ background: "var(--header-bg)" }}
    >
      {segments.map(({ side, label }) => {
        const isActive = active === side;
        return (
          <button
            key={side}
            type="button"
            onClick={() => onSelect(side)}
            className="flex-1 min-h-[44px] px-3 py-2 text-[14.5px] truncate"
            style={{
              color: isActive ? undefined : "var(--ink-soft)",
              boxShadow: isActive
                ? `inset 0 -3px 0 ${ACCENT[side]}`
                : undefined,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
