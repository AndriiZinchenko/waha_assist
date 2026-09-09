import { describe, expect, it, vi } from "vitest";
import { createSyncApi } from "./syncApi";
import type { SyncedState } from "./persistence";

const data: SyncedState = { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {}, detachmentOverrides: {} };
const doc = { rev: 2, updatedAt: "2026-09-09T00:00:00.000Z", data };

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe("createSyncApi.get", () => {
  it("returns the document the server sent", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, doc));
    const api = createSyncApi(fetchImpl as unknown as typeof fetch);
    expect(await api.get()).toEqual({ ok: true, doc });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/state",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("reports failure when the network is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const api = createSyncApi(fetchImpl as unknown as typeof fetch);
    expect(await api.get()).toEqual({ ok: false });
  });

  it("reports failure on a server error status", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(500, { error: "boom" }));
    const api = createSyncApi(fetchImpl as unknown as typeof fetch);
    expect(await api.get()).toEqual({ ok: false });
  });
});

describe("createSyncApi.put", () => {
  it("sends the base revision and the data", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, doc));
    const api = createSyncApi(fetchImpl as unknown as typeof fetch);
    const result = await api.put(1, data);
    expect(result).toEqual({ status: "ok", doc });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ baseRev: 1, data });
  });

  it("surfaces a conflict with the server copy", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(409, doc));
    const api = createSyncApi(fetchImpl as unknown as typeof fetch);
    expect(await api.put(0, data)).toEqual({ status: "conflict", doc });
  });

  it("reports offline when the request throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const api = createSyncApi(fetchImpl as unknown as typeof fetch);
    expect(await api.put(0, data)).toEqual({ status: "offline" });
  });

  it("reports offline on an unexpected status", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(500, {}));
    const api = createSyncApi(fetchImpl as unknown as typeof fetch);
    expect(await api.put(0, data)).toEqual({ status: "offline" });
  });
});
