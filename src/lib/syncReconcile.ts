import { isEmptySynced, type SyncedState } from "./persistence";

export interface ServerDoc {
  rev: number;
  updatedAt: string | null;
  data: SyncedState;
}

export type SyncAction =
  | { action: "idle" }
  | { action: "seed" }
  | { action: "adopt"; data: SyncedState; rev: number }
  | {
      action: "ask";
      reason: "offline-edits" | "conflict";
      serverData: SyncedState;
      serverRev: number;
    };

/**
 * Decide what to do with a freshly fetched server document.
 *
 * The rule that drives everything: an edit made while connected pushes
 * immediately and clears the dirty flag, so a flag that is still set can
 * only mean edits made while disconnected. Those are never pushed without
 * asking, because configuring an army offline is not the same as deciding
 * to keep that configuration.
 *
 * The one exception is an empty server. Adopting nothing would destroy the
 * configuration this device already has, and pushing cannot lose anything,
 * so the first connection seeds without a prompt.
 */
export function reconcile(input: {
  local: SyncedState;
  baseRev: number;
  dirty: boolean;
  server: ServerDoc;
}): SyncAction {
  const { local, baseRev, dirty, server } = input;

  if (server.rev === 0 && isEmptySynced(server.data) && !isEmptySynced(local)) {
    return { action: "seed" };
  }
  if (!dirty) {
    if (server.rev === baseRev) return { action: "idle" };
    return { action: "adopt", data: server.data, rev: server.rev };
  }
  return {
    action: "ask",
    reason: server.rev === baseRev ? "offline-edits" : "conflict",
    serverData: server.data,
    serverRev: server.rev,
  };
}
