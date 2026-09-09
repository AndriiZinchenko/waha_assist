import { useEffect, useRef, useState } from "react";

const SUPPORTED = typeof navigator !== "undefined" && "wakeLock" in navigator;

export function WakeLockToggle() {
  const [enabled, setEnabled] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    async function reacquire() {
      if (document.visibilityState === "visible" && sentinelRef.current == null) {
        try {
          const sentinel = await navigator.wakeLock.request("screen");
          sentinelRef.current = sentinel;
          sentinel.addEventListener("release", () => {
            if (sentinelRef.current === sentinel) sentinelRef.current = null;
          });
        } catch {
          setEnabled(false);
        }
      }
    }

    document.addEventListener("visibilitychange", reacquire);
    return () => document.removeEventListener("visibilitychange", reacquire);
  }, [enabled]);

  if (!SUPPORTED) return null;

  async function toggle() {
    if (enabled) {
      await sentinelRef.current?.release();
      sentinelRef.current = null;
      setEnabled(false);
      return;
    }
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        if (sentinelRef.current === sentinel) sentinelRef.current = null;
      });
      setEnabled(true);
    } catch {
      // permission denied, or the tab isn't visible/focused — leave off
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className="min-h-[44px] px-4 rounded-[7px] text-[14.5px] font-semibold"
      style={{
        color: enabled ? "var(--ink)" : "var(--ink-soft)",
        background: enabled ? "var(--paper-sunk)" : undefined,
      }}
    >
      Keep Awake
    </button>
  );
}
