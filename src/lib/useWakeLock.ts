import { useCallback, useEffect, useRef, useState } from "react";

export const WAKE_LOCK_SUPPORTED =
  typeof navigator !== "undefined" && "wakeLock" in navigator;

/**
 * Screen wake lock, owned by the app rather than by its toggle: on phones
 * the toggle lives in the header's overflow popover, which unmounts when
 * it closes, and the lock must survive that.
 */
export function useWakeLock(): { enabled: boolean; toggle: () => Promise<void> } {
  const [enabled, setEnabled] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    const sentinel = await navigator.wakeLock.request("screen");
    sentinelRef.current = sentinel;
    sentinel.addEventListener("release", () => {
      if (sentinelRef.current === sentinel) sentinelRef.current = null;
    });
  }, []);

  // The browser drops the lock whenever the page is hidden; take it back
  // when the page is visible again.
  useEffect(() => {
    if (!enabled) return;

    async function reacquire() {
      if (document.visibilityState === "visible" && sentinelRef.current == null) {
        try {
          await acquire();
        } catch {
          setEnabled(false);
        }
      }
    }

    document.addEventListener("visibilitychange", reacquire);
    return () => document.removeEventListener("visibilitychange", reacquire);
  }, [enabled, acquire]);

  const toggle = useCallback(async () => {
    if (!WAKE_LOCK_SUPPORTED) return;
    if (enabled) {
      await sentinelRef.current?.release();
      sentinelRef.current = null;
      setEnabled(false);
      return;
    }
    try {
      await acquire();
      setEnabled(true);
    } catch {
      // permission denied, or the tab isn't visible/focused — leave off
    }
  }, [enabled, acquire]);

  return { enabled, toggle };
}
