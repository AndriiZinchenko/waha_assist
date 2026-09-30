import type { Side } from "./ArmyPanel";

interface SideMarkProps {
  side: Side;
  /** Edge length in px. The diamond is drawn in the same box. */
  size?: number;
  className?: string;
}

/**
 * The shape half of a side's identity: a square for A, a diamond for B,
 * filled with the side colour. Shown next to every side-tied name so the
 * side never rests on colour alone.
 */
export function SideMark({ side, size = 12, className = "" }: SideMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: side === "a" ? "var(--side-a)" : "var(--side-b)",
        clipPath: side === "a" ? "var(--mark-a)" : "var(--mark-b)",
      }}
    />
  );
}
