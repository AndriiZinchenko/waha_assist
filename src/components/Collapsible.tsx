import type { ReactNode } from "react";

/** ▸ / ▾ disclosure glyph used on every expandable row. */
export function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex w-[12px] shrink-0 justify-center text-[12px] leading-none ${className}`}
      style={{ color: "var(--ink-soft)" }}
    >
      {open ? "▾" : "▸"}
    </span>
  );
}

interface CollapsibleSectionProps {
  label: string;
  /** Item count shown next to the label. */
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * INFO / RULES / STRATAGEMS block of a datasheet: 48px header with a top
 * rule, the section label and count, and a bordered +/− at the right.
 */
export function CollapsibleSection({
  label,
  count,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div style={{ borderTop: "1px solid var(--rule)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full min-h-[48px] px-[14px] flex items-center gap-2 text-left"
      >
        <span className="section-label">{label}</span>
        {count !== undefined && (
          <span className="mono text-[13px]" style={{ color: "var(--ink-soft)" }}>
            {count}
          </span>
        )}
        <span
          aria-hidden="true"
          className="mono ml-auto w-[28px] h-[28px] flex items-center justify-center text-[16px] font-bold rounded-[var(--r-control)]"
          style={{ border: "1px solid var(--rule)" }}
        >
          {open ? "−" : "+"}
        </span>
      </button>
      <div className="expand-body" data-open={open}>
        <div>{children}</div>
      </div>
    </div>
  );
}
