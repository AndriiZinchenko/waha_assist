/** The fields that live on the server and follow you between devices.
 * Adding a field to the synced set means adding it here and to
 * `pickSynced` / `withSynced` — the sync machinery itself never mentions
 * individual field names. */
export interface SyncedState {
  /** leaderUnitId -> the unit id it's attached to. An army-list property,
   * not a battle one — kept forever, never reset by picking a different
   * army for a side. */
  leaderAssignments: Record<string, string>;
  /** unitId -> true when excluded from that army's list (and its points
   * total) — e.g. to trim a roster down to a smaller points limit. Same
   * persistence rules as leaderAssignments: an army-list property, kept
   * forever. */
  hiddenUnitIds: Record<string, boolean>;
  /** armyId -> the detachment name chosen in place of the roster's own.
   * Absent when the roster's detachment is used as is. An army-list
   * property like the two above, so it is kept and synced the same way. */
  detachmentOverrides: Record<string, string>;
}

export interface StoredState extends SyncedState {
  version: 2;
  selectedArmyId: { a: string | null; b: string | null };
  modelCounts: Record<string, number>;
  /** UI language — device-local, not synced. */
  lang: "en" | "uk";
  /** The server revision the synced fields above came from. */
  syncedBaseRev: number;
  /** Set when the synced fields changed and the server has not accepted
   * them yet. Because an online edit pushes straight away, a set flag
   * means the edit happened while disconnected. */
  syncDirty: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "waha:state";

export function emptyState(): StoredState {
  return {
    version: 2,
    selectedArmyId: { a: null, b: null },
    modelCounts: {},
    leaderAssignments: {},
    hiddenUnitIds: {},
    detachmentOverrides: {},
    lang: "en",
    syncedBaseRev: 0,
    syncDirty: false,
  };
}

export function loadState(storage: StorageLike = window.localStorage): StoredState {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyState();
  }

  if (typeof parsed !== "object" || parsed === null) return emptyState();

  // Version 1 predates server sync. Migrate it rather than resetting, so an
  // existing device keeps the leaders and hidden units already configured;
  // the seed rule then pushes them to the empty server on first connect.
  const version = (parsed as { version?: unknown }).version;
  if (version !== 1 && version !== 2) return emptyState();

  const candidate = parsed as Partial<StoredState>;
  return {
    version: 2,
    selectedArmyId: {
      a: candidate.selectedArmyId?.a ?? null,
      b: candidate.selectedArmyId?.b ?? null,
    },
    modelCounts: candidate.modelCounts ?? {},
    leaderAssignments: candidate.leaderAssignments ?? {},
    hiddenUnitIds: candidate.hiddenUnitIds ?? {},
    detachmentOverrides: candidate.detachmentOverrides ?? {},
    lang: candidate.lang === "uk" ? "uk" : "en",
    syncedBaseRev:
      typeof candidate.syncedBaseRev === "number" && candidate.syncedBaseRev >= 0
        ? candidate.syncedBaseRev
        : 0,
    syncDirty: candidate.syncDirty === true,
  };
}

export function saveState(
  state: StoredState,
  storage: StorageLike = window.localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function pickSynced(state: StoredState): SyncedState {
  return {
    leaderAssignments: state.leaderAssignments,
    hiddenUnitIds: state.hiddenUnitIds,
    detachmentOverrides: state.detachmentOverrides,
  };
}

export function withSynced(
  state: StoredState,
  synced: SyncedState,
  rev: number,
  dirty: boolean,
): StoredState {
  return {
    ...state,
    leaderAssignments: synced.leaderAssignments,
    hiddenUnitIds: synced.hiddenUnitIds,
    // Older server documents predate this field.
    detachmentOverrides: synced.detachmentOverrides ?? {},
    syncedBaseRev: rev,
    syncDirty: dirty,
  };
}

export function isEmptySynced(synced: SyncedState): boolean {
  return (
    Object.keys(synced.leaderAssignments).length === 0 &&
    Object.keys(synced.hiddenUnitIds).length === 0 &&
    Object.keys(synced.detachmentOverrides ?? {}).length === 0
  );
}

export function resolveSelectedArmyId(
  id: string | null,
  availableIds: readonly string[],
): string | null {
  return id !== null && availableIds.includes(id) ? id : null;
}
