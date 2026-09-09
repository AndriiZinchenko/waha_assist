import type { ParsedArmy } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";

interface PanelHeaderProps {
  army: ParsedArmy;
  /** Points to display — the live total of visible units when some are
   * hidden, otherwise the roster's own recorded total. */
  points: number | null;
  /** The detachment in play, which may differ from the roster's. */
  detachment: string | null;
  detachmentData: DetachmentData | null;
  onOpenDetachment: () => void;
}

export function PanelHeader({
  army,
  points,
  detachment,
  detachmentData,
  onOpenDetachment,
}: PanelHeaderProps) {
  const detachmentLabel = [detachment, army.name].filter(Boolean).join(" · ");

  return (
    <header
      className="sticky top-0 shrink-0 px-4 py-1.5 flex items-baseline justify-between gap-2 border-b border-[var(--rule)]"
      style={{ background: "var(--accent-wash)" }}
    >
      <span className="flex items-baseline gap-2 min-w-0">
        <span
          className="display text-[14.5px] font-semibold truncate"
          style={{ color: "var(--accent-heading)" }}
        >
          {army.catalogue}
        </span>
        {detachmentData ? (
          <button
            type="button"
            onClick={onOpenDetachment}
            className="text-[11.5px] text-[var(--ink-soft)] uppercase tracking-[0.03em] truncate underline decoration-dotted underline-offset-2"
          >
            {detachmentLabel}
          </button>
        ) : (
          <span className="text-[11.5px] text-[var(--ink-soft)] uppercase tracking-[0.03em] truncate">
            {detachmentLabel}
          </span>
        )}
      </span>
      <span className="mono text-[12.5px] text-[var(--ink-soft)] shrink-0">
        {points ?? "—"}pts
      </span>
    </header>
  );
}
