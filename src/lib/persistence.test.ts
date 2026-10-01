import { describe, expect, it } from "vitest";
import {
  emptyState,
  isEmptySynced,
  pickSynced,
  withSynced,
  loadState,
  resolveSelectedArmyId,
  saveState,
  type StoredState,
} from "./persistence";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("persistence", () => {
  it("returns an empty state when nothing is stored", () => {
    const storage = new MemoryStorage();
    expect(loadState(storage)).toEqual(emptyState());
  });

  it("round-trips a saved state", () => {
    const storage = new MemoryStorage();
    const state: StoredState = {
      version: 2,
      selectedArmyId: { a: "grey-knights", b: null },
      modelCounts: { "u1:w1": 3 },
      leaderAssignments: { l1: "u1" },
      hiddenUnitIds: { u2: true },
      detachmentOverrides: { Grey: "Hallowed Conclave" },
      weaponOverrides: {},
      lang: "uk",
      syncedBaseRev: 3,
      syncDirty: false,
    };
    saveState(state, storage);
    expect(loadState(storage)).toEqual(state);
  });

  it("falls back to empty state on a version mismatch", () => {
    const storage = new MemoryStorage();
    storage.setItem("waha:state", JSON.stringify({ version: 99, foo: "bar" }));
    expect(loadState(storage)).toEqual(emptyState());
  });

  it("falls back to empty state on unparsable JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem("waha:state", "{not json");
    expect(loadState(storage)).toEqual(emptyState());
  });

  it("resolveSelectedArmyId falls back to null when the id is no longer available", () => {
    expect(
      resolveSelectedArmyId("grey-knights", ["grey-knights", "orks"]),
    ).toBe("grey-knights");
    expect(
      resolveSelectedArmyId("deleted-army", ["grey-knights", "orks"]),
    ).toBe(null);
    expect(resolveSelectedArmyId(null, ["grey-knights"])).toBe(null);
  });
});

describe("sync bookkeeping", () => {
  it("starts an empty state at revision zero and not dirty", () => {
    const state = emptyState();
    expect(state.syncedBaseRev).toBe(0);
    expect(state.syncDirty).toBe(false);
    expect(state.version).toBe(2);
  });

  it("migrates a version 1 document without losing its config", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "waha:state",
      JSON.stringify({
        version: 1,
        selectedArmyId: { a: "grey", b: null },
        modelCounts: { "u1:weapon": 3 },
        leaderAssignments: { l1: "u1" },
        hiddenUnitIds: { u2: true },
        lang: "uk",
      }),
    );
    const loaded = loadState(storage);
    expect(loaded.version).toBe(2);
    expect(loaded.leaderAssignments).toEqual({ l1: "u1" });
    expect(loaded.hiddenUnitIds).toEqual({ u2: true });
    expect(loaded.modelCounts).toEqual({ "u1:weapon": 3 });
    expect(loaded.lang).toBe("uk");
    expect(loaded.syncedBaseRev).toBe(0);
    expect(loaded.syncDirty).toBe(false);
  });

  it("round-trips the sync bookkeeping through storage", () => {
    const storage = new MemoryStorage();
    const state: StoredState = { ...emptyState(), syncedBaseRev: 4, syncDirty: true };
    saveState(state, storage);
    const loaded = loadState(storage);
    expect(loaded.syncedBaseRev).toBe(4);
    expect(loaded.syncDirty).toBe(true);
  });

  it("picks out only the synced fields", () => {
    const state: StoredState = {
      ...emptyState(),
      modelCounts: { "u1:weapon": 2 },
      leaderAssignments: { l1: "u1" },
      hiddenUnitIds: { u2: true },
    };
    expect(pickSynced(state)).toEqual({
      leaderAssignments: { l1: "u1" },
      hiddenUnitIds: { u2: true },
      detachmentOverrides: {},
      weaponOverrides: {},
    });
  });

  it("replaces synced fields and bookkeeping while leaving local fields alone", () => {
    const state: StoredState = {
      ...emptyState(),
      modelCounts: { "u1:weapon": 2 },
      lang: "uk",
      leaderAssignments: { old: "x" },
    };
    const override = {
      groups: [{ key: "g1", modelCount: 2, weapons: [{ name: "Lascannon", perModel: 1 }] }],
      rosterSignature: "2xlascannon",
    };
    const next = withSynced(
      state,
      {
        leaderAssignments: { l9: "u9" },
        hiddenUnitIds: {},
        detachmentOverrides: { Orks: "Green Tide" },
        weaponOverrides: { u9: override },
      },
      7,
      false,
    );
    expect(next.leaderAssignments).toEqual({ l9: "u9" });
    expect(next.detachmentOverrides).toEqual({ Orks: "Green Tide" });
    expect(next.weaponOverrides).toEqual({ u9: override });
    expect(next.modelCounts).toEqual({ "u1:weapon": 2 });
    expect(next.lang).toBe("uk");
    expect(next.syncedBaseRev).toBe(7);
    expect(next.syncDirty).toBe(false);
  });

  it("recognises an empty synced set", () => {
    const none = {
      leaderAssignments: {},
      hiddenUnitIds: {},
      detachmentOverrides: {},
      weaponOverrides: {},
    };
    expect(isEmptySynced(none)).toBe(true);
    expect(isEmptySynced({ ...none, leaderAssignments: { l1: "u1" } })).toBe(false);
    expect(isEmptySynced({ ...none, hiddenUnitIds: { u1: true } })).toBe(false);
    expect(isEmptySynced({ ...none, detachmentOverrides: { Orks: "Green Tide" } })).toBe(false);
    expect(
      isEmptySynced({ ...none, weaponOverrides: { u1: { groups: [], rosterSignature: "" } } }),
    ).toBe(false);
  });

  // Saved before detachments could be chosen: the field is simply absent.
  it("loads a stored state that predates detachment overrides", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "waha:state",
      JSON.stringify({ ...emptyState(), detachmentOverrides: undefined }),
    );
    expect(loadState(storage).detachmentOverrides).toEqual({});
  });

  // Saved before weapons could be edited: the field is simply absent.
  it("loads a stored state that predates weapon overrides", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "waha:state",
      JSON.stringify({ ...emptyState(), weaponOverrides: undefined }),
    );
    expect(loadState(storage).weaponOverrides).toEqual({});
  });
});
