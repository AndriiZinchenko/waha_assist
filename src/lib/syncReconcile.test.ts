import { describe, expect, it } from "vitest";
import { reconcile, type ServerDoc } from "./syncReconcile";
import type { SyncedState } from "./persistence";

const empty: SyncedState = { leaderAssignments: {}, hiddenUnitIds: {}, detachmentOverrides: {}, weaponOverrides: {} };
const local: SyncedState = { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {}, detachmentOverrides: {}, weaponOverrides: {} };
const remote: SyncedState = { leaderAssignments: { l2: "u2" }, hiddenUnitIds: {}, detachmentOverrides: {}, weaponOverrides: {} };
const doc = (rev: number, data: SyncedState): ServerDoc => ({ rev, updatedAt: null, data });

describe("reconcile", () => {
  it("seeds an untouched server from this device rather than wiping the device", () => {
    expect(reconcile({ local, baseRev: 0, dirty: false, server: doc(0, empty) })).toEqual({
      action: "seed",
    });
  });

  it("does nothing when both sides are empty", () => {
    expect(
      reconcile({ local: empty, baseRev: 0, dirty: false, server: doc(0, empty) }),
    ).toEqual({ action: "idle" });
  });

  it("does nothing when the revisions already match", () => {
    expect(reconcile({ local, baseRev: 3, dirty: false, server: doc(3, local) })).toEqual({
      action: "idle",
    });
  });

  it("adopts the server copy when it moved on and this device has no edits", () => {
    expect(reconcile({ local, baseRev: 3, dirty: false, server: doc(4, remote) })).toEqual({
      action: "adopt",
      data: remote,
      rev: 4,
    });
  });

  it("asks before pushing edits made while disconnected", () => {
    expect(reconcile({ local, baseRev: 3, dirty: true, server: doc(3, remote) })).toEqual({
      action: "ask",
      reason: "offline-edits",
      serverData: remote,
      serverRev: 3,
    });
  });

  it("asks when both this device and the server changed", () => {
    expect(reconcile({ local, baseRev: 3, dirty: true, server: doc(5, remote) })).toEqual({
      action: "ask",
      reason: "conflict",
      serverData: remote,
      serverRev: 5,
    });
  });

  it("still seeds an emptied server even when this device has unpushed edits", () => {
    expect(reconcile({ local, baseRev: 2, dirty: true, server: doc(0, empty) })).toEqual({
      action: "seed",
    });
  });
});
