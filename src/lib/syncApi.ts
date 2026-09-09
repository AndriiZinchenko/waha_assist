// The two calls the browser makes against the PC. `fetch` is injectable so
// the calling code can be tested without a server.

import type { SyncedState } from "./persistence";
import type { ServerDoc } from "./syncReconcile";

export type GetResult = { ok: true; doc: ServerDoc } | { ok: false };

export type PutResult =
  | { status: "ok"; doc: ServerDoc }
  | { status: "conflict"; doc: ServerDoc }
  | { status: "offline" };

export function createSyncApi(fetchImpl: typeof fetch = fetch, base = "/api/state") {
  return {
    async get(): Promise<GetResult> {
      try {
        const res = await fetchImpl(base, { method: "GET", cache: "no-store" });
        if (!res.ok) return { ok: false };
        return { ok: true, doc: (await res.json()) as ServerDoc };
      } catch {
        return { ok: false };
      }
    },

    async put(baseRev: number, data: SyncedState): Promise<PutResult> {
      try {
        const res = await fetchImpl(base, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseRev, data }),
        });
        if (res.status === 409) {
          return { status: "conflict", doc: (await res.json()) as ServerDoc };
        }
        if (!res.ok) return { status: "offline" };
        return { status: "ok", doc: (await res.json()) as ServerDoc };
      } catch {
        return { status: "offline" };
      }
    },
  };
}
