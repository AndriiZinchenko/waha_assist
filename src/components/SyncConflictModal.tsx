interface SyncConflictModalProps {
  reason: "offline-edits" | "conflict";
  onKeepLocal: () => void;
  onUseServer: () => void;
}

const BODY: Record<SyncConflictModalProps["reason"], string> = {
  "offline-edits":
    "This device changed leaders or hidden units while it could not reach the server. Nothing has been sent yet.",
  conflict:
    "This device and the server both changed leaders or hidden units. Keeping one version discards the other.",
};

export function SyncConflictModal({
  reason,
  onKeepLocal,
  onUseServer,
}: SyncConflictModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Config differs from the server"
    >
      <div
        className="w-full max-w-sm rounded-[10px] p-4"
        style={{ background: "var(--panel)", color: "var(--ink)" }}
      >
        <h2 className="display text-[15px] font-semibold">
          Config differs from the server
        </h2>
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          {BODY[reason]}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onKeepLocal}
            className="min-h-[44px] rounded-[7px] px-4 text-[14px] font-semibold"
            style={{ background: "var(--side-a-fill)", color: "var(--ink)" }}
          >
            Keep this device&apos;s version
          </button>
          <button
            type="button"
            onClick={onUseServer}
            className="min-h-[44px] rounded-[7px] px-4 text-[14px] font-semibold"
            style={{ background: "var(--inset)", color: "var(--ink-soft)" }}
          >
            Use the server&apos;s version
          </button>
        </div>
      </div>
    </div>
  );
}
