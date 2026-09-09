# Synced army config

*Leader assignments and hidden units live on the PC, not in the browser, so
the same configuration shows up on every device.*

---

## 1. What this solves

Today every piece of app state lives in `localStorage` (`src/lib/persistence.ts`).
That storage is per-browser and per-device: configure Grey Knights on the PC and
the tablet still shows the old leader assignments. The app is used from both, so
the army-list configuration has to live somewhere both can read.

"Somewhere" is the PC. The tablet already loads the app from the PC's Vite
server over Wi-Fi, so the same server can hold the state.

**Non-goals.** No accounts, no multi-user, no hosted service, no conflict
merging beyond "pick a side". Live model counts and UI language stay per-device.

---

## 2. What syncs

| Field | Synced | Why |
|---|---|---|
| `leaderAssignments` | yes | Army-list configuration, the point of this work |
| `hiddenUnitIds` | yes | Army-list configuration |
| `modelCounts` | no | Battle state, changes every turn, meaningless on the other device |
| `lang` | no | Per-device preference |
| `selectedArmyId` | no | Never restored across reloads today |

The synced set is one exported list in `persistence.ts`. Adding a field later
means adding its name there, not touching the sync machinery.

---

## 3. Where the API lives

A Vite plugin registers the routes on the server that already runs, via
`configureServer` and `configurePreviewServer`. `npm run dev` therefore starts
the app and the API together on port 5173, which is the URL the tablet already
uses. No second process, no second port, no cross-origin setup.

The request handlers themselves take a directory path and a request/response
pair and know nothing about Vite, so moving to a hosted Node service later is a
matter of calling them from a different entry point.

---

## 4. Storage format

One file, `data/state.json`, gitignored:

```json
{
  "rev": 7,
  "updatedAt": "2026-09-09T11:00:00.000Z",
  "data": {
    "leaderAssignments": { "leaderUnitId": "unitId" },
    "hiddenUnitIds": { "unitId": true }
  }
}
```

- `rev` is an integer bumped on every accepted write. A missing file reads as
  `rev: 0` with empty data.
- Writes go to a temp file in the same directory and are renamed into place, so
  an interrupted write cannot leave a truncated file.
- A file that fails to parse is treated as missing, with a warning logged.

`rev` is used rather than comparing timestamps because the PC and tablet clocks
drift independently. `updatedAt` is informational only.

---

## 5. API

### `GET /api/state`

Returns `200 { rev, updatedAt, data }`. Always succeeds; a missing file yields
`rev: 0`, `updatedAt: null`, and empty maps.

### `PUT /api/state`

Body: `{ baseRev: number, data: SyncedState }`.

- `200 { rev, updatedAt, data }` when `baseRev` matches the stored `rev`. The
  stored revision becomes `baseRev + 1`.
- `409 { rev, updatedAt, data }` carrying the server's current document when
  `baseRev` is stale. The client resolves this by asking the user.
- `400` on a malformed body, `413` over 1 MB.

Unknown keys inside `data` are dropped; values are normalized the same way
`loadState` normalizes browser storage.

---

## 6. Client behavior

`localStorage` keeps its current role as the instant-paint cache and gains two
bookkeeping fields:

- `syncedBaseRev` — the revision this device's synced fields came from.
- `syncDirty` — true when synced fields changed and the server has not accepted
  them yet.

**Editing.** Every config edit writes to `localStorage` immediately and attempts
a push, debounced by 300 ms so a run of toggles becomes one request. A
successful push clears `syncDirty` and stores the new revision. A failed push
leaves `syncDirty` set. So a set `syncDirty` means, by construction, edits the
server has never seen: edits made while disconnected. A push rejected with 409
is the exception, and shows the prompt immediately rather than waiting for the
next fetch.

**Fetching.** The app fetches on load, on `focus`, on `visibilitychange` to
visible, on the `online` event, and on a 10 second poll while the document is
visible. The poll runs even with unsent edits, because that is how a device
that failed to push notices the server is reachable again.

A fetch is skipped entirely while a push is scheduled or in flight. Without
that guard, the dirty flag set by an edit is visible to a fetch during the
debounce window, and the user is asked about edits that are a fraction of a
second from pushing cleanly.

**Reconciling.** A pure function takes the local synced data, `syncedBaseRev`,
`syncDirty`, and the server document, and returns one of:

| Condition | Action |
|---|---|
| Server is empty (`rev: 0`) and this device has data | `push` (first-run seed, nothing can be lost) |
| Not dirty, `server.rev === syncedBaseRev` | `idle` |
| Not dirty, revisions differ | `adopt` the server copy |
| Dirty, `server.rev === syncedBaseRev` | `ask`, reason `offline-edits` |
| Dirty, revisions differ | `ask`, reason `conflict` |

Offline edits are never pushed silently, per the requirement that playing with a
configuration offline should not commit it. The one exception is the first-run
seed, where the server holds nothing and adopting would destroy the config this
device already has.

**The prompt.** A modal naming what differs, with two choices:

- *Keep this device's version* pushes local data using the server's current
  revision as the base, overwriting the server.
- *Use the server's version* discards local synced fields and adopts the server
  copy.

Either choice clears `syncDirty`. The modal is the only path that can discard
data, and it is always explicit.

---

## 7. UI

A compact status sits with the existing header toggles (`LangToggle`,
`WakeLockToggle`, `VoiceToggle`), showing one of:

- **Synced** — last request succeeded, nothing pending.
- **Offline** — last request failed.
- **Pending** — local edits the server has not accepted.
- **Conflict** — waiting on the modal.

---

## 8. Modules

| File | Responsibility |
|---|---|
| `server/stateStore.mjs` | Read and write `data/state.json` atomically; revision checks |
| `server/stateRoutes.mjs` | Request handling for the two routes, Vite-agnostic |
| `server/vitePlugin.mjs` | Registers the routes on the dev and preview servers |
| `src/lib/syncReconcile.ts` | The pure decision function of section 6 |
| `src/lib/syncClient.ts` | Fetch, push, retry triggers, status; injectable `fetch` |
| `src/components/SyncStatus.tsx` | Header indicator |
| `src/components/SyncConflictModal.tsx` | The two-choice prompt |

Changed: `src/lib/persistence.ts` (synced/local split, version 1 to 2
migration), `src/App.tsx` (wire the client), `vite.config.ts` (register the
plugin), `.gitignore` (the data file).

The `version` bump from 1 to 2 migrates rather than resets: an existing
version 1 document keeps its leader assignments and hidden units, gaining
`syncedBaseRev: 0` and `syncDirty: false`. The seed rule then pushes that
configuration to the empty server on first connect without a prompt.

---

## 9. Testing

- **`syncReconcile`** covers each row of the table in section 6 directly.
- **`stateStore`** runs against a temp directory: missing file, create, read
  back, stale revision rejected, unparseable file treated as missing.
- **`stateRoutes`** covers status codes for read, accepted write, conflicting
  write, malformed body.
- **`persistence`** covers the version 1 migration and the synced/local split.
- **`syncClient`** uses an injected `fetch` for success, conflict, and network
  failure.
- **Browser check**: two windows against the same server, a config change in one
  appearing in the other, and an offline edit producing the prompt rather than a
  silent push.
