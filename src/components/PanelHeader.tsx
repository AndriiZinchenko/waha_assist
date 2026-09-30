import type { ParsedArmy } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import type { Side } from "./ArmyPanel";
import { SideMark } from "./SideMark";

interface PanelHeaderProps {
  side: Side;
  army: ParsedArmy;
  /** Points to display — the live total of visible units when some are
   * hidden, otherwise the roster's own recorded total. */
  points: number | null;
  /** The detachment in play, which may differ from the roster's. */
  detachment: string | null;
  detachmentData: DetachmentData | null;
  onOpenDetachment: () => void;
}

/**
 * Army title, detachment link and points. On phones the side switcher
 * above already carries the side, so this stays plain and scrolls away
 * with the list; ≥900px it is the side's banner — fill, top rail and mark
 * at the outer edge (A left, B right) — and sticks to the top.
 */
export function PanelHeader({
  side,
  army,
  points,
  detachment,
  detachmentData,
  onOpenDetachment,
}: PanelHeaderProps) {
  const label = detachment ?? army.name;

  return (
    <header
      className={`panel-header px-[16px] pt-[14px] pb-[10px] min-[900px]:sticky min-[900px]:top-0 min-[900px]:z-10 flex gap-[12px] ${side === "b" ? "min-[900px]:flex-row-reverse" : ""}`}
      style={{ borderBottom: "1px solid var(--rule)" }}
    >
      <SideMark side={side} size={16} className="hidden min-[900px]:block mt-[5px]" />
      <div className="flex-1 min-w-0">
        <h2 className="display font-bold text-[21px] leading-[1.15] m-0">{army.catalogue}</h2>
        <div className="flex items-center justify-between gap-[12px] mt-[2px]">
          {detachmentData ? (
            <button
              type="button"
              onClick={onOpenDetachment}
              className="min-h-[44px] min-w-0 text-left text-[15px] font-semibold"
              style={{ color: "var(--ink-2)" }}
            >
              <span className="has-rule">{label}</span> ›
            </button>
          ) : (
            <span className="min-h-[44px] flex items-center text-[15px] font-semibold" style={{ color: "var(--ink-2)" }}>
              {label}
            </span>
          )}
          <span className="mono shrink-0">
            <span className="text-[18px] font-semibold">{points ?? "—"}</span>
            <span className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
              pts
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
