import type { SyncedState } from "../lib/persistence";

interface SyncConflictModalProps {
  reason: "offline-edits" | "conflict";
  /** What this device holds. */
  local: SyncedState;
  /** What the server holds, when known. */
  server: SyncedState | null;
  onKeepLocal: () => void;
  onUseServer: () => void;
}

const BODY: Record<SyncConflictModalProps["reason"], string> = {
  "offline-edits":
    "This device changed leaders or hidden units while it could not reach the server. Nothing has been sent yet.",
  conflict:
    "This device and the server both changed leaders or hidden units. Keeping one version discards the other.",
};

function summary(data: SyncedState): Array<[string, number]> {
  return [
    ["Leaders attached", Object.keys(data.leaderAssignments ?? {}).length],
    ["Hidden units", Object.keys(data.hiddenUnitIds ?? {}).length],
    ["Detachment picks", Object.keys(data.detachmentOverrides ?? {}).length],
    ["Edited units", Object.keys(data.weaponOverrides ?? {}).length],
  ];
}

export function SyncConflictModal({
  reason,
  local,
  server,
  onKeepLocal,
  onUseServer,
}: SyncConflictModalProps) {
  const columns: Array<{ title: string; data: SyncedState | null }> = [
    { title: "This device", data: local },
    { title: "Server", data: server },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[16px]"
      style={{ background: "var(--scrim)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Sync conflict"
    >
      <div
        className="w-full max-w-[400px] rounded-[var(--r-control)] p-[18px] flex flex-col gap-[14px]"
        style={{ background: "var(--panel)", borderTop: "3px solid var(--negative)" }}
      >
        <h2 className="m-0 flex items-center gap-[10px] display font-extrabold text-[22px] tracking-[0.04em]">
          <span
            aria-hidden="true"
            className="w-[16px] h-[14px] shrink-0"
            style={{ background: "var(--negative)", clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
          />
          SYNC CONFLICT
        </h2>
        <p className="prose m-0">{BODY[reason]}</p>
        <div
          className="grid grid-cols-2 gap-px rounded-[var(--r-chip)] overflow-hidden"
          style={{ background: "var(--rule)", border: "1px solid var(--rule)" }}
        >
          {columns.map(({ title, data }) => (
            <div key={title} className="p-[10px] flex flex-col gap-[6px]" style={{ background: "var(--paper-sunk)" }}>
              <div className="caption">{title}</div>
              {data ? (
                summary(data).map(([label, n]) => (
                  <div key={label} className="flex items-baseline justify-between gap-[8px] text-[14px] font-medium">
                    <span style={{ color: "var(--ink-2)" }}>{label}</span>
                    <span className="mono font-bold">{n}</span>
                  </div>
                ))
              ) : (
                <div className="text-[14px] font-medium" style={{ color: "var(--ink-soft)" }}>
                  Not loaded
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={onKeepLocal}
            className="selected display h-[52px] rounded-[var(--r-control)] text-[16px] font-extrabold uppercase tracking-[0.1em]"
          >
            Keep this device&apos;s version
          </button>
          <button
            type="button"
            onClick={onUseServer}
            className="display h-[52px] rounded-[var(--r-control)] text-[16px] font-extrabold uppercase tracking-[0.1em]"
            style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
          >
            Use the server&apos;s version
          </button>
        </div>
      </div>
    </div>
  );
}
