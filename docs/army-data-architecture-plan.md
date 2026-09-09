# Army Data Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make army rosters discoverable from a plain `armies/` folder and give the app a tested, typed way to load and persist which two armies are in play.

**Architecture:** A `src/lib/armies.ts` module uses Vite's `import.meta.glob` to eagerly discover and parse every JSON file in a root-level `armies/` folder at build/dev time — no manifest, no upload code. A separate `src/lib/persistence.ts` module handles saving/loading which army is picked per side plus live model counts to `localStorage`, versioned so a future shape change can be detected and discarded safely.

**Tech Stack:** Existing Vite + React + TypeScript app. Adds Vitest as a devDependency — it shares Vite's transform pipeline, so it's the only practical way to unit-test code that uses `import.meta.glob` (a Vite-only feature that doesn't exist under plain Node).

**Spec:** [docs/army-data-architecture.md](army-data-architecture.md)

## Global Constraints

- Armies live at project root under `armies/*.json`, one raw New Recruit JSON export per file — no manifest file, the folder contents are the source of truth (spec §2).
- Discovery is **eager**: `import.meta.glob('/armies/*.json', { eager: true })`, parsed once at module load and cached in memory (spec §3).
- Only selection + live game state persist to `localStorage`, never roster content — key `waha:state`, shape `{ version: 1, selectedArmyId: { a, b }, modelCounts }` (spec §5).
- `parseRoster.mjs` stays unchanged at root — add type declarations only, do not rewrite parser logic (spec §6).
- Out of scope: upload/drop-zone import, `.rosz`/`.ros` support, and wiring any of this into the `ArmyPanel` UI — that's `ui-guide.md`'s build order, not this plan (spec §1, §7).
- This project has no git repository (`git status` confirms "not a git repository"). Skip every commit step below — each task's completion is verified by its tests and `npm run build` passing instead.

---

### Task 1: Army folder + discovery module (`src/lib/armies.ts`)

**Files:**
- Create: `armies/grey-knights.json` (moved from root `Grey all.json`)
- Delete: `Grey all.json` (root)
- Create: `parseRoster.d.mts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest` devDependency + `test:unit` script — via `npm install`, not a manual edit)
- Create: `src/lib/armies.ts`
- Test: `src/lib/armies.test.ts`

**Interfaces:**
- Consumes: `parseRoster(json: unknown): ParsedArmy` and the `ParsedArmy` type from `parseRoster.mjs` / `parseRoster.d.mts` (existing export, now typed).
- Produces: `armies: ArmyEntry[]` where `interface ArmyEntry { id: string; fileName: string; parsed: ParsedArmy }` — this is what Task 2 and any future UI work import from `src/lib/armies.ts`.

- [ ] **Step 1: Move the fixture into `armies/`**

```bash
mkdir -p armies
mv "Grey all.json" "armies/grey-knights.json"
```

- [ ] **Step 2: Verify the move didn't corrupt the file**

Run: `node -e "JSON.parse(require('fs').readFileSync('armies/grey-knights.json','utf-8')); console.log('valid json')"`
Expected: prints `valid json` with no error.

- [ ] **Step 3: Add type declarations for the parser**

Create `parseRoster.d.mts` (colocated with `parseRoster.mjs`, same base name so TypeScript's bundler resolution picks it up automatically for `import ... from "./parseRoster.mjs"`):

```ts
export interface DiceExpr {
  dice: number;
  sides: number;
  flat: number;
  raw: string;
  avg: number | null;
}

export interface Invuln {
  value: number;
  conditional: boolean;
}

export interface ModelEntry {
  name: string;
  count: number;
  group: string | null;
}

export interface Enhancement {
  name: string;
  points: number;
}

export interface Ability {
  name: string;
  text: string | null;
}

export interface WeaponEntry {
  profileId: string;
  name: string;
  subProfile: boolean;
  type: "ranged" | "melee";
  count: number;
  range: string | null;
  attacks: DiceExpr | null;
  skill: number | null;
  skillRaw: string | null;
  strength: number;
  ap: number;
  damage: DiceExpr | null;
  keywords: string[];
}

export interface UnitProfile {
  M: string | null;
  T: number | null;
  SV: number | null;
  W: number | null;
  LD: string | null;
  OC: number | null;
}

export interface ParsedUnit {
  id: string;
  name: string;
  kind: string;
  basePoints: number;
  totalPoints: number;
  modelCount: number;
  models: ModelEntry[];
  profile: UnitProfile;
  invuln: Invuln | null;
  keywords: string[];
  faction: string | null;
  isWarlord: boolean;
  enhancements: Enhancement[];
  weapons: WeaponEntry[];
  abilities: Ability[];
}

export interface ParsedArmy {
  name: string;
  system: string;
  catalogue: string;
  catalogueRevision: number;
  generatedBy: string;
  pointsLimit: number | null;
  pointsTotal: number | null;
  battleSize?: string | null;
  detachment?: string | null;
  detachmentRules?: string[];
  units: ParsedUnit[];
}

export function parseRoster(json: unknown): ParsedArmy;
export function parseDice(raw: unknown): DiceExpr | null;
export function parseSkill(raw: unknown): number | null;
export function parseKeywords(raw: unknown): string[];
export function parseInvuln(profileName: string | null | undefined): Invuln | null;
```

- [ ] **Step 4: Add Vitest**

```bash
npm install -D vitest
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

Edit `package.json` `scripts` to add (keep every existing script as-is):

```json
"test:unit": "vitest run"
```

- [ ] **Step 5: Write the failing test**

Create `src/lib/armies.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { armies } from "./armies";

describe("armies", () => {
  it("discovers every JSON file in armies/", () => {
    expect(armies.length).toBeGreaterThan(0);
  });

  it("ids never carry a file extension", () => {
    for (const army of armies) {
      expect(army.id.endsWith(".json")).toBe(false);
    }
  });

  it("parses the grey-knights fixture into a full ParsedArmy", () => {
    const entry = armies.find((a) => a.id === "grey-knights");
    expect(entry).toBeDefined();
    expect(entry!.parsed.catalogue).toBe("Imperium - Grey Knights");
    expect(
      entry!.parsed.units.some((u) => u.name === "Castellan Crowe"),
    ).toBe(true);
  });
});
```

- [ ] **Step 6: Run the test, verify it fails**

Run: `npx vitest run src/lib/armies.test.ts`
Expected: FAIL — `src/lib/armies.ts` does not exist yet (module resolution error).

- [ ] **Step 7: Implement the discovery module**

Create `src/lib/armies.ts`:

```ts
import { parseRoster } from "../../parseRoster.mjs";
import type { ParsedArmy } from "../../parseRoster.mjs";

export interface ArmyEntry {
  id: string;
  fileName: string;
  parsed: ParsedArmy;
}

const files = import.meta.glob<{ default: unknown }>("/armies/*.json", {
  eager: true,
});

export const armies: ArmyEntry[] = Object.entries(files)
  .map(([path, mod]) => {
    const id = path.replace(/^\/armies\//, "").replace(/\.json$/, "");
    return { id, fileName: path, parsed: parseRoster(mod.default) };
  })
  .sort((a, b) => a.id.localeCompare(b.id));
```

- [ ] **Step 8: Run the test, verify it passes**

Run: `npx vitest run src/lib/armies.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 9: Confirm the app still typechecks and builds**

Run: `npm run build`
Expected: succeeds with no TypeScript errors (confirms `parseRoster.d.mts` resolves correctly and `import.meta.glob` compiles for production, not just under Vitest).

---

### Task 2: Persistence module (`src/lib/persistence.ts`)

**Files:**
- Create: `src/lib/persistence.ts`
- Test: `src/lib/persistence.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 — this module is self-contained.
- Produces: `emptyState(): StoredState`, `loadState(storage?: StorageLike): StoredState`, `saveState(state: StoredState, storage?: StorageLike): void`, `resolveSelectedArmyId(id: string | null, availableIds: readonly string[]): string | null`, and the `StoredState` / `StorageLike` types — this is what the future picker UI (not part of this plan) will import to read/write selection and model counts.

- [ ] **Step 1: Write the failing test**

Create `src/lib/persistence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  emptyState,
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
      version: 1,
      selectedArmyId: { a: "grey-knights", b: null },
      modelCounts: { "u1:w1": 3 },
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
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/lib/persistence.test.ts`
Expected: FAIL — `src/lib/persistence.ts` does not exist yet.

- [ ] **Step 3: Implement the persistence module**

Create `src/lib/persistence.ts`:

```ts
export interface StoredState {
  version: 1;
  selectedArmyId: { a: string | null; b: string | null };
  modelCounts: Record<string, number>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "waha:state";

export function emptyState(): StoredState {
  return { version: 1, selectedArmyId: { a: null, b: null }, modelCounts: {} };
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

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { version?: unknown }).version !== 1
  ) {
    return emptyState();
  }

  const candidate = parsed as Partial<StoredState>;
  return {
    version: 1,
    selectedArmyId: {
      a: candidate.selectedArmyId?.a ?? null,
      b: candidate.selectedArmyId?.b ?? null,
    },
    modelCounts: candidate.modelCounts ?? {},
  };
}

export function saveState(
  state: StoredState,
  storage: StorageLike = window.localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resolveSelectedArmyId(
  id: string | null,
  availableIds: readonly string[],
): string | null {
  return id !== null && availableIds.includes(id) ? id : null;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/lib/persistence.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Confirm the app still typechecks and builds**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 6: Run the full unit test suite together**

Run: `npm run test:unit`
Expected: PASS — 8 tests passed across both files (3 from Task 1 + 5 from Task 2).
