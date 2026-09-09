# Synced Army Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist leader assignments and hidden units on the PC so every device that opens the app sees the same army configuration.

**Architecture:** A Vite plugin adds two JSON routes to the server that already serves the app, backed by one atomically-written file. The browser keeps `localStorage` as an instant-paint cache plus a revision number and a dirty flag, and a pure reconcile function decides on each fetch whether to sit still, adopt the server copy, seed it, or ask the user.

**Tech Stack:** Node (ESM `.mjs` for server code), TypeScript + React 18 for the client, Vite 5, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-09-synced-config-design.md`

## Global Constraints

- **This project is not a git repository.** Skip every commit step. Each task ends by running the full suite instead: `npx vitest run`.
- **Type checking must stay clean:** `npx tsc --noEmit -p tsconfig.app.json`.
- **Lint must stay clean:** `npx eslint .` reports zero errors. Three pre-existing `react-refresh/only-export-components` warnings in `src/lib/i18n.tsx` are expected and must not grow.
- **Server code is ESM `.mjs`** under `server/`, matching `parseRoster.mjs` at the repo root. No TypeScript build step for it.
- **Synced fields are exactly** `leaderAssignments` and `hiddenUnitIds`. `modelCounts`, `lang` and `selectedArmyId` stay device-local.
- **Storage file path:** `data/state.json`, relative to the repo root.
- **API base path:** `/api/state`.
- **Request body cap:** 1 MB (1_048_576 bytes), answered with status 413.
- **Existing code style:** double quotes, semicolons, two-space indent, named exports, JSDoc comments explaining *why* rather than *what*.

---

### Task 1: Server state store

The file layer: read the document, write it atomically, reject stale revisions.

**Files:**
- Create: `server/stateStore.mjs`
- Test: `server/stateStore.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `emptyDoc(): { rev: 0, updatedAt: null, data: { leaderAssignments: {}, hiddenUnitIds: {} } }`
  - `normalizeSyncedData(value: unknown): { leaderAssignments: Record<string,string>, hiddenUnitIds: Record<string,boolean> }`
  - `readDoc(dir: string): Promise<Doc>` where `Doc = { rev: number, updatedAt: string | null, data: SyncedData }`
  - `writeDoc(dir: string, baseRev: number, data: unknown): Promise<{ ok: boolean, doc: Doc }>` — `ok: false` returns the current doc unchanged on a stale `baseRev`.

- [ ] **Step 1: Write the failing test**

```javascript
// server/stateStore.test.mjs
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
        somethingElse: 1,
      }),
    ).toEqual({ leaderAssignments: { l1: "u1" }, hiddenUnitIds: { u1: true } });
  });

  it("returns empty maps for a non-object", () => {
    expect(normalizeSyncedData(null)).toEqual({ leaderAssignments: {}, hiddenUnitIds: {} });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/stateStore.test.mjs`
Expected: FAIL, cannot find module `./stateStore.mjs`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// server/stateStore.mjs
// Storage layer for the synced army config. One JSON file, one integer
// revision. Writes go through a temp file and a rename so an interrupted
// write can never leave a half-written document on disk.

import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE_NAME = "state.json";

export function emptyDoc() {
  return {
    rev: 0,
    updatedAt: null,
    data: { leaderAssignments: {}, hiddenUnitIds: {} },
  };
}

/**
 * Keep only the fields and value types we sync. The request body comes from
 * a browser we do not control, and the file may have been hand-edited, so
 * both are normalized through here rather than trusted.
 */
export function normalizeSyncedData(value) {
  const source = typeof value === "object" && value !== null ? value : {};
  const leaderAssignments = {};
  const rawLeaders = source.leaderAssignments;
  if (typeof rawLeaders === "object" && rawLeaders !== null) {
    for (const [key, val] of Object.entries(rawLeaders)) {
      if (typeof val === "string") leaderAssignments[key] = val;
    }
  }
  const hiddenUnitIds = {};
  const rawHidden = source.hiddenUnitIds;
  if (typeof rawHidden === "object" && rawHidden !== null) {
    for (const [key, val] of Object.entries(rawHidden)) {
      if (typeof val === "boolean") hiddenUnitIds[key] = val;
    }
  }
  return { leaderAssignments, hiddenUnitIds };
}

export async function readDoc(dir) {
  let raw;
  try {
    raw = await readFile(path.join(dir, FILE_NAME), "utf8");
  } catch {
    return emptyDoc();
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[state] ${FILE_NAME} is not valid JSON; treating it as empty`);
    return emptyDoc();
  }
  const rev = Number.isInteger(parsed?.rev) && parsed.rev >= 0 ? parsed.rev : 0;
  return {
    rev,
    updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null,
    data: normalizeSyncedData(parsed?.data),
  };
}

export async function writeDoc(dir, baseRev, data) {
  const current = await readDoc(dir);
  if (current.rev !== baseRev) return { ok: false, doc: current };

  const next = {
    rev: current.rev + 1,
    updatedAt: new Date().toISOString(),
    data: normalizeSyncedData(data),
  };
  const target = path.join(dir, FILE_NAME);
  const temp = path.join(dir, `${FILE_NAME}.${process.pid}.tmp`);
  try {
    await writeFile(temp, JSON.stringify(next, null, 2), "utf8");
    await rename(temp, target);
  } catch (err) {
    await unlink(temp).catch(() => {});
    throw err;
  }
  return { ok: true, doc: next };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/stateStore.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: every test passes.

---

### Task 2: Request routing

Turn HTTP shapes into store calls. Deliberately free of Vite and of `node:http` types so it can be tested as a plain function and reused if the API ever moves to a hosted service.

**Files:**
- Create: `server/stateRoutes.mjs`
- Test: `server/stateRoutes.test.mjs`

**Interfaces:**
- Consumes: `readDoc`, `writeDoc`, `normalizeSyncedData` from `server/stateStore.mjs`.
- Produces: `handleStateRequest(dir: string, request: { method: string, url: string, body: string }): Promise<{ status: number, json: unknown } | null>` — `null` means the request is not ours and the caller should fall through.

- [ ] **Step 1: Write the failing test**

```javascript
// server/stateRoutes.test.mjs
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
    expect(await handleStateRequest(dir, { method: "GET", url: "/index.html", body: "" })).toBeNull();
  });

  it("serves an empty document before anything is written", async () => {
    const res = await handleStateRequest(dir, { method: "GET", url: "/api/state", body: "" });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({
      rev: 0,
      updatedAt: null,
      data: { leaderAssignments: {}, hiddenUnitIds: {} },
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
    await handleStateRequest(dir, put({ baseRev: 0, data: { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} } }));
    const res = await handleStateRequest(
      dir,
      put({ baseRev: 0, data: { leaderAssignments: { l2: "u2" }, hiddenUnitIds: {} } }),
    );
    expect(res.status).toBe(409);
    expect(res.json.rev).toBe(1);
    expect(res.json.data.leaderAssignments).toEqual({ l1: "u1" });
  });

  it("rejects a body that is not JSON", async () => {
    const res = await handleStateRequest(dir, { method: "PUT", url: "/api/state", body: "{ nope" });
    expect(res.status).toBe(400);
  });

  it("rejects a body with no numeric baseRev", async () => {
    const res = await handleStateRequest(dir, put({ data: { leaderAssignments: {}, hiddenUnitIds: {} } }));
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/stateRoutes.test.mjs`
Expected: FAIL, cannot find module `./stateRoutes.mjs`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// server/stateRoutes.mjs
// HTTP shape for the synced config: two routes over the state store.
// Takes a plain { method, url, body } and returns a plain { status, json },
// so it can be unit-tested directly and mounted on any Node server.

import { readDoc, writeDoc } from "./stateStore.mjs";

const ROUTE = "/api/state";
const MAX_BODY_BYTES = 1_048_576;

export async function handleStateRequest(dir, { method, url, body }) {
  const pathOnly = (url ?? "").split("?")[0];
  if (pathOnly !== ROUTE) return null;

  if (method === "GET") {
    return { status: 200, json: await readDoc(dir) };
  }

  if (method === "PUT") {
    if (Buffer.byteLength(body ?? "", "utf8") > MAX_BODY_BYTES) {
      return { status: 413, json: { error: "body too large" } };
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return { status: 400, json: { error: "body is not valid JSON" } };
    }
    if (!Number.isInteger(parsed?.baseRev) || parsed.baseRev < 0) {
      return { status: 400, json: { error: "baseRev must be a non-negative integer" } };
    }
    const result = await writeDoc(dir, parsed.baseRev, parsed.data);
    return { status: result.ok ? 200 : 409, json: result.doc };
  }

  return { status: 405, json: { error: `${method} not allowed` } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/stateRoutes.test.mjs`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: every test passes.

---

### Task 3: Mount the routes on the Vite server

**Files:**
- Create: `server/vitePlugin.mjs`
- Modify: `vite.config.ts` (import the plugin, add it to the `plugins` array)
- Modify: `.gitignore` (ignore the data file)

**Interfaces:**
- Consumes: `handleStateRequest` from `server/stateRoutes.mjs`.
- Produces: `syncedStatePlugin(options?: { dir?: string }): import("vite").Plugin` — default export style is a named export, matching the rest of the codebase.

- [ ] **Step 1: Write the plugin**

There is no unit test for this file: it is thin glue whose only real behavior is body collection, and it is verified against the running server in Step 4. Keep it that way by putting no decisions in it.

```javascript
// server/vitePlugin.mjs
// Mounts the synced-config routes on the Vite dev and preview servers, so
// `npm run dev` serves the app and its state API on one port. That port is
// the one the tablet already loads the app from.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { handleStateRequest } from "./stateRoutes.mjs";

const MAX_BODY_BYTES = 1_048_576;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      // Stop reading a runaway body rather than buffering it all; the route
      // layer turns the oversized marker into a 413.
      if (size > MAX_BODY_BYTES) {
        resolve("x".repeat(MAX_BODY_BYTES + 1));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function syncedStatePlugin(options = {}) {
  const dir = options.dir ?? path.resolve(process.cwd(), "data");

  const middleware = async (req, res, next) => {
    let result;
    try {
      await mkdir(dir, { recursive: true });
      const body = req.method === "PUT" ? await readBody(req) : "";
      result = await handleStateRequest(dir, { method: req.method, url: req.url, body });
    } catch (err) {
      console.error("[state] request failed", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "internal error" }));
      return;
    }
    if (result === null) {
      next();
      return;
    }
    res.statusCode = result.status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(result.json));
  };

  return {
    name: "waha-synced-state",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
```

- [ ] **Step 2: Register it in `vite.config.ts`**

Add the import beside the existing ones:

```typescript
import { syncedStatePlugin } from "./server/vitePlugin.mjs";
```

and add `syncedStatePlugin(),` as the first entry of the `plugins` array, before `react()`.

- [ ] **Step 3: Ignore the data file**

Append to `.gitignore`:

```
# Synced army config written by the dev server
data/
```

- [ ] **Step 4: Verify against the running server**

Start the dev server with the Browser pane's `preview_start` using the `waha-dev` config (never `npm run dev` from a shell), then:

```bash
curl -s http://localhost:5173/api/state
```
Expected: `{"rev":0,"updatedAt":null,"data":{"leaderAssignments":{},"hiddenUnitIds":{}}}`

```bash
curl -s -X PUT http://localhost:5173/api/state -H "Content-Type: application/json" -d '{"baseRev":0,"data":{"leaderAssignments":{"l1":"u1"},"hiddenUnitIds":{}}}'
```
Expected: status 200, `rev` of 1.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:5173/api/state -H "Content-Type: application/json" -d '{"baseRev":0,"data":{"leaderAssignments":{},"hiddenUnitIds":{}}}'
```
Expected: `409`.

Then delete `data/state.json` so later tasks start from an empty server.

- [ ] **Step 5: Run the full suite and type check**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json && npx eslint .`
Expected: tests pass, no type errors, no new lint errors.

---

### Task 4: Split synced fields out of browser storage

**Files:**
- Modify: `src/lib/persistence.ts`
- Test: `src/lib/persistence.test.ts` (add cases; keep the existing ones passing)

**Interfaces:**
- Consumes: nothing.
- Produces, from `src/lib/persistence.ts`:
  - `interface SyncedState { leaderAssignments: Record<string, string>; hiddenUnitIds: Record<string, boolean> }`
  - `StoredState` gains `syncedBaseRev: number` and `syncDirty: boolean`, and its `version` becomes `2`.
  - `pickSynced(state: StoredState): SyncedState`
  - `withSynced(state: StoredState, synced: SyncedState, rev: number, dirty: boolean): StoredState`
  - `isEmptySynced(synced: SyncedState): boolean`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/persistence.test.ts`:

```typescript
import { isEmptySynced, pickSynced, withSynced } from "./persistence";

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
    });
  });

  it("replaces synced fields and bookkeeping while leaving local fields alone", () => {
    const state: StoredState = {
      ...emptyState(),
      modelCounts: { "u1:weapon": 2 },
      lang: "uk",
      leaderAssignments: { old: "x" },
    };
    const next = withSynced(
      state,
      { leaderAssignments: { l9: "u9" }, hiddenUnitIds: {} },
      7,
      false,
    );
    expect(next.leaderAssignments).toEqual({ l9: "u9" });
    expect(next.modelCounts).toEqual({ "u1:weapon": 2 });
    expect(next.lang).toBe("uk");
    expect(next.syncedBaseRev).toBe(7);
    expect(next.syncDirty).toBe(false);
  });

  it("recognises an empty synced set", () => {
    expect(isEmptySynced({ leaderAssignments: {}, hiddenUnitIds: {} })).toBe(true);
    expect(isEmptySynced({ leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} })).toBe(false);
    expect(isEmptySynced({ leaderAssignments: {}, hiddenUnitIds: { u1: true } })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/persistence.test.ts`
Expected: FAIL on the new cases, with `pickSynced` not exported and `version` still 1.

- [ ] **Step 3: Update `src/lib/persistence.ts`**

Change the interface and constant:

```typescript
/** The fields that live on the server and follow you between devices.
 * Adding a field to the synced set means adding it here and to
 * `pickSynced` / `withSynced` — the sync machinery itself never
 * mentions individual field names. */
export interface SyncedState {
  leaderAssignments: Record<string, string>;
  hiddenUnitIds: Record<string, boolean>;
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
```

Update `emptyState` to return `version: 2`, `syncedBaseRev: 0`, `syncDirty: false`, keeping the existing fields.

Replace the version guard in `loadState` so version 1 migrates instead of resetting:

```typescript
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
    lang: candidate.lang === "uk" ? "uk" : "en",
    syncedBaseRev:
      typeof candidate.syncedBaseRev === "number" && candidate.syncedBaseRev >= 0
        ? candidate.syncedBaseRev
        : 0,
    syncDirty: candidate.syncDirty === true,
  };
```

Append the three helpers:

```typescript
export function pickSynced(state: StoredState): SyncedState {
  return {
    leaderAssignments: state.leaderAssignments,
    hiddenUnitIds: state.hiddenUnitIds,
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
    syncedBaseRev: rev,
    syncDirty: dirty,
  };
}

export function isEmptySynced(synced: SyncedState): boolean {
  return (
    Object.keys(synced.leaderAssignments).length === 0 &&
    Object.keys(synced.hiddenUnitIds).length === 0
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/persistence.test.ts && npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS, no type errors.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: every test passes.

---

### Task 5: The reconcile decision

The heart of the feature, and a pure function so every branch is testable without a server or a browser.

**Files:**
- Create: `src/lib/syncReconcile.ts`
- Test: `src/lib/syncReconcile.test.ts`

**Interfaces:**
- Consumes: `SyncedState`, `isEmptySynced` from `src/lib/persistence.ts`.
- Produces:
  - `interface ServerDoc { rev: number; updatedAt: string | null; data: SyncedState }`
  - `type SyncAction = { action: "idle" } | { action: "seed" } | { action: "adopt"; data: SyncedState; rev: number } | { action: "ask"; reason: "offline-edits" | "conflict"; serverData: SyncedState; serverRev: number }`
  - `reconcile(input: { local: SyncedState; baseRev: number; dirty: boolean; server: ServerDoc }): SyncAction`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/syncReconcile.test.ts
import { describe, expect, it } from "vitest";
import { reconcile, type ServerDoc } from "./syncReconcile";
import type { SyncedState } from "./persistence";

const empty: SyncedState = { leaderAssignments: {}, hiddenUnitIds: {} };
const local: SyncedState = { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} };
const remote: SyncedState = { leaderAssignments: { l2: "u2" }, hiddenUnitIds: {} };
const doc = (rev: number, data: SyncedState): ServerDoc => ({ rev, updatedAt: null, data });

describe("reconcile", () => {
  it("seeds an untouched server from this device rather than wiping the device", () => {
    expect(
      reconcile({ local, baseRev: 0, dirty: false, server: doc(0, empty) }),
    ).toEqual({ action: "seed" });
  });

  it("does nothing when both sides are empty", () => {
    expect(
      reconcile({ local: empty, baseRev: 0, dirty: false, server: doc(0, empty) }),
    ).toEqual({ action: "idle" });
  });

  it("does nothing when the revisions already match", () => {
    expect(
      reconcile({ local, baseRev: 3, dirty: false, server: doc(3, local) }),
    ).toEqual({ action: "idle" });
  });

  it("adopts the server copy when it moved on and this device has no edits", () => {
    expect(
      reconcile({ local, baseRev: 3, dirty: false, server: doc(4, remote) }),
    ).toEqual({ action: "adopt", data: remote, rev: 4 });
  });

  it("asks before pushing edits made while disconnected", () => {
    expect(
      reconcile({ local, baseRev: 3, dirty: true, server: doc(3, remote) }),
    ).toEqual({ action: "ask", reason: "offline-edits", serverData: remote, serverRev: 3 });
  });

  it("asks when both this device and the server changed", () => {
    expect(
      reconcile({ local, baseRev: 3, dirty: true, server: doc(5, remote) }),
    ).toEqual({ action: "ask", reason: "conflict", serverData: remote, serverRev: 5 });
  });

  it("still seeds an emptied server even when this device has unpushed edits", () => {
    expect(
      reconcile({ local, baseRev: 2, dirty: true, server: doc(0, empty) }),
    ).toEqual({ action: "seed" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/syncReconcile.test.ts`
Expected: FAIL, cannot find module `./syncReconcile`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/syncReconcile.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/syncReconcile.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: every test passes.

---

### Task 6: The HTTP client

**Files:**
- Create: `src/lib/syncApi.ts`
- Test: `src/lib/syncApi.test.ts`

**Interfaces:**
- Consumes: `ServerDoc` from `src/lib/syncReconcile.ts`; `SyncedState` from `src/lib/persistence.ts`.
- Produces:
  - `type GetResult = { ok: true; doc: ServerDoc } | { ok: false }`
  - `type PutResult = { status: "ok"; doc: ServerDoc } | { status: "conflict"; doc: ServerDoc } | { status: "offline" }`
  - `createSyncApi(fetchImpl?: typeof fetch, base?: string): { get(): Promise<GetResult>; put(baseRev: number, data: SyncedState): Promise<PutResult> }`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/syncApi.test.ts
import { describe, expect, it, vi } from "vitest";
import { createSyncApi } from "./syncApi";
import type { SyncedState } from "./persistence";

const data: SyncedState = { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} };
const doc = { rev: 2, updatedAt: "2026-09-09T00:00:00.000Z", data };

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe("createSyncApi.get", () => {
  it("returns the document the server sent", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, doc));
    const api = createSyncApi(fetchImpl as unknown as typeof fetch);
    expect(await api.get()).toEqual({ ok: true, doc });
    expect(fetchImpl).toHaveBeenCalledWith("/api/state", expect.objectContaining({ method: "GET" }));
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
    const [, init] = fetchImpl.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ baseRev: 1, data });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/syncApi.test.ts`
Expected: FAIL, cannot find module `./syncApi`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/syncApi.ts
// The two calls the browser makes against the PC. `fetch` is injectable so
// the calling code can be tested without a server.

import type { SyncedState } from "./persistence";
import type { ServerDoc } from "./syncReconcile";

export type GetResult = { ok: true; doc: ServerDoc } | { ok: false };

export type PutResult =
  | { status: "ok"; doc: ServerDoc }
  | { status: "conflict"; doc: ServerDoc }
  | { status: "offline" };

export function createSyncApi(
  fetchImpl: typeof fetch = fetch,
  base = "/api/state",
) {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/syncApi.test.ts && npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS, 8 tests, no type errors.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: every test passes.

---

### Task 7: Status indicator and conflict prompt

**Files:**
- Create: `src/components/SyncStatus.tsx`
- Create: `src/components/SyncConflictModal.tsx`

**Interfaces:**
- Consumes: nothing beyond React.
- Produces:
  - `type SyncStatusValue = "synced" | "offline" | "pending" | "conflict"`
  - `SyncStatus({ status }: { status: SyncStatusValue })`
  - `SyncConflictModal({ reason, onKeepLocal, onUseServer }: { reason: "offline-edits" | "conflict"; onKeepLocal: () => void; onUseServer: () => void })`

- [ ] **Step 1: Write the status indicator**

Follow the sizing and colour tokens used by `src/components/LangToggle.tsx` and `src/components/WakeLockToggle.tsx`.

```tsx
// src/components/SyncStatus.tsx
export type SyncStatusValue = "synced" | "offline" | "pending" | "conflict";

const LABELS: Record<SyncStatusValue, { dot: string; title: string }> = {
  synced: { dot: "var(--ok, #4ade80)", title: "Config synced with the server" },
  pending: { dot: "var(--warn, #fbbf24)", title: "Local changes not yet on the server" },
  offline: { dot: "var(--ink-soft)", title: "Server unreachable — changes stay on this device" },
  conflict: { dot: "var(--bad, #f87171)", title: "Config differs from the server" },
};

export function SyncStatus({ status }: { status: SyncStatusValue }) {
  const { dot, title } = LABELS[status];
  return (
    <span
      title={title}
      aria-label={title}
      className="flex items-center justify-center rounded-[7px] min-h-[44px] min-w-[28px]"
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: dot }}
      />
    </span>
  );
}
```

- [ ] **Step 2: Write the conflict prompt**

```tsx
// src/components/SyncConflictModal.tsx
interface SyncConflictModalProps {
  reason: "offline-edits" | "conflict";
  onKeepLocal: () => void;
  onUseServer: () => void;
}

const BODY: Record<SyncConflictModalProps["reason"], string> = {
  "offline-edits":
    "This device changed leaders or hidden units while it could not reach the server. Nothing has been sent yet.",
  conflict:
    "This device and the server both changed leaders or hidden units. Keeping one version discards the other.",
};

export function SyncConflictModal({
  reason,
  onKeepLocal,
  onUseServer,
}: SyncConflictModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Config differs from the server"
    >
      <div
        className="w-full max-w-sm rounded-[10px] p-4"
        style={{ background: "var(--panel)", color: "var(--ink)" }}
      >
        <h2 className="display text-[15px] font-semibold">Config differs from the server</h2>
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          {BODY[reason]}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onKeepLocal}
            className="min-h-[44px] rounded-[7px] px-4 text-[14px] font-semibold"
            style={{ background: "var(--accent, #3b6ea5)", color: "var(--ink)" }}
          >
            Keep this device&apos;s version
          </button>
          <button
            type="button"
            onClick={onUseServer}
            className="min-h-[44px] rounded-[7px] px-4 text-[14px] font-semibold"
            style={{ background: "var(--bg)", color: "var(--ink-soft)" }}
          >
            Use the server&apos;s version
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Check types and lint**

Run: `npx tsc --noEmit -p tsconfig.app.json && npx eslint .`
Expected: no errors. If `--accent`, `--ok`, `--warn` or `--bad` are not defined in `src/index.css`, the CSS fallbacks in the code above apply, which is intended.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: every test passes.

---

### Task 8: Wire it into the app

**Files:**
- Create: `src/lib/useSync.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `createSyncApi`, `reconcile`, `pickSynced`, `withSynced`, `saveState`, `SyncStatus`, `SyncConflictModal`.
- Produces: `useSync({ state, setState }): { status: SyncStatusValue; prompt: { reason: "offline-edits" | "conflict" } | null; keepLocal(): void; useServer(): void; noteLocalEdit(): void }`

- [ ] **Step 1: Write the hook**

The hook holds no decisions of its own: every choice comes from `reconcile`, which is already tested. Its job is timing.

```typescript
// src/lib/useSync.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { pickSynced, saveState, withSynced, type StoredState } from "./persistence";
import { createSyncApi } from "./syncApi";
import { reconcile } from "./syncReconcile";
import type { SyncStatusValue } from "../components/SyncStatus";

const POLL_MS = 10_000;
const PUSH_DEBOUNCE_MS = 300;

const api = createSyncApi();

export function useSync(
  state: StoredState,
  setState: (updater: (prev: StoredState) => StoredState) => void,
) {
  const [status, setStatus] = useState<SyncStatusValue>("synced");
  const [prompt, setPrompt] = useState<{
    reason: "offline-edits" | "conflict";
    serverRev: number;
  } | null>(null);

  // The effects below run on timers and events, so they read the current
  // state through a ref rather than closing over a stale copy.
  const stateRef = useRef(state);
  stateRef.current = state;
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(
    async (baseRev: number) => {
      const current = stateRef.current;
      const result = await api.put(baseRev, pickSynced(current));
      if (result.status === "ok") {
        setState((prev) => {
          const next = withSynced(prev, pickSynced(prev), result.doc.rev, false);
          saveState(next);
          return next;
        });
        setStatus("synced");
        return;
      }
      if (result.status === "conflict") {
        setPrompt({ reason: "conflict", serverRev: result.doc.rev });
        setStatus("conflict");
        return;
      }
      setStatus("offline");
    },
    [setState],
  );

  const sync = useCallback(async () => {
    const current = stateRef.current;
    const fetched = await api.get();
    if (!fetched.ok) {
      setStatus(current.syncDirty ? "pending" : "offline");
      return;
    }
    const decision = reconcile({
      local: pickSynced(current),
      baseRev: current.syncedBaseRev,
      dirty: current.syncDirty,
      server: fetched.doc,
    });
    if (decision.action === "idle") {
      setStatus("synced");
      return;
    }
    if (decision.action === "seed") {
      await push(fetched.doc.rev);
      return;
    }
    if (decision.action === "adopt") {
      setState((prev) => {
        const next = withSynced(prev, decision.data, decision.rev, false);
        saveState(next);
        return next;
      });
      setStatus("synced");
      return;
    }
    setPrompt({ reason: decision.reason, serverRev: decision.serverRev });
    setStatus("conflict");
  }, [push, setState]);

  // Fetch on mount, when the window comes back, and on a slow poll while
  // visible. Polling is what makes a change on the PC show up on a tablet
  // that never loses focus.
  useEffect(() => {
    void sync();
    const onFocus = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !stateRef.current.syncDirty) {
        void sync();
      }
    }, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [sync]);

  const noteLocalEdit = useCallback(() => {
    setStatus("pending");
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void push(stateRef.current.syncedBaseRev);
    }, PUSH_DEBOUNCE_MS);
  }, [push]);

  const keepLocal = useCallback(() => {
    const rev = prompt?.serverRev ?? stateRef.current.syncedBaseRev;
    setPrompt(null);
    void push(rev);
  }, [prompt, push]);

  const useServer = useCallback(async () => {
    setPrompt(null);
    const fetched = await api.get();
    if (!fetched.ok) {
      setStatus("offline");
      return;
    }
    setState((prev) => {
      const next = withSynced(prev, fetched.doc.data, fetched.doc.rev, false);
      saveState(next);
      return next;
    });
    setStatus("synced");
  }, [setState]);

  return { status, prompt, keepLocal, useServer, noteLocalEdit };
}
```

- [ ] **Step 2: Mark synced edits dirty in `src/App.tsx`**

The two handlers that change synced fields must set `syncDirty` before saving, so a failed push leaves an accurate flag. Find the handlers that write `leaderAssignments` and `hiddenUnitIds` (around lines 154 and 168, the ones called by `LeaderAssignmentScreen` and `UnitVisibilityPanel` through `ArmyConfigScreen`) and add `syncDirty: true` to the object they build, then call `sync.noteLocalEdit()` after `setState`.

For example, a handler that currently reads:

```typescript
      const nextState: StoredState = {
        ...prev,
        leaderAssignments: nextAssignments,
      };
      saveState(nextState);
      return nextState;
```

becomes:

```typescript
      const nextState: StoredState = {
        ...prev,
        leaderAssignments: nextAssignments,
        syncDirty: true,
      };
      saveState(nextState);
      return nextState;
```

Leave `handleCountChange` and `handleChangeLang` untouched: those fields are device-local.

- [ ] **Step 3: Render the indicator and the prompt**

Add the imports:

```typescript
import { useSync } from "./lib/useSync";
import { SyncStatus } from "./components/SyncStatus";
import { SyncConflictModal } from "./components/SyncConflictModal";
```

Call the hook next to the other state in `App`:

```typescript
  const sync = useSync(state, setState);
```

Add the indicator to the header's toggle group, before `<LangToggle …/>`:

```tsx
            <SyncStatus status={sync.status} />
```

And render the prompt at the end of the outermost element returned by `App`:

```tsx
        {sync.prompt && (
          <SyncConflictModal
            reason={sync.prompt.reason}
            onKeepLocal={sync.keepLocal}
            onUseServer={sync.useServer}
          />
        )}
```

- [ ] **Step 4: Type check, lint, and run the suite**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json && npx eslint .`
Expected: all tests pass, no type errors, no new lint errors.

- [ ] **Step 5: Verify in the browser**

Start the dev server through the Browser pane's `preview_start` with the `waha-dev` config. Then:

1. Delete `data/state.json` if it exists, and reload. Configure a leader on an army. Confirm `data/state.json` appears and contains that assignment.
2. Open a second browser tab on the same URL. Confirm it shows the same leader assignment within the poll interval.
3. Change a hidden unit in the second tab. Confirm the first tab picks it up within the poll interval.
4. Stop the server. Change a leader assignment. Confirm the indicator turns to pending or offline and no error appears.
5. Start the server again. Confirm the prompt appears rather than a silent push, and that choosing "Keep this device's version" writes the change to `data/state.json`.

Report the outcome of each of the five checks.

---

## Self-Review Notes

- **Spec coverage.** Section 2 of the spec maps to Task 4, section 3 to Task 3, section 4 to Task 1, section 5 to Task 2, section 6 to Tasks 5, 6 and 8, section 7 to Task 7, section 8 to the file lists throughout, and section 9 to the test steps in each task.
- **The `data/` directory** is created by the Vite plugin on first request rather than committed, since the repo has no place for an empty directory.
- **The debounce and poll intervals** come from the spec verbatim: 300 ms and 10 seconds.
