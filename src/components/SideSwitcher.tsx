import { useUi } from "../lib/uiStrings";
import type { Side } from "./ArmyPanel";
import { SideMark } from "./SideMark";

interface SideSwitcherProps {
  active: Side;
  onSelect: (side: Side) => void;
  labelA: string;
  labelB: string;
  /** Whether each side has a unit open (it feeds the calculator). */
  openA: boolean;
  openB: boolean;
}

/** "Chaos - Chaos Space Marines" -> "Chaos Space Marines". */
function shortName(catalogue: string): string {
  const parts = catalogue.split(" - ");
  return parts[parts.length - 1];
}

/** Phone-only A | B switch. A reads left-to-right, B is mirrored. */
export function SideSwitcher({
  active,
  onSelect,
  labelA,
  labelB,
  openA,
  openB,
}: SideSwitcherProps) {
  const ui = useUi();
  const segments: Array<{ side: Side; label: string; open: boolean }> = [
    { side: "a", label: labelA, open: openA },
    { side: "b", label: labelB, open: openB },
  ];

  return (
    <div className="min-[900px]:hidden shrink-0 flex" style={{ borderBottom: "1px solid var(--rule)" }}>
      {segments.map(({ side, label, open }) => {
        const isActive = active === side;
        return (
          <button
            key={side}
            type="button"
            onClick={() => onSelect(side)}
            aria-pressed={isActive}
            className={`side-${side} flex-1 min-w-0 min-h-[56px] px-[12px] flex items-center gap-[10px] ${side === "b" ? "flex-row-reverse text-right" : "text-left"}`}
            style={{
              background: isActive ? "var(--accent-fill)" : undefined,
              boxShadow: isActive ? "inset 0 -3px 0 var(--accent)" : undefined,
            }}
          >
            <SideMark side={side} size={14} />
            <span className="min-w-0 flex flex-col">
              <span className="caption caption-sm" style={{ color: "var(--accent)" }}>
                {ui("side")} {side.toUpperCase()}
                {open ? ` · 1 ${ui("open")}` : ""}
              </span>
              <span
                className="display font-bold text-[17px] leading-[1.15] truncate"
                style={{ color: isActive ? "var(--ink)" : "var(--ink-2)" }}
              >
                {shortName(label)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
