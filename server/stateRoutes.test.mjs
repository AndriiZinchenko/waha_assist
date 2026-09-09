import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { handleStateRequest } from "./stateRoutes.mjs";

let dir;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "waha-routes-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const put = (body) => ({ method: "PUT", url: "/api/state", body: JSON.stringify(body) });

describe("handleStateRequest", () => {
  it("ignores paths it does not own", async () => {
    expect(
      await handleStateRequest(dir, { method: "GET", url: "/index.html", body: "" }),
    ).toBeNull();
  });

  it("serves an empty document before anything is written", async () => {
    const res = await handleStateRequest(dir, { method: "GET", url: "/api/state", body: "" });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({
      rev: 0,
      updatedAt: null,
      data: { leaderAssignments: {}, hiddenUnitIds: {}, detachmentOverrides: {} },
    });
  });

  it("accepts a write against the current revision", async () => {
    const res = await handleStateRequest(
      dir,
      put({ baseRev: 0, data: { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} } }),
    );
    expect(res.status).toBe(200);
    expect(res.json.rev).toBe(1);
    expect(res.json.data.leaderAssignments).toEqual({ l1: "u1" });
  });

  it("answers a stale write with 409 and the server copy", async () => {
    await handleStateRequest(
      dir,
      put({ baseRev: 0, data: { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} } }),
    );
    const res = await handleStateRequest(
      dir,
      put({ baseRev: 0, data: { leaderAssignments: { l2: "u2" }, hiddenUnitIds: {} } }),
    );
    expect(res.status).toBe(409);
    expect(res.json.rev).toBe(1);
    expect(res.json.data.leaderAssignments).toEqual({ l1: "u1" });
  });

  it("rejects a body that is not JSON", async () => {
    const res = await handleStateRequest(dir, {
      method: "PUT",
      url: "/api/state",
      body: "{ nope",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a body with no numeric baseRev", async () => {
    const res = await handleStateRequest(
      dir,
      put({ data: { leaderAssignments: {}, hiddenUnitIds: {} } }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a body over the size cap", async () => {
    const res = await handleStateRequest(dir, {
      method: "PUT",
      url: "/api/state",
      body: "x".repeat(1_048_577),
    });
    expect(res.status).toBe(413);
  });

  it("rejects an unsupported method on its own path", async () => {
    const res = await handleStateRequest(dir, { method: "DELETE", url: "/api/state", body: "" });
    expect(res.status).toBe(405);
  });

  it("matches the path even with a query string", async () => {
    const res = await handleStateRequest(dir, { method: "GET", url: "/api/state?t=123", body: "" });
    expect(res.status).toBe(200);
  });
});
