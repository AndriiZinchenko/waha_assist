import { useCallback, useEffect, useRef, useState } from "react";
import { pickSynced, saveState, withSynced, type StoredState, type SyncedState } from "./persistence";
import { createSyncApi } from "./syncApi";
import { reconcile } from "./syncReconcile";
import type { SyncStatusValue } from "../components/SyncStatus";

const POLL_MS = 10_000;
const PUSH_DEBOUNCE_MS = 300;

const api = createSyncApi();

/**
 * Timing for the synced config. Every decision about what to keep lives in
 * `reconcile`; this hook only decides *when* to ask, and applies the answer.
 */
export function useSync(
  state: StoredState,
  setState: (updater: (prev: StoredState) => StoredState) => void,
) {
  const [status, setStatus] = useState<SyncStatusValue>("synced");
  const [prompt, setPrompt] = useState<{
    reason: "offline-edits" | "conflict";
    serverRev: number;
    /** The server's copy, so the dialog can show what each side holds. */
    serverData: SyncedState | null;
  } | null>(null);

  // The effects below run on timers and events, so they read the current
  // state through a ref rather than closing over a stale copy.
  const stateRef = useRef(state);
  stateRef.current = state;
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // An edit sets the dirty flag before its debounced push runs. A fetch
  // landing in that window would see dirty state and ask the user about
  // edits that are seconds from pushing cleanly, so fetches stand aside
  // until the push has settled.
  const pushBusy = useRef(false);

  const push = useCallback(
    async (baseRev: number) => {
      pushBusy.current = true;
      let result;
      try {
        result = await api.put(baseRev, pickSynced(stateRef.current));
      } finally {
        pushBusy.current = false;
      }
      if (result.status === "ok") {
        setState((prev) => {
          const next = withSynced(prev, pickSynced(prev), result.doc.rev, false);
          saveState(next);
          return next;
        });
        setPrompt(null);
        setStatus("synced");
        return;
      }
      if (result.status === "conflict") {
        setPrompt({ reason: "conflict", serverRev: result.doc.rev, serverData: result.doc.data });
        setStatus("conflict");
        return;
      }
      setStatus("offline");
    },
    [setState],
  );

  const sync = useCallback(async () => {
    if (pushBusy.current || pushTimer.current !== null) return;
    const current = stateRef.current;
    const fetched = await api.get();
    if (!fetched.ok) {
      setStatus(current.syncDirty ? "pending" : "offline");
      return;
    }
    const decision = reconcile({
      local: pickSynced(current),
      baseRev: current.syncedBaseRev,
      dirty: current.syncDirty,
      server: fetched.doc,
    });
    if (decision.action === "idle") {
      setStatus("synced");
      return;
    }
    if (decision.action === "seed") {
      await push(fetched.doc.rev);
      return;
    }
    if (decision.action === "adopt") {
      setState((prev) => {
        const next = withSynced(prev, decision.data, decision.rev, false);
        saveState(next);
        return next;
      });
      setStatus("synced");
      return;
    }
    setPrompt({
      reason: decision.reason,
      serverRev: decision.serverRev,
      serverData: decision.serverData,
    });
    setStatus("conflict");
  }, [push, setState]);

  // Fetch on mount, when the window comes back, and on a slow poll while
  // visible. Polling is what makes a change on the PC show up on a tablet
  // that never loses focus.
  useEffect(() => {
    void sync();
    const onFocus = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    // The poll runs even with unsent edits: it is how a device that failed
    // to push notices the server is back, which is the moment it needs to
    // ask whether to keep those edits.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void sync();
    }, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [sync]);

  const noteLocalEdit = useCallback(() => {
    setStatus("pending");
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      void push(stateRef.current.syncedBaseRev);
    }, PUSH_DEBOUNCE_MS);
  }, [push]);

  const keepLocal = useCallback(() => {
    const rev = prompt?.serverRev ?? stateRef.current.syncedBaseRev;
    setPrompt(null);
    void push(rev);
  }, [prompt, push]);

  const useServer = useCallback(async () => {
    setPrompt(null);
    const fetched = await api.get();
    if (!fetched.ok) {
      setStatus("offline");
      return;
    }
    setState((prev) => {
      const next = withSynced(prev, fetched.doc.data, fetched.doc.rev, false);
      saveState(next);
      return next;
    });
    setStatus("synced");
  }, [setState]);

  return { status, prompt, keepLocal, useServer, noteLocalEdit };
}
