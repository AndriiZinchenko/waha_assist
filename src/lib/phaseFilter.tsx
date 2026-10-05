import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Phase } from "./phases";

const STORAGE_KEY = "waha.phaseFilter.showAll";

export interface PhaseFilterValue {
  /** The phase being played; null outside the battle screen. */
  phase: Phase | null;
  /** The user switched the filter off: show every stratagem and ability. */
  showAll: boolean;
  setShowAll: (next: boolean) => void;
}

export const PhaseFilterContext = createContext<PhaseFilterValue>({
  phase: null,
  showAll: false,
  setShowAll: () => {},
});

function readShowAll(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Provides the phase to every datasheet below it. "Show all" is one setting
 * for the whole app, kept in this browser only. */
export function PhaseFilterProvider({ phase, children }: { phase: Phase; children: ReactNode }) {
  const [showAll, setShowAllState] = useState(readShowAll);
  const setShowAll = useCallback((next: boolean) => {
    setShowAllState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage can be unavailable (private window); the setting then lasts
      // until reload.
    }
  }, []);
  const value = useMemo(() => ({ phase, showAll, setShowAll }), [phase, showAll, setShowAll]);
  return <PhaseFilterContext.Provider value={value}>{children}</PhaseFilterContext.Provider>;
}

/**
 * What a datasheet should filter by: `filter` is the phase to narrow to, or
 * null when nothing should be filtered (no phase, as on the configuration
 * screen, or "Show all" is on).
 */
export function usePhaseFilter(): PhaseFilterValue & { filter: Phase | null } {
  const value = useContext(PhaseFilterContext);
  return { ...value, filter: value.showAll ? null : value.phase };
}
