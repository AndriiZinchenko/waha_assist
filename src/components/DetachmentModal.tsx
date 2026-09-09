import type { DetachmentData } from "../data/detachments";
import { DetachmentBody } from "./DetachmentBody";

interface DetachmentModalProps {
  data: DetachmentData;
  onClose: () => void;
}

export function DetachmentModal({ data, onClose }: DetachmentModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.6)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={data.name}
        className="max-w-[560px] w-full max-h-[80vh] overflow-y-auto rounded-[12px] p-5 flex flex-col gap-4"
        style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="display text-[16px] font-semibold truncate"
              style={{ color: "var(--accent-heading)" }}
            >
              {data.name}
            </div>
            <div className="text-[11px] text-[var(--ink-soft)] uppercase tracking-[0.05em] truncate">
              {data.faction}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 min-h-[36px] min-w-[36px] rounded-[7px] text-[16px]"
            style={{ color: "var(--ink-soft)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <DetachmentBody data={data} showCore />
      </div>
    </div>
  );
}
