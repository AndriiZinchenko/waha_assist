import { useCallback, useSyncExternalStore } from "react";
import { formatRoute, parseRoute, type RouteState } from "./route";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshot(): string {
  return window.location.hash;
}

export interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. Use
   * for in-screen state (an expanded unit, the calculator toggle) so the
   * Back button steps between screens, not between every click. */
  replace?: boolean;
}

/**
 * The URL hash as the source of truth for navigation state. Returns the
 * parsed route and a `navigate` that writes a new one; both a push and a
 * replace end in a `hashchange` so every subscriber re-reads the URL.
 */
export function useHashRoute(): [RouteState, (next: RouteState, options?: NavigateOptions) => void] {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const route = parseRoute(hash);

  const navigate = useCallback((next: RouteState, options: NavigateOptions = {}) => {
    const target = formatRoute(next);
    if (target === window.location.hash) return;
    if (options.replace) {
      window.history.replaceState(null, "", target);
      // replaceState does not fire hashchange on its own.
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = target;
    }
  }, []);

  return [route, navigate];
}
