# Army Panel UI (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working two-panel screen where each side independently picks one of the discovered armies (from `armies/`) and renders its collapsed unit list, with the selection persisted across reloads.

**Architecture:** `App` owns a `StoredState` (selected army per side + model counts, currently unused), initialized from `src/lib/persistence.ts` and resolved against `src/lib/armies.ts`'s discovered list. It renders two `ArmyPanel`s, each showing either an `ArmyPicker` (no army selected yet) or a `PanelHeader` + `UnitList` of collapsed `UnitRow`s. Styling runs on Tailwind v4 utilities for layout plus the CSS custom properties `ui-guide.md` §3 defines for the palette — no component library, no icons.

**Tech Stack:** Existing Vite + React + TypeScript + Vitest. Adds Tailwind v4 (`tailwindcss` + `@tailwindcss/vite`) and IBM Plex Sans/Mono via Google Fonts.

**Spec:** [docs/ui-guide.md](ui-guide.md) (primary — see §§1-9), [docs/army-data-architecture.md](army-data-architecture.md) (persistence/discovery this plan wires into)

## Global Constraints

- Design tokens are exact hex values from `ui-guide.md` §3: `--paper:#E9EBE7 --paper-sunk:#DDE0DB --rule:#B4B9B2 --ink:#14181A --ink-soft:#5A625F --side-a:#2D6E5B --side-b:#7A3B6E --warn:#9A3412`. Never hardcode a hex value in a component — reference these.
- Typography: IBM Plex Sans for names/labels, IBM Plex Mono (`font-variant-numeric: tabular-nums`) for every numeral. Scale is 12/13/15/18/22px — use these exact sizes, not a generic type scale.
- Side identity is a 4px accent spine on the panel's own left edge (`--side-a` / `--side-b`), never a background wash. The two panels are otherwise the identical component.
- No icons, no rounded cards/shadows, no gradients, no hover/entrance animations, no search box, no army-swap button (`ui-guide.md` §6, §8).
- `ArmyPicker` (empty state): one row per discovered army — catalogue as primary line, detachment + roster name as secondary, points right-aligned in mono. Tapping loads it. No control to go back to the picker once loaded (`ui-guide.md` §6 `ArmyPicker`, §7).
- A file in `armies/` that fails to parse is skipped from the picker and logged to the console, not shown as a per-panel error (`ui-guide.md` §7).
- Only selection + model counts persist to `localStorage` via the existing `src/lib/persistence.ts` (`loadState`/`saveState`/`resolveSelectedArmyId`) — do not re-derive or duplicate that logic.
- Out of scope for this plan (later `ui-guide.md` build-order steps): unit expansion, `StatStrip`, `WeaponTable`, `ModelCounter`, responsive/portrait layout, the result drawer's content. The top-level layout must still reserve a zero-height slot for that drawer so adding it later isn't a restructure (`ui-guide.md` §4).

---

### Task 1: Styling foundation — Tailwind v4 + design tokens + IBM Plex

**Files:**
- Modify: `package.json` (add `tailwindcss`, `@tailwindcss/vite` via `npm install`)
- Modify: `vite.config.ts`
- Modify: `index.html` (font links)
- Modify: `src/index.css` (full rewrite)

**Interfaces:**
- Consumes: nothing.
- Produces: the CSS custom properties `--paper`, `--paper-sunk`, `--rule`, `--ink`, `--ink-soft`, `--side-a`, `--side-b`, `--warn`, `--font-sans`, `--font-mono`, and a `.mono` utility class — every later task's components reference these by name.

- [ ] **Step 1: Install Tailwind v4**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Register the Tailwind Vite plugin**

Edit `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 3: Load IBM Plex fonts**

Edit `index.html`, inside `<head>`, before the existing `<title>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 4: Replace `src/index.css` with the design tokens**

```css
@import "tailwindcss";

:root {
  color-scheme: light;

  --paper: #e9ebe7;
  --paper-sunk: #dde0db;
  --rule: #b4b9b2;
  --ink: #14181a;
  --ink-soft: #5a625f;

  --side-a: #2d6e5b;
  --side-b: #7a3b6e;

  --warn: #9a3412;

  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
}

.mono {
  font-family: var(--font-mono);
}
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: succeeds with no errors (confirms the Tailwind plugin and `@import "tailwindcss"` resolve correctly).

- [ ] **Step 6: Verify visually**

Run: `npm run dev`, open the app in a browser.
Expected: the page background is the cool off-white `--paper` tone (not pure white), and the "40k Combat Assistant" heading renders in IBM Plex Sans (check the browser's font inspector or just note the distinct geometric look vs. the previous system-ui default). Stop the dev server after checking.

---

### Task 2: `armies.ts` — skip files that fail to parse

**Files:**
- Modify: `src/lib/armies.ts`
- Test: `src/lib/armies.test.ts` (extend, existing tests unchanged)

**Interfaces:**
- Consumes: `parseRoster(json: unknown): ParsedArmy` (existing, from `parseRoster.mjs` / `parseRoster.d.mts`).
- Produces: `buildArmyEntries(files: Record<string, { default: unknown }>): ArmyEntry[]` — a new exported pure function later tasks do not need directly, but which this task's test exercises without touching the real `armies/` folder. `armies: ArmyEntry[]` (existing export) is unchanged in shape and behavior for well-formed files.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/armies.test.ts` (keep the existing three tests as-is, add this new `describe` block and the `vi` import):

```ts
import { describe, expect, it, vi } from "vitest";
import { armies, buildArmyEntries } from "./armies";
```

```ts
describe("buildArmyEntries", () => {
  it("skips a file that fails to parse and logs why, keeping the rest", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const validRoster = {
      roster: {
        name: "Test Army",
        gameSystemName: "Warhammer 40,000 10th Edition",
        generatedBy: "test",
        costs: [],
        costLimits: [],
        forces: [
          {
            name: "Army Roster",
            catalogueName: "Test Catalogue",
            catalogueRevision: 1,
            selections: [],
          },
        ],
      },
    };

    const files = {
      "/armies/broken.json": { default: { roster: null } },
      "/armies/valid.json": { default: validRoster },
    };

    const entries = buildArmyEntries(files);

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("valid");
    expect(entries[0].parsed.catalogue).toBe("Test Catalogue");
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/lib/armies.test.ts`
Expected: FAIL — `buildArmyEntries` is not exported from `./armies` yet.

- [ ] **Step 3: Implement the fix**

Replace the contents of `src/lib/armies.ts`:

```ts
import { parseRoster } from "../../parseRoster.mjs";
import type { ParsedArmy } from "../../parseRoster.mjs";

export interface ArmyEntry {
  id: string;
  fileName: string;
  parsed: ParsedArmy;
}

export function buildArmyEntries(
  files: Record<string, { default: unknown }>,
): ArmyEntry[] {
  const entries: ArmyEntry[] = [];
  for (const [path, mod] of Object.entries(files)) {
    const id = path.replace(/^\/armies\//, "").replace(/\.json$/, "");
    try {
      entries.push({ id, fileName: path, parsed: parseRoster(mod.default) });
    } catch (err) {
      console.error(`Skipping ${path}: failed to parse`, err);
    }
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

const files = import.meta.glob<{ default: unknown }>("/armies/*.json", {
  eager: true,
});

export const armies: ArmyEntry[] = buildArmyEntries(files);
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/lib/armies.test.ts`
Expected: PASS — 4 tests passed (3 existing + this new one).

- [ ] **Step 5: Run the full unit suite and build**

Run: `npm run test:unit && npm run build`
Expected: both succeed — 9 total unit tests passing (4 in `armies.test.ts` + 5 in `persistence.test.ts`).

---

### Task 3: `ArmyPanel` component tree + `App` wiring

**Files:**
- Create: `src/components/ArmyPicker.tsx`
- Create: `src/components/PanelHeader.tsx`
- Create: `src/components/UnitRow.tsx`
- Create: `src/components/UnitList.tsx`
- Create: `src/components/ArmyPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ArmyEntry` and `armies` from `src/lib/armies.ts` (Task 2); `StoredState`, `loadState`, `saveState`, `resolveSelectedArmyId` from `src/lib/persistence.ts` (already exists — see `army-data-architecture-plan.md` Task 2); `ParsedArmy`/`ParsedUnit` types from `parseRoster.mjs`; the CSS custom properties from Task 1.
- Produces: `ArmyPanel` (default export from `src/components/ArmyPanel.tsx`) and its `Side = "a" | "b"` type export — nothing later in this plan consumes these further, but the next `ui-guide.md` build-order phase (expansion) will extend `ArmyPanelProps` here.

**Note on scope:** `ui-guide.md` §5's `ArmyPanelProps` also lists `selectedUnitId`, `onSelectUnit`, `counts`, `onCountChange` — those belong to the expansion/calculator phase (`ui-guide.md` build order step 2+) and are not implemented here. Adding unused props now would fail this project's strict TypeScript settings and serves no purpose yet; they're added in the plan that implements expansion.

This task has no component-level automated tests (agreed during design: component tests would need a new jsdom/Testing Library dependency chain not otherwise needed). Verification is a real browser check against the dev server, run by the plan's executor as the task's test cycle.

- [ ] **Step 1: `ArmyPicker`**

Create `src/components/ArmyPicker.tsx`:

```tsx
import type { ArmyEntry } from "../lib/armies";

interface ArmyPickerProps {
  armies: ArmyEntry[];
  onSelectArmy: (armyId: string) => void;
}

export function ArmyPicker({ armies, onSelectArmy }: ArmyPickerProps) {
  if (armies.length === 0) {
    return (
      <div className="p-4 text-[13px] text-[var(--ink-soft)]">
        No armies found. Add a New Recruit JSON export to the{" "}
        <code>armies/</code> folder.
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {armies.map((army) => (
        <li key={army.id}>
          <button
            type="button"
            onClick={() => onSelectArmy(army.id)}
            className="w-full min-h-[44px] text-left px-4 py-3 border-b border-[var(--rule)] flex items-baseline justify-between gap-2"
          >
            <span>
              <span className="block text-[18px] font-semibold">
                {army.parsed.catalogue}
              </span>
              <span className="block text-[13px] text-[var(--ink-soft)]">
                {[army.parsed.detachment, army.parsed.name]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="mono text-[15px] shrink-0">
              {army.parsed.pointsTotal ?? "—"}pts
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: `PanelHeader`**

Create `src/components/PanelHeader.tsx`:

```tsx
import type { ParsedArmy } from "../../parseRoster.mjs";

interface PanelHeaderProps {
  army: ParsedArmy;
}

export function PanelHeader({ army }: PanelHeaderProps) {
  return (
    <header className="sticky top-0 shrink-0 px-4 py-3 flex items-baseline justify-between gap-2 bg-[var(--paper)] border-b border-[var(--rule)]">
      <span>
        <span className="block text-[18px] font-semibold">
          {army.catalogue}
        </span>
        <span className="block text-[13px] text-[var(--ink-soft)]">
          {[army.detachment, army.name].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="mono text-[15px] shrink-0">
        {army.pointsTotal ?? "—"}pts
      </span>
    </header>
  );
}
```

- [ ] **Step 3: `UnitRow`**

Create `src/components/UnitRow.tsx`:

```tsx
import type { ParsedUnit } from "../../parseRoster.mjs";

interface UnitRowProps {
  unit: ParsedUnit;
}

export function UnitRow({ unit }: UnitRowProps) {
  return (
    <li className="h-[48px] flex items-center justify-between px-4 border-b border-[var(--rule)]">
      <span>
        {unit.name}
        {unit.isWarlord ? " ★" : ""}
      </span>
      <span className="mono text-[15px]">
        {unit.modelCount}/{unit.modelCount}
      </span>
    </li>
  );
}
```

- [ ] **Step 4: `UnitList`**

Create `src/components/UnitList.tsx`:

```tsx
import type { ParsedUnit } from "../../parseRoster.mjs";
import { UnitRow } from "./UnitRow";

interface UnitListProps {
  units: ParsedUnit[];
}

export function UnitList({ units }: UnitListProps) {
  return (
    <ul className="flex-1 min-h-0 overflow-y-auto">
      {units.map((unit) => (
        <UnitRow key={unit.id} unit={unit} />
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: `ArmyPanel`**

Create `src/components/ArmyPanel.tsx`:

```tsx
import type { ArmyEntry } from "../lib/armies";
import { ArmyPicker } from "./ArmyPicker";
import { PanelHeader } from "./PanelHeader";
import { UnitList } from "./UnitList";

export type Side = "a" | "b";

interface ArmyPanelProps {
  side: Side;
  armies: ArmyEntry[];
  selectedArmyId: string | null;
  onSelectArmy: (armyId: string) => void;
}

const ACCENT: Record<Side, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
};

export function ArmyPanel({
  side,
  armies,
  selectedArmyId,
  onSelectArmy,
}: ArmyPanelProps) {
  const selected = armies.find((a) => a.id === selectedArmyId) ?? null;

  return (
    <section
      className="flex flex-col flex-1 min-w-0 h-full overflow-hidden"
      style={{
        borderLeft: `4px solid ${ACCENT[side]}`,
        borderRight: side === "a" ? "1px solid var(--rule)" : undefined,
      }}
    >
      {selected ? (
        <>
          <PanelHeader army={selected.parsed} />
          <UnitList units={selected.parsed.units} />
        </>
      ) : (
        <ArmyPicker armies={armies} onSelectArmy={onSelectArmy} />
      )}
    </section>
  );
}
```

- [ ] **Step 6: Wire `App`**

Replace the contents of `src/App.tsx`:

```tsx
import { useState } from "react";
import { armies } from "./lib/armies";
import {
  loadState,
  resolveSelectedArmyId,
  saveState,
  type StoredState,
} from "./lib/persistence";
import { ArmyPanel, type Side } from "./components/ArmyPanel";

const armyIds = armies.map((a) => a.id);

function initialState(): StoredState {
  const stored = loadState();
  return {
    ...stored,
    selectedArmyId: {
      a: resolveSelectedArmyId(stored.selectedArmyId.a, armyIds),
      b: resolveSelectedArmyId(stored.selectedArmyId.b, armyIds),
    },
  };
}

function App() {
  const [state, setState] = useState<StoredState>(initialState);

  function handleSelectArmy(side: Side, armyId: string) {
    setState((prev) => {
      const next: StoredState = {
        ...prev,
        selectedArmyId: { ...prev.selectedArmyId, [side]: armyId },
      };
      saveState(next);
      return next;
    });
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex flex-1 min-h-0">
        <ArmyPanel
          side="a"
          armies={armies}
          selectedArmyId={state.selectedArmyId.a}
          onSelectArmy={(id) => handleSelectArmy("a", id)}
        />
        <ArmyPanel
          side="b"
          armies={armies}
          selectedArmyId={state.selectedArmyId.b}
          onSelectArmy={(id) => handleSelectArmy("b", id)}
        />
      </div>
      <div className="h-0 shrink-0" aria-hidden />
    </div>
  );
}

export default App;
```

- [ ] **Step 7: Typecheck and build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 8: Browser verification**

Run: `npm run dev`, open the app in a browser, and confirm all of the following before considering this task done:

1. Both panels initially show `ArmyPicker`: two rows each, "Imperium - Grey Knights" (2000pts) and "Imperium - Adeptus Custodes" (1990pts), left panel's rows tinted with the green `--side-a` accent, right panel's with the plum `--side-b` accent.
2. Tapping a row in the left panel loads it: header shows catalogue/detachment/roster-name/points, and the unit list below shows one 48px row per unit with `N/N` model counts.
3. "Grand Master Voldus" (or whichever unit has `isWarlord: true` in the loaded army) shows a `★` after its name.
4. The right panel independently picks the other army the same way.
5. Reload the page (full browser refresh, not just HMR) — both panels come back exactly as left, with no picker shown, confirming `localStorage` persistence round-trips correctly.
6. No console errors.

Stop the dev server once confirmed.

- [ ] **Step 9: Run the full test suite**

Run: `npm test && npm run test:unit && npm run lint`
Expected: all three succeed (parser eyeball script runs, 9 unit tests pass, lint is clean).
