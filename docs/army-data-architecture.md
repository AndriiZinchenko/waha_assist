# Army Data Architecture

*Companion to `40k-assistant-plan.md` and `parser-summary.md`. Covers one thing:
where army roster files live and how they get from disk into the two
`ArmyPanel`s.*

---

## 1. What this solves

`ui-guide.md` assumed a drop-zone/file-picker import flow straight into each
panel. That's deferred. For now, armies live as files in a folder in the repo,
and the app discovers them itself — no upload UI, no manifest to hand-maintain.

**Non-goal for this doc:** upload/drop-zone import, `.rosz`/`.ros` support, any
format beyond the existing New Recruit JSON adapter. Those come back later as
an *additional* way to add files to the same `armies/` folder — this doc only
covers the folder-based path.

---

## 2. Where army files live

A root-level `armies/` folder, sibling to `docs/` and `src/`:

```
waha/
├── armies/
│   └── grey-knights.json      ← moved from root "Grey all.json"
├── docs/
├── src/
└── parseRoster.mjs
```

Each file is a raw New Recruit JSON export, untouched. Adding an army means
dropping a file in this folder — nothing else.

---

## 3. Discovery: eager Vite glob import

`src/lib/armies.ts` discovers every file in `armies/` at build/dev time via
Vite's `import.meta.glob`, in eager mode:

```ts
import { parseRoster } from "../../parseRoster.mjs";

const files = import.meta.glob<{ default: unknown }>("/armies/*.json", {
  eager: true,
});

export const armies = Object.entries(files).map(([path, mod]) => {
  const id = path.replace(/^\/armies\//, "").replace(/\.json$/, "");
  return { id, fileName: path, parsed: parseRoster(mod.default) };
});
```

- No manifest file. The folder contents *are* the source of truth.
- Every file is parsed once, at module load, and cached in memory for the
  life of the page.
- `id` is the filename without extension (`grey-knights`) — stable as long as
  the file isn't renamed, used as the key for selection and persistence.

**Why eager over lazy:** a lazy `import.meta.glob` (loader functions instead
of parsed content) only fetches/parses the two armies actually selected,
which scales better, but adds async loading state to the picker for no real
benefit at today's file count. Revisit if the folder grows to the point where
bundling every army noticeably slows the initial load — each army export
runs roughly 100–200KB, so this is a non-issue until the folder holds several
dozen lists.

**Why not `public/` + a manifest:** static assets in `public/` aren't
glob-discoverable at runtime, so that path requires hand-maintaining a
manifest listing filenames — which defeats the point of "just drop a file in
a folder."

---

## 4. Data flow

```
armies/*.json
    │  (Vite glob, build/dev time)
    ▼
src/lib/armies.ts → [{ id, fileName, parsed: ParsedArmy }]
    │  (in-memory, computed once)
    ▼
ArmyPanel picker (side A, side B) — pick one entry by id
    │
    ▼
ArmyPanel renders the picked entry's `parsed` army
```

Each panel's picker lists every entry from `armies.ts` independently — both
panels can point at the same army, or two different filenames from the same
faction; nothing prevents that, and there's no reason to.

---

## 5. Persistence

Only **selection and live game state** persist to `localStorage` — never the
roster content itself, since that's always cheaply re-derived from the folder
by `armies.ts`:

```ts
{
  version: 1,
  selectedArmyId: { a: string | null, b: string | null },
  modelCounts: Record<string, number>,   // key: `${unitId}:${weaponProfileId}`, per ui-guide.md §5
}
```

- Stored under a single key, e.g. `waha:state`.
- On load: read this object, resolve `selectedArmyId.a` / `.b` against the
  current `armies` list. If a stored id no longer matches a file (renamed or
  deleted from `armies/`), that side falls back to unselected — not an error
  state.
- `version` exists so a future shape change can detect a stale stored object
  and discard it, rather than crash on a mismatched shape.

---

## 6. Parser integration

`parseRoster.mjs` stays where it is, at root, unchanged — it's tested and
working. `src/lib/armies.ts` imports it cross-directory
(`../../parseRoster.mjs`). Since it's plain `.mjs` with no TypeScript types,
add a hand-written `parseRoster.d.ts` next to it declaring the shape described
in `parser-summary.md` §4, so `armies.ts` and every consumer downstream gets
real types without rewriting working parser logic.

A full conversion to `.ts` is a reasonable future cleanup, not required here.

---

## 7. What changes on disk

- New: `armies/grey-knights.json` (moved from root `Grey all.json`).
- New: `src/lib/armies.ts`.
- New: `parseRoster.d.ts` alongside `parseRoster.mjs`.
- Removed: root-level `Grey all.json` (superseded by the `armies/` copy).

`test.mjs` is unaffected — its fixture is inline, not read from
`Grey all.json`.

---

## 8. Syncing from New Recruit

`scripts/sync-newrecruit.mjs` refreshes `armies/` straight from a New Recruit
account. New Recruit has no export API; the JSON file is assembled inside the
page and handed to the browser as a download, so the script drives the real app
with Playwright, opens every list, clicks Export → json and captures the file.

```
npm run sync:armies -- --login     # once: log in by hand, session saved to .newrecruit-session.json
npm run sync:armies                # headless refresh of armies/
npm run sync:armies -- --dry-run   # show what would be written
```

- File name = list name as shown in New Recruit, minus characters Windows
  rejects. Two lists that collapse to the same name get a `(list_key)` suffix.
- Every export is run through `parseRoster` first; a file that fails to parse
  is reported and skipped, never written over a good one.
- Files in `armies/` with no matching list are deleted at the end of a successful run, so the folder mirrors the account.
- `.newrecruit-session.json` holds the login tokens and is gitignored.
- The pure helpers (`scripts/lib/syncArmies.mjs`) are unit-tested; the browser
  flow uses the bundled Chromium, falling back to installed Chrome or Edge.
