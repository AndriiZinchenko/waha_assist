import type { CSSProperties } from "react";

export type SyncStatusValue = "synced" | "offline" | "pending" | "conflict";

const LABELS: Record<SyncStatusValue, { short: string; title: string }> = {
  synced: { short: "Synced", title: "Config synced with the server" },
  pending: { short: "Pending", title: "Local changes not yet on the server" },
  offline: { short: "Offline", title: "Server unreachable — changes stay on this device" },
  conflict: { short: "Conflict", title: "Config differs from the server" },
};

/** The dot's shape carries the state too, so it reads in greyscale. */
const DOT: Record<SyncStatusValue, CSSProperties> = {
  synced: { background: "var(--positive)", borderRadius: "50%" },
  pending: {
    borderRadius: "50%",
    border: "2px solid var(--ink)",
    background: "linear-gradient(90deg, var(--ink) 50%, transparent 50%)",
  },
  offline: { borderRadius: "50%", border: "2px dashed var(--ink-soft)" },
  conflict: {
    background: "var(--negative)",
    clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
  },
};

interface SyncStatusProps {
  status: SyncStatusValue;
}

/** Sync dot; ≥900px its state name sits beside it. */
export function SyncStatus({ status }: SyncStatusProps) {
  const { short, title } = LABELS[status];
  return (
    <span
      role="status"
      title={title}
      aria-label={title}
      className="flex items-center gap-[7px] min-h-[44px] min-w-[24px] justify-center"
    >
      <span aria-hidden="true" className="inline-block w-[11px] h-[11px] shrink-0 box-border" style={DOT[status]} />
      <span className="caption hidden min-[900px]:inline" style={{ color: "var(--ink-2)" }}>
        {short}
      </span>
    </span>
  );
}
