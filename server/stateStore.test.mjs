import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { emptyDoc, normalizeSyncedData, readDoc, writeDoc } from "./stateStore.mjs";

let dir;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "waha-state-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readDoc", () => {
  it("reads an empty document when no file exists yet", async () => {
    expect(await readDoc(dir)).toEqual(emptyDoc());
  });

  it("reads back what writeDoc stored", async () => {
    await writeDoc(dir, 0, { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} });
    const doc = await readDoc(dir);
    expect(doc.rev).toBe(1);
    expect(doc.data.leaderAssignments).toEqual({ l1: "u1" });
    expect(typeof doc.updatedAt).toBe("string");
  });

  it("treats an unparseable file as empty rather than throwing", async () => {
    await writeFile(path.join(dir, "state.json"), "{ not json", "utf8");
    expect(await readDoc(dir)).toEqual(emptyDoc());
  });
});

describe("writeDoc", () => {
  it("bumps the revision on each accepted write", async () => {
    const first = await writeDoc(dir, 0, { leaderAssignments: {}, hiddenUnitIds: {} });
    const second = await writeDoc(dir, 1, { leaderAssignments: {}, hiddenUnitIds: { u9: true } });
    expect(first.doc.rev).toBe(1);
    expect(second.doc.rev).toBe(2);
    expect(second.ok).toBe(true);
  });

  it("rejects a stale base revision and returns the current document", async () => {
    await writeDoc(dir, 0, { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} });
    const result = await writeDoc(dir, 0, { leaderAssignments: { l2: "u2" }, hiddenUnitIds: {} });
    expect(result.ok).toBe(false);
    expect(result.doc.rev).toBe(1);
    expect(result.doc.data.leaderAssignments).toEqual({ l1: "u1" });
  });

  it("leaves no temp files behind", async () => {
    await writeDoc(dir, 0, { leaderAssignments: {}, hiddenUnitIds: {} });
    expect(await readdir(dir)).toEqual(["state.json"]);
  });
});

describe("normalizeSyncedData", () => {
  it("drops unknown keys and wrong value types", () => {
    expect(
      normalizeSyncedData({
        leaderAssignments: { l1: "u1", bad: 7 },
        hiddenUnitIds: { u1: true, u2: "yes" },
        detachmentOverrides: { Orks: "Green Tide", Grey: 3 },
        somethingElse: 1,
      }),
    ).toEqual({
      leaderAssignments: { l1: "u1" },
      hiddenUnitIds: { u1: true },
      detachmentOverrides: { Orks: "Green Tide" },
    });
  });

  it("returns empty maps for a non-object", () => {
    expect(normalizeSyncedData(null)).toEqual({
      leaderAssignments: {},
      hiddenUnitIds: {},
      detachmentOverrides: {},
    });
  });

  it("keeps detachment overrides through a write and read", async () => {
    await writeDoc(dir, 0, {
      leaderAssignments: {},
      hiddenUnitIds: {},
      detachmentOverrides: { Orks: "Green Tide" },
    });
    expect((await readDoc(dir)).data.detachmentOverrides).toEqual({ Orks: "Green Tide" });
  });
});
