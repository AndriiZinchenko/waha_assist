import { useEffect } from "react";
import type { DetachmentData } from "../data/detachments";
import { useUi } from "../lib/uiStrings";
import type { Side } from "./ArmyPanel";
import { DetachmentBody } from "./DetachmentBody";
import { SideMark } from "./SideMark";

interface DetachmentModalProps {
  side: Side;
  data: DetachmentData;
  onClose: () => void;
}

/** Bottom sheet with the detachment's rules and stratagems, opened from
 * the panel header. Tap the scrim or ✕ to close. */
export function DetachmentModal({ side, data, onClose }: DetachmentModalProps) {
  const ui = useUi();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`side-${side} fixed inset-0 z-50 flex flex-col items-center pt-[150px] min-[900px]:pt-[80px]`}
      style={{ background: "var(--scrim)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={data.name}
        className="flex-1 min-h-0 w-full max-w-[720px] flex flex-col rounded-t-[var(--r-sheet)] overflow-hidden"
        style={{ background: "var(--panel)", borderTop: "3px solid var(--accent)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="shrink-0 pl-[16px] pr-[8px] pt-[14px] pb-[12px] flex items-start gap-[12px]"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          <div className="flex-1 min-w-0">
            <div className="caption flex items-center gap-[6px]" style={{ color: "var(--accent)" }}>
              <SideMark side={side} size={10} />
              Detachment · {ui("side")} {side.toUpperCase()}
            </div>
            <h2 className="display font-extrabold text-[26px] leading-[1.05] uppercase tracking-[0.01em] m-0 mt-[4px]">
              {data.name}
            </h2>
            <div className="text-[14px] font-medium mt-[3px]" style={{ color: "var(--ink-2)" }}>
              {data.faction}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-[44px] h-[44px] flex items-center justify-center rounded-[var(--r-control)] text-[20px]"
            style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-[14px] pt-[14px] pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-[18px]">
          <DetachmentBody data={data} showCore />
        </div>
      </div>
    </div>
  );
}
