export type SyncStatusValue = "synced" | "offline" | "pending" | "conflict";

const LABELS: Record<SyncStatusValue, { dot: string; title: string }> = {
  synced: { dot: "var(--positive)", title: "Config synced with the server" },
  pending: { dot: "var(--boost)", title: "Local changes not yet on the server" },
  offline: {
    dot: "var(--ink-soft)",
    title: "Server unreachable — changes stay on this device",
  },
  conflict: { dot: "var(--negative)", title: "Config differs from the server" },
};

export function SyncStatus({ status }: { status: SyncStatusValue }) {
  const { dot, title } = LABELS[status];
  return (
    <span
      title={title}
      aria-label={title}
      className="flex items-center justify-center rounded-[7px] min-h-[44px] min-w-[24px]"
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: dot }} />
    </span>
  );
}
