import { WAKE_LOCK_SUPPORTED } from "../lib/useWakeLock";
import { useUi } from "../lib/uiStrings";

interface WakeLockToggleProps {
  enabled: boolean;
  onToggle: () => void;
  /** "inline" for the tablet header; "row" for the phone overflow menu. */
  variant?: "inline" | "row";
}

/** Keep-screen-awake switch. State lives in `useWakeLock` (App). */
export function WakeLockToggle({ enabled, onToggle, variant = "inline" }: WakeLockToggleProps) {
  const ui = useUi();
  if (!WAKE_LOCK_SUPPORTED) return null;

  if (variant === "row") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className="w-full min-h-[52px] px-[14px] flex items-center justify-between gap-[12px] text-left text-[16px] font-semibold"
      >
        {ui("overflow.wake")}
        <Switch on={enabled} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
      className={`display min-h-[44px] px-[12px] rounded-[var(--r-control)] text-[15px] font-bold uppercase tracking-[0.08em] whitespace-nowrap ${enabled ? "selected" : ""}`}
      style={{ color: enabled ? undefined : "var(--ink-2)" }}
    >
      Awake
    </button>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative shrink-0 w-[44px] h-[26px] rounded-full"
      style={{
        background: on ? "var(--ink)" : "var(--paper)",
        border: `1px solid ${on ? "var(--ink)" : "var(--rule)"}`,
      }}
    >
      <span
        className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-[left] duration-150"
        style={{
          left: on ? 21 : 3,
          background: on ? "var(--paper)" : "var(--ink-2)",
        }}
      />
    </span>
  );
}
