# Weapon Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user change which weapons a unit's models carry (and how many models carry each set) on the configuration screen, with a permanent "not validated" warning, edits that survive an army sync, and highlighting of edited units and weapons.

**Architecture:** A new script downloads each roster unit's weapon options from New Recruit's catalogue books into generated `src/data/unit-options/*` files. Edits are stored as weapon *names* per model group in the synced config (`weaponOverrides`), never in `armies/`. A pure `applyWeaponOverrides` step rebuilds a unit's `loadouts` and `weapons` before leader bonuses are applied, so the datasheet and the calculator see the edited unit unchanged.

**Tech Stack:** TypeScript + React 18 + Vite, Vitest, Node ESM scripts with Playwright (existing New Recruit sync tooling).

**Spec:** `docs/superpowers/specs/2026-10-01-weapon-overrides-design.md`

## Global Constraints

- The app never validates an edit against the datasheet and never recalculates points. The editor shows the warning permanently.
- Roster files in `armies/` are never modified by this feature. Edits live only in the synced config.
- Overrides store weapon **names**, not stats. Stats resolve at render time from the catalogue data.
- Replacement weapons and stats come from New Recruit's library calls (`get_library`, `books_get_book_row`) via a script. Do not use New Recruit's in-browser engine or any private page internals.
- Reuse the existing parsers (`parseDice`, `parseSkill`, `parseKeywords`) for catalogue weapons. No second stat parser.
- Amber (`--negative` / `--negative-fill`) is the warning colour for everything "edited". Never a side colour (`--side-a` / `--side-b`).
- No colour literals in components; use the tokens in `src/index.css`.
- Interactive targets are at least 44px.
- Commit message trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Never `git add -A`. Add the files named in each task.
- Run commands from `C:\anzi\waha_assist`. Shell is bash.
- Pre-existing and out of scope: `npm test` (`test.mjs`) reads a roster file that no longer exists and already fails. Use `npx vitest run` as the test command.

## Review Focus

- A unit whose faction has no generated option data, or whose entry is missing: the editor says so, the calculator keeps using roster weapons, nothing crashes (Tasks 6 and 8).
- A weapon in an override that later disappears from the catalogue: it is listed as missing, the unit's other weapons still calculate (Task 6).
- The roster changes in New Recruit after an edit (unit loadouts differ, or the unit is gone): the app flags it and never applies an override to a unit that is not in the list (Task 6).
- A group with 0 models or no weapons: no crash, calculator shows no rows for it, casualty counts are cleared on every edit so a stale live count never exceeds a lowered group size (Tasks 6 and 7).
- Saved state from before this feature, or a malformed override from the server: loads as "no overrides", never throws (Task 5).

---

### Task 1: Parse the catalogue entry id

**Files:**
- Modify: `parseRoster.mjs` (the object returned by `parseUnit`, around line 392)
- Modify: `parseRoster.d.mts` (`ParsedUnit`, `WeaponEntry`)
- Create: `src/lib/parseRosterEntryId.test.ts`

**Interfaces:**
- Produces: `ParsedUnit.entryId?: string | null` (last `::` segment of the selection's `entryId`), `ParsedUnit.weaponsEdited?: boolean`, `ParsedUnit.rosterChanged?: boolean`, `ParsedUnit.missingWeapons?: string[]`, `WeaponEntry.edited?: boolean`. The last four are set only by Task 6; they are declared here so every later task compiles.

- [ ] **Step 1: Write the failing test**

Create `src/lib/parseRosterEntryId.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRoster } from "../../parseRoster.mjs";

type RosterJson = {
  roster: { forces: Array<{ selections: Array<Record<string, unknown>> }> };
};

// armies/ is a synced mirror whose file names change; any real export will do
// as a scaffold. The test edits the first unit selection and parses again.
function firstRoster(): RosterJson {
  const file = readdirSync("armies").find((f) => f.endsWith(".json"));
  return JSON.parse(readFileSync(path.join("armies", file as string), "utf8"));
}

function firstUnitSelection(json: RosterJson): Record<string, unknown> {
  const sel = json.roster.forces[0].selections.find(
    (s) => s.type === "unit" || s.type === "model",
  );
  if (!sel) throw new Error("scaffold roster has no unit");
  return sel;
}

describe("parseRoster entryId", () => {
  it("takes the last '::' segment of the selection's entryId", () => {
    const json = firstRoster();
    firstUnitSelection(json).entryId = "catalogue-1::entry-9";
    expect(parseRoster(json).units[0].entryId).toBe("entry-9");
  });

  it("keeps an entryId that has no '::' as it is", () => {
    const json = firstRoster();
    firstUnitSelection(json).entryId = "entry-9";
    expect(parseRoster(json).units[0].entryId).toBe("entry-9");
  });

  it("is null when the export carries no entryId", () => {
    const json = firstRoster();
    delete firstUnitSelection(json).entryId;
    expect(parseRoster(json).units[0].entryId).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/parseRosterEntryId.test.ts`
Expected: FAIL (`entryId` is `undefined`, not `"entry-9"`).

- [ ] **Step 3: Implement**

In `parseRoster.mjs`, in the object returned by `parseUnit`, directly after the line `id: sel.id,` add:

```js
    // The unit's entry in the New Recruit catalogue: the last "::" segment of
    // the selection's "<catalogueId>::<entryId>". Used to look up the weapons
    // the datasheet offers (src/data/unit-options).
    entryId:
      typeof sel.entryId === "string" && sel.entryId ? sel.entryId.split("::").pop() : null,
```

In `parseRoster.d.mts`, inside `interface ParsedUnit`, after `id: string;` add:

```ts
  /** The unit's entry id in the New Recruit catalogue (last "::" segment of
   * the selection's entryId); null when the export carries none. */
  entryId?: string | null;
```

Still in `parseRoster.d.mts`, at the end of `interface ParsedUnit` (before its closing brace) add:

```ts
  /** App-level (not roster): the unit's weapons were replaced by a weapon
   * override. Set only by `applyWeaponOverride`. */
  weaponsEdited?: boolean;
  /** App-level: the roster unit's loadouts differ from when the override
   * was made. */
  rosterChanged?: boolean;
  /** App-level: override weapons found neither in the catalogue nor on the
   * roster unit. */
  missingWeapons?: string[];
```

and at the end of `interface WeaponEntry` (after `leaderMods?: RuleRef[];`) add:

```ts
  /** App-level: this weapon differs from the roster's (added, or a
   * different number of it) because of a weapon override. */
  edited?: boolean;
```

- [ ] **Step 4: Run tests and type-check**

Run: `npx vitest run src/lib/parseRosterEntryId.test.ts && npx tsc -b`
Expected: 3 tests pass, `tsc` exits 0.

- [ ] **Step 5: Commit**

```bash
git add parseRoster.mjs parseRoster.d.mts src/lib/parseRosterEntryId.test.ts
git commit -m "Parse each unit's catalogue entry id

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Share the New Recruit session code between sync scripts

**Files:**
- Create: `scripts/lib/nrSession.mjs`
- Modify: `scripts/sync-newrecruit.mjs` (remove local `launchBrowser` and `rpc`, import them)
- Modify: `scripts/sync-stratagems.mjs` (remove local `rpc`, `bookRoot`, library/book fetching and `catalogueWithLinks`; use `openLibrary`)

**Interfaces:**
- Produces (all from `scripts/lib/nrSession.mjs`):
  - `launchBrowser(headless: boolean): Promise<Browser>`
  - `rpc(page, method: string, params?: unknown[]): Promise<any>` (returns `{ __error }` on failure)
  - `bookRoot(content): object | null`
  - `openSession({ sessionFile, headed?, acceptDownloads? }): Promise<{ browser, context, page }>` (exits the process with code 2 on a missing or expired session)
  - `openLibrary(page, systemShort: string, log?): Promise<{ system, books, fetchBook(book), catalogueWithLinks(book): Promise<object[]> }>`; `catalogueWithLinks` returns the catalogue root followed by its transitively linked roots.

This task is a behaviour-preserving refactor. Its test is that both existing scripts still run their dry runs the same way.

- [ ] **Step 1: Record the baseline**

Run: `npm run sync:armies -- --dry-run 2>&1 | grep -E "Found|would write|Done"` and `npm run sync:stratagems -- --dry-run 2>&1 | tail -15`
Expected: the five 40k lists and a list of detachment files. Save this output; it must match after the refactor.

- [ ] **Step 2: Create `scripts/lib/nrSession.mjs`**

```js
// New Recruit session code shared by the sync scripts: launching a browser,
// opening the saved login, calling the site's RPC endpoint from inside the
// page, and reading catalogue books from the game library. No credentials
// are handled here; the login lives in the session file written by
// `npm run sync:armies -- --login`.

import { chromium } from "playwright";
import { existsSync } from "node:fs";

export const BASE = "https://www.newrecruit.eu";
export const VIEWPORT = { width: 1400, height: 900 };

export async function launchBrowser(headless) {
  const attempts = [{}, { channel: "chrome" }, { channel: "msedge" }];
  let lastErr;
  for (const opts of attempts) {
    try {
      return await chromium.launch({ headless, ...opts });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/** Run one of New Recruit's RPC calls in the page, as the signed-in user. */
export function rpc(page, method, params = []) {
  return page.evaluate(
    async ({ method, params }) => {
      const send = () =>
        fetch(`/api/rpc?m=${encodeURIComponent(method)}`, {
          method: "POST",
          body: JSON.stringify({ method, params }),
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("access") || "",
          },
        });
      let res = await send();
      if (res.status === 403 && localStorage.getItem("refresh")) {
        const t = await fetch("/api/token", {
          method: "POST",
          body: JSON.stringify({ token: localStorage.getItem("refresh") }),
          headers: { "Content-Type": "application/json" },
        });
        if (t.ok) {
          localStorage.setItem("access", (await t.json()).token);
          res = await send();
        }
      }
      if (!res.ok) return { __error: `rpc ${method} failed (${res.status})` };
      const body = await res.json();
      if (body && body.obfuscated) return JSON.parse(atob(body.data));
      return body;
    },
    { method, params },
  );
}

/** The catalogue or game-system root of a book row's content. */
export function bookRoot(content) {
  return content.catalogue ?? content.gameSystem ?? null;
}

/** Open the saved session on the lists page and confirm it is still logged in. */
export async function openSession({ sessionFile, headed = false, acceptDownloads = false }) {
  if (!existsSync(sessionFile)) {
    console.error("No saved session. Run: npm run sync:armies -- --login");
    process.exit(2);
  }
  const browser = await launchBrowser(!headed);
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: sessionFile,
    acceptDownloads,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/app/MyLists`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!document.querySelector("button"), null, {
    timeout: 60_000,
  });
  if (!(await page.evaluate(() => !!localStorage.getItem("access")))) {
    console.error("Session has expired. Run: npm run sync:armies -- --login");
    await browser.close();
    process.exit(2);
  }
  return { browser, context, page };
}

/**
 * The books of one game system, with a cached book fetcher and a helper that
 * returns a catalogue together with everything it links.
 */
export async function openLibrary(page, systemShort, log = () => {}) {
  const library = await rpc(page, "get_library");
  if (!library || library.__error) {
    throw new Error(library?.__error ?? "get_library returned nothing");
  }
  const system = (library.systems ?? library).find((s) => s.short === systemShort);
  if (!system) throw new Error(`system ${systemShort} not found`);
  const books = system.books ?? [];

  const cache = new Map();
  async function fetchBook(book) {
    if (cache.has(book.id)) return cache.get(book.id);
    const row = await rpc(page, "books_get_book_row", [
      String(system.id),
      String(book.id),
      book.last_updated,
    ]);
    if (!row || row.__error) throw new Error(row?.__error ?? `fetch of ${book.name} failed`);
    const content = JSON.parse(row.content);
    cache.set(book.id, content);
    return content;
  }

  /** A catalogue plus everything it links, transitively, in link order. */
  async function catalogueWithLinks(book) {
    const roots = [];
    const seen = new Set();
    async function visit(b) {
      if (seen.has(b.id)) return;
      seen.add(b.id);
      const root = bookRoot(await fetchBook(b));
      if (!root) return;
      roots.push(root);
      for (const link of root.catalogueLinks ?? []) {
        const target =
          books.find((x) => x.bsid === link.targetId) ?? books.find((x) => x.name === link.name);
        if (target) await visit(target);
        else log(`  note: ${b.name} links to unknown catalogue "${link.name}"`);
      }
    }
    await visit(book);
    return roots;
  }

  return { system, books, fetchBook, catalogueWithLinks };
}
```

- [ ] **Step 3: Point `sync-newrecruit.mjs` at the shared code**

In `scripts/sync-newrecruit.mjs`:
1. Delete the line `import { chromium } from "playwright";`.
2. Add `import { launchBrowser, rpc } from "./lib/nrSession.mjs";` next to the other imports.
3. Delete the whole local `async function launchBrowser(headless) { ... }` (the function that tries `chromium.launch` with channels).
4. Delete the whole local `async function rpc(page, method, params = []) { ... }` and its doc comment `/** Same call the app makes: ... */`.
5. Keep the existing `export { launchBrowser };` line.

- [ ] **Step 4: Point `sync-stratagems.mjs` at the shared code**

In `scripts/sync-stratagems.mjs`:
1. Replace `import { launchBrowser } from "./sync-newrecruit.mjs";` with `import { bookRoot, launchBrowser, openLibrary, rpc } from "./lib/nrSession.mjs";`.
2. Delete the local `function rpc(page, method, params = []) { ... }` and its doc comment `/** Run one of New Recruit's RPC calls ... */`.
3. Delete the local `function bookRoot(content) { ... }` and its doc comment.
4. Inside `main()`'s `try`, replace the block from `const library = await rpc(page, "get_library");` through the end of the local `async function fetchBook(book) { ... }` (the block that ends with `return content;` and `}`) with:

```js
    const { system, books, fetchBook, catalogueWithLinks } = await openLibrary(
      page,
      SYSTEM_SHORT,
      log,
    );
```

5. Delete the local `async function catalogueWithLinks(book) { ... }` (preceded by the comment `/** A catalogue plus everything it links, transitively, in link order. */`).

- [ ] **Step 5: Verify both scripts behave as before**

Run: `npm run sync:armies -- --dry-run 2>&1 | grep -E "Found|would write|Done"` and `npm run sync:stratagems -- --dry-run 2>&1 | tail -15`
Expected: identical to Step 1. Then `npx vitest run scripts` (existing script tests) passes.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/nrSession.mjs scripts/sync-newrecruit.mjs scripts/sync-stratagems.mjs
git commit -m "Share the New Recruit session code between sync scripts

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Weapon option extraction (pure)

**Files:**
- Create: `scripts/lib/unitOptions.mjs`
- Create: `scripts/lib/unitOptions.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces, all from `scripts/lib/unitOptions.mjs`:
  - `indexNodes(roots: object[]): Map<string, object>`
  - `collectRuleTexts(roots: object[]): Record<string, string>`
  - `weaponOptionsForEntry(entryId: string, byId: Map): WeaponOption[] | null` (shape below)
  - `unitEntriesFromRoster(json): Array<{ entryId: string, name: string }>`
  - `buildFactionOptions({ catalogue, roots, entries }): { options: FactionUnitOptions, missing: string[] }`
  - `renderFactionFile(constName: string, options: FactionUnitOptions): string`
  - `renderFactionsIndex(factions: Array<{ constName: string, stem: string }>): string`
- Data shapes (mirrored by `src/data/unit-options/types.ts` in Task 4): `WeaponOptionProfile { id, name, type: "ranged"|"melee", range: string|null, attacks: string, skill: string|null, strength: number, ap: number, damage: string, keywords: string }`, `WeaponOption { name, profiles: WeaponOptionProfile[], rules: string[] }`, `FactionUnitOptions { catalogue, rules: Record<string,string>, units: Record<entryId, { name, weapons: WeaponOption[] }> }`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/unitOptions.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import {
  buildFactionOptions,
  collectRuleTexts,
  indexNodes,
  renderFactionFile,
  renderFactionsIndex,
  unitEntriesFromRoster,
  weaponOptionsForEntry,
} from "./unitOptions.mjs";

function profile(id, name, typeName, chars) {
  return {
    id,
    name,
    typeName,
    characteristics: Object.entries(chars).map(([k, v]) => ({ name: k, $text: v })),
  };
}

const spearMelee = profile("p-spear-m", "Guardian Spear", "Melee Weapons", {
  Range: "Melee", A: "5", WS: "2+", S: "7", AP: "-2", D: "2", Keywords: "-",
});
const spearRanged = profile("p-spear-r", "Guardian Spear", "Ranged Weapons", {
  Range: '24"', A: "2", BS: "2+", S: "4", AP: "-1", D: "2", Keywords: "Assault",
});
const bladeMelee = profile("p-blade-m", "Sentinel Blade", "Melee Weapons", {
  Range: "Melee", A: "5", WS: "2+", S: "6", AP: "-2", D: "1", Keywords: "-",
});

const core = {
  sharedRules: [
    { id: "r-assault", name: "Assault", description: "Assault rule text." },
    { id: "r-blast", name: "Blast", description: "Blast rule text." },
  ],
};

function catalogue(extraChildren = []) {
  return {
    sharedSelectionEntries: [
      {
        id: "sel-blade",
        name: "Sentinel blade",
        type: "upgrade",
        profiles: [bladeMelee],
      },
      {
        id: "unit-guard",
        name: "Custodian Guard",
        type: "unit",
        selectionEntryGroups: [
          {
            id: "grp",
            name: "Weapons",
            selectionEntries: [
              {
                id: "sel-spear",
                name: "Guardian Spear",
                type: "upgrade",
                profiles: [spearMelee, spearRanged],
                infoLinks: [{ id: "l1", name: "Assault", type: "rule", targetId: "r-assault" }],
              },
            ],
            entryLinks: [
              { id: "lnk-blade", name: "Sentinel blade", type: "selectionEntry", targetId: "sel-blade" },
            ],
          },
          ...extraChildren,
        ],
      },
    ],
  };
}

describe("indexNodes", () => {
  it("indexes nested nodes by id, first one winning", () => {
    const byId = indexNodes([catalogue()]);
    expect(byId.get("sel-spear").name).toBe("Guardian Spear");
    expect(byId.get("grp").name).toBe("Weapons");
  });
});

describe("weaponOptionsForEntry", () => {
  it("returns null for an unknown entry", () => {
    expect(weaponOptionsForEntry("nope", indexNodes([catalogue()]))).toBeNull();
  });

  it("lists weapon entries with every profile parsed and the rules they reference", () => {
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue(), core]));
    const spear = options.find((o) => o.name === "Guardian Spear");
    expect(spear.rules).toEqual(["Assault"]);
    expect(spear.profiles).toEqual([
      {
        id: "p-spear-m", name: "Guardian Spear", type: "melee", range: "Melee",
        attacks: "5", skill: "2+", strength: 7, ap: -2, damage: "2", keywords: "-",
      },
      {
        id: "p-spear-r", name: "Guardian Spear", type: "ranged", range: '24"',
        attacks: "2", skill: "2+", strength: 4, ap: -1, damage: "2", keywords: "Assault",
      },
    ]);
  });

  it("follows entry links and keeps the link's own name", () => {
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue()]));
    expect(options.map((o) => o.name)).toEqual(["Guardian Spear", "Sentinel blade"]);
  });

  it("skips Crusade content", () => {
    const crusade = {
      id: "crusade",
      name: "Crusade",
      selectionEntries: [
        { id: "x", name: "Weapon Modifications", profiles: [spearMelee] },
        { id: "y", name: "Relic blade", profiles: [bladeMelee] },
      ],
    };
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue([crusade])]));
    expect(options.map((o) => o.name)).toEqual(["Guardian Spear", "Sentinel blade"]);
  });

  it("de-duplicates options by name, first one winning", () => {
    const dup = {
      id: "grp2",
      name: "More weapons",
      selectionEntries: [
        { id: "sel-spear-2", name: "Guardian Spear", profiles: [bladeMelee] },
      ],
    };
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue([dup])]));
    expect(options.filter((o) => o.name === "Guardian Spear")).toHaveLength(1);
    expect(options.find((o) => o.name === "Guardian Spear").profiles[0].id).toBe("p-spear-m");
  });

  it("survives a link back to an ancestor", () => {
    const loop = {
      id: "loop",
      name: "Loop",
      entryLinks: [{ id: "back", name: "Custodian Guard", targetId: "unit-guard" }],
    };
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue([loop])]));
    expect(options.map((o) => o.name)).toEqual(["Guardian Spear", "Sentinel blade"]);
  });
});

describe("collectRuleTexts", () => {
  it("reads shared and inline rules, first one winning", () => {
    const roots = [
      core,
      { sharedRules: [{ id: "dup", name: "Assault", description: "Later text." }] },
      { selectionEntries: [{ id: "e", name: "E", rules: [{ id: "i", name: "Inline", description: " Inline text. " }] }] },
    ];
    expect(collectRuleTexts(roots)).toEqual({
      Assault: "Assault rule text.",
      Blast: "Blast rule text.",
      Inline: "Inline text.",
    });
  });
});

describe("unitEntriesFromRoster", () => {
  it("returns each unit's catalogue entry id and name, skipping config selections", () => {
    const json = {
      roster: {
        forces: [
          {
            selections: [
              { name: "Battle Size", type: "upgrade", entryId: "cat::bs" },
              { name: "Custodian Guard", type: "unit", entryId: "cat::unit-guard" },
              { name: "No id", type: "unit" },
            ],
          },
        ],
      },
    };
    expect(unitEntriesFromRoster(json)).toEqual([
      { entryId: "unit-guard", name: "Custodian Guard" },
    ]);
  });
});

describe("buildFactionOptions", () => {
  it("keeps only referenced rules, sorts them and reports entries it cannot find", () => {
    const { options, missing } = buildFactionOptions({
      catalogue: "Imperium - Adeptus Custodes",
      roots: [catalogue(), core],
      entries: [
        { entryId: "unit-guard", name: "Custodian Guard" },
        { entryId: "unit-guard", name: "Custodian Guard" },
        { entryId: "ghost", name: "Ghost Unit" },
      ],
    });
    expect(missing).toEqual(["Ghost Unit"]);
    expect(options.catalogue).toBe("Imperium - Adeptus Custodes");
    expect(options.rules).toEqual({ Assault: "Assault rule text." });
    expect(Object.keys(options.units)).toEqual(["unit-guard"]);
    expect(options.units["unit-guard"].name).toBe("Custodian Guard");
  });
});

describe("rendering", () => {
  const options = { catalogue: "Imperium - Adeptus Custodes", rules: {}, units: {} };

  it("renders a faction file as a typed constant", () => {
    const text = renderFactionFile("imperiumAdeptusCustodes", options);
    expect(text).toContain('import type { FactionUnitOptions } from "./types";');
    expect(text).toContain("export const imperiumAdeptusCustodes: FactionUnitOptions = {");
    expect(text).toContain('"catalogue": "Imperium - Adeptus Custodes"');
    expect(text).toContain("Generated by scripts/sync-unit-options.mjs");
  });

  it("renders the factions index", () => {
    const text = renderFactionsIndex([
      { constName: "chaosSpaceMarines", stem: "chaos-space-marines" },
      { constName: "xenosOrks", stem: "xenos-orks" },
    ]);
    expect(text).toContain('import { chaosSpaceMarines } from "./chaos-space-marines";');
    expect(text).toContain("export const factionOptions: FactionUnitOptions[] = [");
    expect(text).toContain("  xenosOrks,");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/lib/unitOptions.test.mjs`
Expected: FAIL ("Failed to resolve import ./unitOptions.mjs").

- [ ] **Step 3: Implement `scripts/lib/unitOptions.mjs`**

```js
// Pure helpers for scripts/sync-unit-options.mjs: reading, from New
// Recruit's catalogue books (BattleScribe data), every weapon a unit's
// datasheet offers. No I/O, so every rule is unit-testable.

const WEAPON_TYPES = new Set(["Ranged Weapons", "Melee Weapons"]);
const CRUSADE = /crusade|battle honour|battle trait|battle scar|tallies|weapon modification/i;
const MAX_DEPTH = 14;

const nameKey = (name) => String(name ?? "").trim().toLowerCase();

/** Every object with a string id in the given roots, by id. First one wins. */
export function indexNodes(roots) {
  const byId = new Map();
  (function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node.id === "string" && !byId.has(node.id)) byId.set(node.id, node);
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") visit(value);
    }
  })(roots);
  return byId;
}

/** rule name -> description, from shared and inline rules. First one wins. */
export function collectRuleTexts(roots) {
  const texts = {};
  (function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const key of ["rules", "sharedRules"]) {
      for (const rule of Array.isArray(node[key]) ? node[key] : []) {
        if (rule && rule.name && typeof rule.description === "string" && !(rule.name in texts)) {
          texts[rule.name] = rule.description.trim();
        }
      }
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") visit(value);
    }
  })(roots);
  return texts;
}

/** A link resolves to its target, keeping the link's own name when it has one. */
function resolve(node, byId) {
  if (node && node.targetId) {
    const target = byId.get(node.targetId);
    if (!target) return null;
    return { ...target, name: node.name ?? target.name };
  }
  return node;
}

function characteristics(profile) {
  const out = {};
  for (const c of profile.characteristics ?? []) {
    out[c.name] = String(c.$text ?? c.value ?? "").trim();
  }
  return out;
}

function toProfile(profile) {
  const c = characteristics(profile);
  return {
    id: profile.id,
    name: String(profile.name ?? "").replace(/^➤\s*/, ""),
    type: profile.typeName === "Ranged Weapons" ? "ranged" : "melee",
    range: c.Range ?? null,
    attacks: c.A ?? "",
    skill: c.BS ?? c.WS ?? null,
    strength: Number(c.S),
    ap: Number(c.AP),
    damage: c.D ?? "",
    keywords: c.Keywords ?? "-",
  };
}

function ruleNames(node) {
  const names = new Set();
  for (const link of node.infoLinks ?? []) {
    if (link.type === "rule" && link.name) names.add(link.name);
  }
  for (const rule of node.rules ?? []) {
    if (rule && rule.name) names.add(rule.name);
  }
  return [...names];
}

/**
 * Every weapon the entry offers, anywhere under it: direct entries, entries
 * inside groups, and entries reached through links. Null when the entry id
 * is not in the index.
 */
export function weaponOptionsForEntry(entryId, byId) {
  const root = byId.get(entryId);
  if (!root) return null;
  const found = new Map();
  const path = new Set();
  (function walk(entry, depth) {
    const node = resolve(entry, byId);
    if (!node || depth > MAX_DEPTH || path.has(node.id)) return;
    if (CRUSADE.test(node.name ?? "")) return;
    path.add(node.id);
    const profiles = (node.profiles ?? []).filter((p) => WEAPON_TYPES.has(p.typeName));
    if (profiles.length > 0 && !found.has(nameKey(node.name))) {
      found.set(nameKey(node.name), {
        name: node.name,
        profiles: profiles.map(toProfile),
        rules: ruleNames(node),
      });
    }
    for (const key of ["selectionEntries", "selectionEntryGroups", "entryLinks"]) {
      for (const child of node[key] ?? []) walk(child, depth + 1);
    }
    path.delete(node.id);
  })(root, 0);
  return [...found.values()];
}

/** The catalogue entry id and name of every unit in a roster export. */
export function unitEntriesFromRoster(json) {
  const out = [];
  for (const sel of json?.roster?.forces?.[0]?.selections ?? []) {
    if (sel.type !== "unit" && sel.type !== "model") continue;
    if (typeof sel.entryId !== "string" || !sel.entryId) continue;
    out.push({ entryId: sel.entryId.split("::").pop(), name: sel.name });
  }
  return out;
}

/**
 * The options file content for one faction.
 *
 * @param {{catalogue: string, roots: object[], entries: {entryId: string, name: string}[]}} input
 *   `roots` are the catalogue, the catalogues it links and the core book.
 */
export function buildFactionOptions({ catalogue, roots, entries }) {
  const byId = indexNodes(roots);
  const texts = collectRuleTexts(roots);
  const units = {};
  const missing = [];
  const usedRules = new Set();
  for (const { entryId, name } of entries) {
    if (units[entryId]) continue;
    const weapons = weaponOptionsForEntry(entryId, byId);
    if (!weapons) {
      if (!missing.includes(name)) missing.push(name);
      continue;
    }
    units[entryId] = { name, weapons };
    for (const w of weapons) for (const r of w.rules) usedRules.add(r);
  }
  const rules = {};
  for (const name of [...usedRules].sort()) {
    if (texts[name] !== undefined) rules[name] = texts[name];
  }
  return { options: { catalogue, rules, units }, missing };
}

const GENERATED = "// Generated by scripts/sync-unit-options.mjs. Do not edit by hand.";

export function renderFactionFile(constName, options) {
  return [
    `import type { FactionUnitOptions } from "./types";`,
    "",
    GENERATED,
    `export const ${constName}: FactionUnitOptions = ${JSON.stringify(options, null, 2)};`,
    "",
  ].join("\n");
}

/** @param factions Array of { constName, stem } in the order to export. */
export function renderFactionsIndex(factions) {
  const lines = [`import type { FactionUnitOptions } from "./types";`];
  for (const f of factions) lines.push(`import { ${f.constName} } from "./${f.stem}";`);
  lines.push("", GENERATED);
  lines.push(`export const factionOptions: FactionUnitOptions[] = [`);
  for (const f of factions) lines.push(`  ${f.constName},`);
  lines.push("];", "");
  return lines.join("\n");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/lib/unitOptions.test.mjs`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/unitOptions.mjs scripts/lib/unitOptions.test.mjs
git commit -m "Extract weapon options from catalogue entries

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `sync:options` script and generated data

**Files:**
- Create: `src/data/unit-options/types.ts`
- Create: `src/data/unit-options/index.ts`
- Create: `scripts/sync-unit-options.mjs`
- Modify: `package.json` (`scripts`)
- Generated by running the script: `src/data/unit-options/factions.ts` and one `src/data/unit-options/<faction-slug>.ts` per roster faction

**Interfaces:**
- Consumes: Task 2 `openSession`, `openLibrary`; Task 3 `buildFactionOptions`, `renderFactionFile`, `renderFactionsIndex`, `unitEntriesFromRoster`; existing `slugify`, `camelCase` from `scripts/lib/stratagems.mjs`.
- Produces (from `src/data/unit-options/index.ts`): types `WeaponOptionProfile`, `WeaponOption`, `UnitOptions`, `UnitOptionsResult`, `FactionUnitOptions`; `unitOptions(catalogue: string | null | undefined, entryId: string | null | undefined): UnitOptionsResult | null`; `optionsLookup(catalogue: string | null | undefined): (entryId: string | null | undefined) => UnitOptionsResult | null`.

- [ ] **Step 1: Create the types**

`src/data/unit-options/types.ts`:

```ts
/** One firing mode or melee profile of a weapon, as the catalogue lists it.
 * Numbers and dice stay as raw text; the app parses them with the same
 * parsers it uses for rosters. */
export interface WeaponOptionProfile {
  id: string;
  name: string;
  type: "ranged" | "melee";
  range: string | null;
  attacks: string;
  skill: string | null;
  strength: number;
  ap: number;
  damage: string;
  keywords: string;
}

export interface WeaponOption {
  name: string;
  profiles: WeaponOptionProfile[];
  /** Names of the weapon rules it references; text is in `rules` of the faction. */
  rules: string[];
}

export interface UnitOptions {
  name: string;
  weapons: WeaponOption[];
}

export interface FactionUnitOptions {
  catalogue: string;
  /** rule name -> text, shared by every unit in the faction */
  rules: Record<string, string>;
  /** catalogue entry id -> that unit's options */
  units: Record<string, UnitOptions>;
}

/** What `unitOptions` returns: a unit's options plus the rule texts they use. */
export interface UnitOptionsResult extends UnitOptions {
  rules: Record<string, string>;
}
```

- [ ] **Step 2: Create the lookup**

`src/data/unit-options/index.ts`:

```ts
import { factionOptions } from "./factions";
import type { UnitOptionsResult } from "./types";

export type {
  FactionUnitOptions,
  UnitOptions,
  UnitOptionsResult,
  WeaponOption,
  WeaponOptionProfile,
} from "./types";

const byCatalogue = new Map(factionOptions.map((f) => [f.catalogue, f]));

/** The weapons a unit's datasheet offers, or null when the faction was not
 * synced or the entry is not in it (run `npm run sync:options`). */
export function unitOptions(
  catalogue: string | null | undefined,
  entryId: string | null | undefined,
): UnitOptionsResult | null {
  if (!catalogue || !entryId) return null;
  const faction = byCatalogue.get(catalogue);
  const unit = faction?.units[entryId];
  if (!faction || !unit) return null;
  return { ...unit, rules: faction.rules };
}

/** `unitOptions` bound to one catalogue, for passing around. */
export function optionsLookup(catalogue: string | null | undefined) {
  return (entryId: string | null | undefined): UnitOptionsResult | null =>
    unitOptions(catalogue, entryId);
}
```

- [ ] **Step 3: Create the script**

`scripts/sync-unit-options.mjs`:

```js
// Regenerate src/data/unit-options/* from New Recruit.
//
//   npm run sync:options              rewrite every faction file
//   npm run sync:options -- --dry-run report what would change, write nothing
//   npm run sync:options -- --headed  watch the browser while it works
//
// For every unit in the rosters in armies/, this reads the unit's entry in
// its faction's catalogue book (the BattleScribe data the list builder runs
// on, fetched through the same library calls as sync:stratagems) and records
// every weapon that datasheet offers, with its stat lines and rule text.
// The app uses it to let you swap a unit's weapons. It uses the session
// saved by `sync:armies -- --login` and handles no credentials of its own.

import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openLibrary, openSession } from "./lib/nrSession.mjs";
import { camelCase, slugify } from "./lib/stratagems.mjs";
import {
  buildFactionOptions,
  renderFactionFile,
  renderFactionsIndex,
  unitEntriesFromRoster,
} from "./lib/unitOptions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARMIES_DIR = path.join(ROOT, "armies");
const OUT_DIR = path.join(ROOT, "src", "data", "unit-options");
const SESSION_FILE = path.join(ROOT, ".newrecruit-session.json");
// Only this system is ever read, so nothing from another edition can leak in.
const SYSTEM_SHORT = "wh40k-10e";
const CORE_BOOK_NAME = "Warhammer 40,000 10th Edition";
const KEEP_FILES = new Set(["index.ts", "types.ts", "factions.ts"]);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const HEADED = args.has("--headed");

const log = (...m) => console.log(...m);

async function main() {
  // Which factions do the synced armies use, and which unit entries in each?
  const entriesByFaction = new Map();
  for (const file of (await readdir(ARMIES_DIR)).filter((f) => f.endsWith(".json"))) {
    const json = JSON.parse(await readFile(path.join(ARMIES_DIR, file), "utf8"));
    const catalogue = json?.roster?.forces?.[0]?.catalogueName;
    if (!catalogue) {
      log(`  skip  ${file}: no catalogue in the roster`);
      continue;
    }
    const list = entriesByFaction.get(catalogue) ?? [];
    list.push(...unitEntriesFromRoster(json));
    entriesByFaction.set(catalogue, list);
  }
  log(`Factions in use: ${[...entriesByFaction.keys()].join(", ")}`);
  if (entriesByFaction.size === 0) {
    console.error("No rosters found in armies/. Run sync:armies first.");
    process.exit(1);
  }

  const { browser, page } = await openSession({ sessionFile: SESSION_FILE, headed: HEADED });
  const built = [];
  try {
    const library = await openLibrary(page, SYSTEM_SHORT, log);
    const coreBook = library.books.find((b) => b.name === CORE_BOOK_NAME);
    const coreRoot = coreBook ? (await library.fetchBook(coreBook)).gameSystem ?? null : null;
    if (!coreRoot) log(`  note: no "${CORE_BOOK_NAME}" book; core rule texts will be missing`);

    for (const [name, entries] of entriesByFaction) {
      const book = library.books.find((b) => b.name === name);
      if (!book) {
        log(`  skip  ${name}: no such catalogue in the library`);
        continue;
      }
      const roots = await library.catalogueWithLinks(book);
      if (coreRoot) roots.push(coreRoot);
      const sorted = [...entries].sort(
        (a, b) => a.name.localeCompare(b.name) || a.entryId.localeCompare(b.entryId),
      );
      const { options, missing } = buildFactionOptions({ catalogue: name, roots, entries: sorted });
      log(
        `${name} (v${book.nrversion}): ${Object.keys(options.units).length} unit(s), ` +
          `${Object.keys(options.rules).length} rule text(s)`,
      );
      if (missing.length) log(`    warn  not found in the catalogue: ${missing.join(", ")}`);
      built.push({ name, options, constName: camelCase(name), stem: slugify(name) });
    }
  } finally {
    await browser.close();
  }

  if (built.length === 0) {
    console.error("Nothing was built.");
    process.exit(1);
  }
  built.sort((a, b) => a.name.localeCompare(b.name));
  const stems = new Set(built.map((b) => b.stem));
  const stale = (await readdir(OUT_DIR)).filter(
    (f) => f.endsWith(".ts") && !KEEP_FILES.has(f) && !stems.has(f.replace(/\.ts$/, "")),
  );

  if (DRY_RUN) {
    log("");
    log("Dry run, nothing written. Would write:");
    for (const b of built) log(`  src/data/unit-options/${b.stem}.ts`);
    log("  src/data/unit-options/factions.ts");
    if (stale.length) log(`Would delete:\n  ${stale.join("\n  ")}`);
    return;
  }

  for (const b of built) {
    await writeFile(path.join(OUT_DIR, `${b.stem}.ts`), renderFactionFile(b.constName, b.options), "utf8");
  }
  await writeFile(
    path.join(OUT_DIR, "factions.ts"),
    renderFactionsIndex(built.map(({ constName, stem }) => ({ constName, stem }))),
    "utf8",
  );
  for (const f of stale) await unlink(path.join(OUT_DIR, f));

  log("");
  log(`Wrote ${built.length} faction file(s) plus factions.ts.`);
  if (stale.length) log(`Deleted (no longer generated):\n  ${stale.join("\n  ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

In `package.json`, in `"scripts"`, after the `"sync:stratagems"` line add (mind the comma on the previous line):

```json
    "sync:options": "node scripts/sync-unit-options.mjs"
```

- [ ] **Step 4: Dry run, then generate**

Run: `npm run sync:options -- --dry-run`
Expected: `Factions in use:` lists the five factions; one line per faction with a unit count; any `warn  not found in the catalogue` lines are noted; "Dry run, nothing written."

Run: `npm run sync:options`
Expected: "Wrote 5 faction file(s) plus factions.ts."

- [ ] **Step 5: Verify the generated data against the known case**

Run:

```bash
node --input-type=module -e '
import { readFileSync } from "node:fs";
const src = readFileSync("src/data/unit-options/imperium-adeptus-custodes.ts", "utf8");
const json = JSON.parse(src.slice(src.indexOf("= {") + 2, src.lastIndexOf("};") + 1));
const guard = Object.values(json.units).find((u) => u.name === "Custodian Guard");
console.log(guard.weapons.map((w) => w.name + "(" + w.profiles.length + ")").join(", "));
console.log("Assault rule text present:", typeof json.rules.Assault === "string");
'
```

Expected: `Guardian Spear(2), Sentinel blade(2), Misericordia(1)` (order may differ; all three present) and `Assault rule text present: true`.

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/sync-unit-options.mjs src/data/unit-options
git commit -m "Add sync:options and the generated unit weapon options

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Store overrides in the synced config

**Files:**
- Modify: `src/lib/persistence.ts`, `src/lib/persistence.test.ts`
- Modify: `server/stateStore.mjs`, `server/stateStore.test.mjs`, `server/stateRoutes.test.mjs`
- Modify: `src/lib/syncApi.test.ts`, `src/lib/syncReconcile.test.ts` (typed `SyncedState` literals)
- Modify: `src/components/SyncConflictModal.tsx`
- Create: `src/lib/weaponOverrides.ts` (types only in this task; logic comes in Task 6)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: exported types from `src/lib/weaponOverrides.ts`: `WeaponOverrideWeapon { name: string; perModel: number }`, `WeaponOverrideGroup { key: string; modelCount: number; weapons: WeaponOverrideWeapon[] }`, `UnitWeaponOverride { groups: WeaponOverrideGroup[]; rosterSignature: string }`. `SyncedState.weaponOverrides: Record<string, UnitWeaponOverride>` (required). Server `normalizeSyncedData` returns `{ leaderAssignments, hiddenUnitIds, detachmentOverrides, weaponOverrides }`.

- [ ] **Step 1: Create the types file**

`src/lib/weaponOverrides.ts`:

```ts
/** One weapon a model in a group carries. Stored by catalogue name, never
 * by stats, so a later `sync:options` updates edited units too. */
export interface WeaponOverrideWeapon {
  name: string;
  /** How many of this weapon each model in the group carries. */
  perModel: number;
}

/** A set of models that carry the same weapons. */
export interface WeaponOverrideGroup {
  /** Stable within one override ("g1", "g2", ...); names casualty counts. */
  key: string;
  modelCount: number;
  weapons: WeaponOverrideWeapon[];
}

export interface UnitWeaponOverride {
  groups: WeaponOverrideGroup[];
  /** Fingerprint of the roster unit's own loadouts when the edit was made. */
  rosterSignature: string;
}
```

- [ ] **Step 2: Update the client persistence tests (they fail until Step 3)**

In `src/lib/persistence.test.ts`:

1. In the `round-trips a saved state` test's `state` literal, after `detachmentOverrides: { Grey: "Hallowed Conclave" },` add `weaponOverrides: {},`.
2. In `picks out only the synced fields`, change the expected object to include `weaponOverrides: {}` after `detachmentOverrides: {},`.
3. In `replaces synced fields and bookkeeping while leaving local fields alone`, change the `withSynced` call's third argument object to `{ leaderAssignments: { l9: "u9" }, hiddenUnitIds: {}, detachmentOverrides: { Orks: "Green Tide" }, weaponOverrides: { u9: override } }` and add above the `const next` line: `const override = { groups: [{ key: "g1", modelCount: 2, weapons: [{ name: "Lascannon", perModel: 1 }] }], rosterSignature: "2xlascannon" };`. After the existing `expect(next.detachmentOverrides)` line add `expect(next.weaponOverrides).toEqual({ u9: override });`.
4. In `recognises an empty synced set`, change `none` to `{ leaderAssignments: {}, hiddenUnitIds: {}, detachmentOverrides: {}, weaponOverrides: {} }` and add before the closing of the test: `expect(isEmptySynced({ ...none, weaponOverrides: { u1: { groups: [], rosterSignature: "" } } })).toBe(false);`.
5. After the last test in the file's final `describe`, add inside it:

```ts
  // Saved before weapons could be edited: the field is simply absent.
  it("loads a stored state that predates weapon overrides", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "waha:state",
      JSON.stringify({ ...emptyState(), weaponOverrides: undefined }),
    );
    expect(loadState(storage).weaponOverrides).toEqual({});
  });
```

In `src/lib/syncApi.test.ts` line 5 and `src/lib/syncReconcile.test.ts` lines 5-7, add `weaponOverrides: {}` to each `SyncedState` literal (after `detachmentOverrides: {}`).

- [ ] **Step 3: Implement the client side**

In `src/lib/persistence.ts`:
1. Add at the top: `import type { UnitWeaponOverride } from "./weaponOverrides";`
2. In `interface SyncedState`, after `detachmentOverrides: Record<string, string>;` add:

```ts
  /** unitId -> the weapons the user set for that unit in place of the
   * roster's. An army-list property like the three above: kept forever,
   * synced, and never touched by an army sync (armies/ is not edited). */
  weaponOverrides: Record<string, UnitWeaponOverride>;
```
3. In `emptyState()` add `weaponOverrides: {},` after `detachmentOverrides: {},`.
4. In `loadState`'s returned object add `weaponOverrides: candidate.weaponOverrides ?? {},` after the `detachmentOverrides` line.
5. In `pickSynced` add `weaponOverrides: state.weaponOverrides,`.
6. In `withSynced` add (after the `detachmentOverrides` line) `weaponOverrides: synced.weaponOverrides ?? {},` with the comment `// Older server documents predate this field.` kept once above both.
7. In `isEmptySynced` add a line: `&& Object.keys(synced.weaponOverrides ?? {}).length === 0` after the `detachmentOverrides` condition (keep the existing `&&` chain and parentheses valid).

- [ ] **Step 4: Update the server tests (they fail until Step 5)**

In `server/stateStore.test.mjs`:
1. In `drops unknown keys and wrong value types`: add to the input object `weaponOverrides: { good: { groups: [{ key: "g1", modelCount: 3, weapons: [{ name: "Lascannon", perModel: 1 }] }], rosterSignature: "3xlascannon" }, badShape: { groups: "no" }, badCount: { groups: [{ key: "g1", modelCount: -1, weapons: [] }], rosterSignature: "x" }, badWeapon: { groups: [{ key: "g1", modelCount: 1, weapons: [{ name: "X", perModel: 0 }] }], rosterSignature: "x" }, noSignature: { groups: [{ key: "g1", modelCount: 1, weapons: [] }] } },` and change the expected value to add `weaponOverrides: { good: { groups: [{ key: "g1", modelCount: 3, weapons: [{ name: "Lascannon", perModel: 1 }] }], rosterSignature: "3xlascannon" } },`.
2. In `returns empty maps for a non-object` add `weaponOverrides: {},` to the expected object.
3. After `keeps detachment overrides through a write and read` add:

```js
  it("keeps weapon overrides through a write and read", async () => {
    const override = {
      groups: [{ key: "g1", modelCount: 2, weapons: [{ name: "Guardian Spear", perModel: 1 }] }],
      rosterSignature: "2xsentinel blade",
    };
    await writeDoc(dir, 0, {
      leaderAssignments: {},
      hiddenUnitIds: {},
      detachmentOverrides: {},
      weaponOverrides: { u1: override },
    });
    expect((await readDoc(dir)).data.weaponOverrides).toEqual({ u1: override });
  });

  it("reads a document written before weapon overrides existed", async () => {
    await writeFile(
      path.join(dir, "state.json"),
      JSON.stringify({ rev: 4, updatedAt: null, data: { leaderAssignments: { l1: "u1" }, hiddenUnitIds: {} } }),
    );
    expect((await readDoc(dir)).data.weaponOverrides).toEqual({});
  });
```

In `server/stateRoutes.test.mjs` line 32, change `data: { leaderAssignments: {}, hiddenUnitIds: {}, detachmentOverrides: {} },` to `data: { leaderAssignments: {}, hiddenUnitIds: {}, detachmentOverrides: {}, weaponOverrides: {} },`.

- [ ] **Step 5: Implement the server side**

In `server/stateStore.mjs`:
1. In `emptyDoc()` set `data: { leaderAssignments: {}, hiddenUnitIds: {}, detachmentOverrides: {}, weaponOverrides: {} },`.
2. Above `normalizeSyncedData` add:

```js
function normalizeGroups(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const groups = [];
  for (const g of raw) {
    if (
      typeof g?.key !== "string" ||
      !Number.isInteger(g.modelCount) ||
      g.modelCount < 0 ||
      !Array.isArray(g.weapons)
    ) {
      return null;
    }
    const weapons = [];
    for (const w of g.weapons) {
      if (typeof w?.name !== "string" || typeof w.perModel !== "number" || !(w.perModel > 0)) {
        return null;
      }
      weapons.push({ name: w.name, perModel: w.perModel });
    }
    groups.push({ key: g.key, modelCount: g.modelCount, weapons });
  }
  return groups;
}

/** A malformed override is dropped whole: half an edit is worse than none. */
function normalizeWeaponOverrides(value) {
  const out = {};
  if (typeof value !== "object" || value === null) return out;
  for (const [unitId, raw] of Object.entries(value)) {
    const groups = normalizeGroups(raw?.groups);
    if (!groups || typeof raw.rosterSignature !== "string") continue;
    out[unitId] = { groups, rosterSignature: raw.rosterSignature };
  }
  return out;
}
```
3. Change the last line of `normalizeSyncedData` to `return { leaderAssignments, hiddenUnitIds, detachmentOverrides, weaponOverrides: normalizeWeaponOverrides(source.weaponOverrides) };`.

In `src/components/SyncConflictModal.tsx`, in `summary`, add after the "Detachment picks" entry: `["Edited units", Object.keys(data.weaponOverrides ?? {}).length],`.

- [ ] **Step 6: Run everything**

Run: `npx vitest run && npx tsc -b`
Expected: all tests pass, `tsc` exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/weaponOverrides.ts src/lib/persistence.ts src/lib/persistence.test.ts src/lib/syncApi.test.ts src/lib/syncReconcile.test.ts server/stateStore.mjs server/stateStore.test.mjs server/stateRoutes.test.mjs src/components/SyncConflictModal.tsx
git commit -m "Store weapon overrides in the synced config

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Apply overrides to a unit (pure logic)

**Files:**
- Modify: `src/lib/weaponOverrides.ts` (add logic below the types from Task 5)
- Create: `src/lib/weaponOverrides.test.ts`

**Interfaces:**
- Consumes: Task 4 types `UnitOptionsResult`, `WeaponOption`, `WeaponOptionProfile` (from `../data/unit-options/types`); existing `parseDice`, `parseKeywords`, `parseSkill`; existing `WeaponEntry`, `WeaponLoadout`, `LoadoutWeapon`, `ParsedUnit`.
- Produces (all exported from `src/lib/weaponOverrides.ts`):
  - `type OptionsLookup = (entryId: string | null | undefined) => UnitOptionsResult | null`
  - `rosterGroups(unit: ParsedUnit, options: UnitOptionsResult | null): WeaponOverrideGroup[]`
  - `rosterSignature(unit: ParsedUnit): string`
  - `startOverride(unit: ParsedUnit, options: UnitOptionsResult | null): UnitWeaponOverride`
  - `resolveWeapon(name: string, options: UnitOptionsResult | null, unit: ParsedUnit): WeaponEntry[] | null` (each returned entry has `count: 1`)
  - `applyWeaponOverride(unit: ParsedUnit, override: UnitWeaponOverride, lookup: OptionsLookup): ParsedUnit`
  - `applyWeaponOverrides(units: ParsedUnit[], overrides: Record<string, UnitWeaponOverride>, lookup: OptionsLookup): ParsedUnit[]`
  - Editing helpers, all immutable: `setGroupModelCount(o, groupKey, count)`, `setWeaponPerModel(o, groupKey, weaponName, perModel)`, `swapWeapon(o, groupKey, oldName, newName)`, `addWeapon(o, groupKey, name)`, `removeWeapon(o, groupKey, weaponName)`, `addGroup(o)`, `removeGroup(o, groupKey)`; each takes and returns `UnitWeaponOverride`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/weaponOverrides.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ParsedUnit, WeaponEntry } from "../../parseRoster.mjs";
import type { UnitOptionsResult } from "../data/unit-options/types";
import { getUnitLiveTotal } from "./loadouts";
import {
  addGroup,
  addWeapon,
  applyWeaponOverride,
  applyWeaponOverrides,
  removeGroup,
  removeWeapon,
  resolveWeapon,
  rosterGroups,
  rosterSignature,
  setGroupModelCount,
  setWeaponPerModel,
  startOverride,
  swapWeapon,
  type OptionsLookup,
  type UnitWeaponOverride,
} from "./weaponOverrides";

const options: UnitOptionsResult = {
  name: "Custodian Guard",
  rules: { Assault: "Assault rule text." },
  weapons: [
    {
      name: "Guardian Spear",
      rules: ["Assault"],
      profiles: [
        { id: "sp-m", name: "Guardian Spear", type: "melee", range: "Melee", attacks: "5", skill: "2+", strength: 7, ap: -2, damage: "2", keywords: "-" },
        { id: "sp-r", name: "Guardian Spear", type: "ranged", range: '24"', attacks: "2", skill: "2+", strength: 4, ap: -1, damage: "2", keywords: "Assault" },
      ],
    },
    {
      name: "Sentinel blade",
      rules: ["Assault"],
      profiles: [
        { id: "sb-m", name: "Sentinel Blade", type: "melee", range: "Melee", attacks: "5", skill: "2+", strength: 6, ap: -2, damage: "1", keywords: "-" },
        { id: "sb-r", name: "Sentinel Blade", type: "ranged", range: '12"', attacks: "2", skill: "2+", strength: 4, ap: -1, damage: "1", keywords: "Assault" },
      ],
    },
    {
      name: "Misericordia",
      rules: [],
      profiles: [
        { id: "mi", name: "Misericordia", type: "melee", range: "Melee", attacks: "4", skill: "2+", strength: 4, ap: -1, damage: "1", keywords: "-" },
      ],
    },
  ],
};

const lookup: OptionsLookup = () => options;
const noOptions: OptionsLookup = () => null;

function rosterWeapon(profileId: string, name: string, type: "ranged" | "melee", count: number): WeaponEntry {
  return {
    profileId, name, subProfile: true, type, count,
    range: type === "melee" ? "Melee" : '12"',
    attacks: { dice: 0, sides: 0, flat: 5, raw: "5", avg: 5 },
    skill: 2, skillRaw: "2+", strength: 6, ap: -2,
    damage: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 },
    keywords: [], rules: [],
  };
}

// Five Custodian Guard, all with Sentinel Blade (two profiles).
function guard(): ParsedUnit {
  return {
    id: "guard", entryId: "e-guard", name: "Custodian Guard", kind: "unit",
    basePoints: 150, totalPoints: 150, modelCount: 5, models: [],
    profile: { M: '6"', T: 6, SV: 2, W: 3, LD: "6+", OC: 2 },
    invuln: null, keywords: [], faction: null, isWarlord: false, enhancements: [],
    weapons: [
      rosterWeapon("r-sb-m", "Sentinel Blade", "melee", 5),
      rosterWeapon("r-sb-r", "Sentinel Blade", "ranged", 5),
    ],
    loadouts: [
      {
        key: "k1", modelCount: 5, wargear: [],
        weapons: [
          { profileId: "r-sb-m", name: "Sentinel Blade", perModel: 1 },
          { profileId: "r-sb-r", name: "Sentinel Blade", perModel: 1 },
        ],
      },
    ],
    abilities: [], abilitySections: [], rules: [],
  };
}

describe("rosterGroups", () => {
  it("collapses a weapon's profiles into its catalogue option name", () => {
    expect(rosterGroups(guard(), options)).toEqual([
      { key: "g1", modelCount: 5, weapons: [{ name: "Sentinel blade", perModel: 1 }] },
    ]);
  });

  it("keeps roster names when there are no options", () => {
    expect(rosterGroups(guard(), null)).toEqual([
      { key: "g1", modelCount: 5, weapons: [{ name: "Sentinel Blade", perModel: 1 }] },
    ]);
  });

  it("sums a profile mounted twice in one loadout", () => {
    const unit = guard();
    unit.loadouts[0].weapons = [
      { profileId: "r-sb-m", name: "Sentinel Blade", perModel: 2 },
      { profileId: "r-sb-m", name: "Sentinel Blade", perModel: 1 },
    ];
    expect(rosterGroups(unit, options)[0].weapons).toEqual([{ name: "Sentinel blade", perModel: 3 }]);
  });
});

describe("rosterSignature", () => {
  it("is the same for the same loadouts and changes with them", () => {
    expect(rosterSignature(guard())).toBe(rosterSignature(guard()));
    const other = guard();
    other.loadouts[0].modelCount = 4;
    expect(rosterSignature(other)).not.toBe(rosterSignature(guard()));
  });
});

describe("resolveWeapon", () => {
  it("builds entries from the catalogue option, case-insensitively", () => {
    const entries = resolveWeapon("guardian spear", options, guard());
    expect(entries).toHaveLength(2);
    const melee = entries!.find((e) => e.type === "melee")!;
    expect(melee.profileId).toBe("opt:sp-m");
    expect(melee.subProfile).toBe(true);
    expect(melee.attacks).toMatchObject({ flat: 5, raw: "5" });
    expect(melee.skill).toBe(2);
    expect(melee.strength).toBe(7);
    expect(melee.ap).toBe(-2);
    const ranged = entries!.find((e) => e.type === "ranged")!;
    expect(ranged.keywords).toEqual(["Assault"]);
    expect(ranged.rules).toEqual([{ name: "Assault", text: "Assault rule text." }]);
  });

  it("falls back to the roster unit's own weapon of that name", () => {
    const entries = resolveWeapon("Sentinel Blade", null, guard());
    expect(entries!.map((e) => e.profileId)).toEqual(["r-sb-m", "r-sb-r"]);
  });

  it("is null for a weapon found nowhere", () => {
    expect(resolveWeapon("Plasma sword", options, guard())).toBeNull();
  });
});

describe("applyWeaponOverride", () => {
  const mixed: UnitWeaponOverride = {
    rosterSignature: rosterSignature(guard()),
    groups: [
      { key: "g1", modelCount: 3, weapons: [{ name: "Sentinel blade", perModel: 1 }] },
      { key: "g2", modelCount: 2, weapons: [{ name: "Guardian Spear", perModel: 1 }] },
    ],
  };

  it("rebuilds loadouts, weapons and the model count from the groups", () => {
    const unit = applyWeaponOverride(guard(), mixed, lookup);
    expect(unit.modelCount).toBe(5);
    expect(unit.loadouts.map((l) => [l.key, l.modelCount])).toEqual([["ovr:g1", 3], ["ovr:g2", 2]]);
    const byId = Object.fromEntries(unit.weapons.map((w) => [w.profileId, w.count]));
    expect(byId).toEqual({ "opt:sb-m": 3, "opt:sb-r": 3, "opt:sp-m": 2, "opt:sp-r": 2 });
    expect(getUnitLiveTotal({}, unit.id, unit)).toBe(5);
    expect(unit.weaponsEdited).toBe(true);
    expect(unit.rosterChanged).toBe(false);
    expect(unit.missingWeapons).toEqual([]);
  });

  it("flags weapons that were added or whose total changed, not unchanged ones", () => {
    const unit = applyWeaponOverride(guard(), mixed, lookup);
    const edited = (name: string) => unit.weapons.filter((w) => w.name === name).map((w) => w.edited);
    expect(edited("Guardian Spear")).toEqual([true, true]);
    expect(edited("Sentinel Blade")).toEqual([true, true]);

    const same = applyWeaponOverride(guard(), startOverride(guard(), options), lookup);
    expect(same.weapons.every((w) => w.edited === false)).toBe(true);
  });

  it("sums a weapon carried by two groups", () => {
    const o: UnitWeaponOverride = {
      rosterSignature: rosterSignature(guard()),
      groups: [
        { key: "g1", modelCount: 2, weapons: [{ name: "Misericordia", perModel: 1 }] },
        { key: "g2", modelCount: 3, weapons: [{ name: "Misericordia", perModel: 2 }] },
      ],
    };
    const unit = applyWeaponOverride(guard(), o, lookup);
    expect(unit.weapons.find((w) => w.profileId === "opt:mi")!.count).toBe(8);
  });

  it("flags a roster that changed since the edit", () => {
    const stale = { ...mixed, rosterSignature: "something else" };
    expect(applyWeaponOverride(guard(), stale, lookup).rosterChanged).toBe(true);
  });

  it("lists weapons it cannot resolve and still resolves the rest", () => {
    const o: UnitWeaponOverride = {
      rosterSignature: rosterSignature(guard()),
      groups: [{ key: "g1", modelCount: 5, weapons: [{ name: "Plasma sword", perModel: 1 }, { name: "Misericordia", perModel: 1 }] }],
    };
    const unit = applyWeaponOverride(guard(), o, lookup);
    expect(unit.missingWeapons).toEqual(["Plasma sword"]);
    expect(unit.weapons.map((w) => w.profileId)).toEqual(["opt:mi"]);
  });

  it("works with no catalogue data, using the roster unit's own weapons", () => {
    const o: UnitWeaponOverride = {
      rosterSignature: rosterSignature(guard()),
      groups: [{ key: "g1", modelCount: 4, weapons: [{ name: "Sentinel Blade", perModel: 1 }] }],
    };
    const unit = applyWeaponOverride(guard(), o, noOptions);
    expect(unit.modelCount).toBe(4);
    expect(unit.weapons.map((w) => [w.profileId, w.count])).toEqual([["r-sb-m", 4], ["r-sb-r", 4]]);
  });

  it("handles a group with 0 models and a group with no weapons", () => {
    const o: UnitWeaponOverride = {
      rosterSignature: rosterSignature(guard()),
      groups: [
        { key: "g1", modelCount: 0, weapons: [{ name: "Misericordia", perModel: 1 }] },
        { key: "g2", modelCount: 2, weapons: [] },
      ],
    };
    const unit = applyWeaponOverride(guard(), o, lookup);
    expect(unit.modelCount).toBe(2);
    expect(unit.weapons.map((w) => w.count)).toEqual([0]);
    expect(getUnitLiveTotal({}, unit.id, unit)).toBe(2);
  });
});

describe("applyWeaponOverrides", () => {
  it("passes units without an override through unchanged and ignores overrides for absent units", () => {
    const a = guard();
    const out = applyWeaponOverrides(
      [a],
      { ghost: { groups: [{ key: "g1", modelCount: 1, weapons: [] }], rosterSignature: "" } },
      lookup,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(a);
  });
});

describe("override editing helpers", () => {
  const base = (): UnitWeaponOverride => startOverride(guard(), options);

  it("sets a group's model count, never below 0", () => {
    expect(setGroupModelCount(base(), "g1", 3).groups[0].modelCount).toBe(3);
    expect(setGroupModelCount(base(), "g1", -2).groups[0].modelCount).toBe(0);
  });

  it("sets a weapon's per-model count, never below 1", () => {
    const o = setWeaponPerModel(base(), "g1", "Sentinel blade", 2);
    expect(o.groups[0].weapons[0].perModel).toBe(2);
    expect(setWeaponPerModel(base(), "g1", "Sentinel blade", 0).groups[0].weapons[0].perModel).toBe(1);
  });

  it("swaps a weapon, merging into one the group already has", () => {
    expect(swapWeapon(base(), "g1", "Sentinel blade", "Guardian Spear").groups[0].weapons).toEqual([
      { name: "Guardian Spear", perModel: 1 },
    ]);
    const two = addWeapon(base(), "g1", "Misericordia");
    expect(swapWeapon(two, "g1", "Misericordia", "Sentinel blade").groups[0].weapons).toEqual([
      { name: "Sentinel blade", perModel: 1 },
    ]);
  });

  it("adds a weapon, or one more of a weapon already there", () => {
    const added = addWeapon(base(), "g1", "Misericordia");
    expect(added.groups[0].weapons.map((w) => w.name)).toEqual(["Sentinel blade", "Misericordia"]);
    expect(addWeapon(base(), "g1", "sentinel BLADE").groups[0].weapons[0].perModel).toBe(2);
  });

  it("removes a weapon", () => {
    expect(removeWeapon(base(), "g1", "Sentinel blade").groups[0].weapons).toEqual([]);
  });

  it("adds a group with a fresh key and removes one only when others remain", () => {
    const two = addGroup(base());
    expect(two.groups.map((g) => g.key)).toEqual(["g1", "g2"]);
    expect(two.groups[1]).toEqual({ key: "g2", modelCount: 1, weapons: [] });
    expect(addGroup(removeGroup(two, "g1")).groups.map((g) => g.key)).toEqual(["g2", "g3"]);
    expect(removeGroup(base(), "g1").groups).toHaveLength(1);
  });

  it("never mutates its input", () => {
    const o = base();
    const copy = JSON.parse(JSON.stringify(o));
    setGroupModelCount(o, "g1", 9);
    addWeapon(o, "g1", "Misericordia");
    addGroup(o);
    expect(o).toEqual(copy);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/weaponOverrides.test.ts`
Expected: FAIL (the named exports do not exist).

- [ ] **Step 3: Implement**

Append to `src/lib/weaponOverrides.ts`, and add these imports at the very top of the file:

```ts
import type {
  LoadoutWeapon,
  ParsedUnit,
  WeaponEntry,
  WeaponLoadout,
} from "../../parseRoster.mjs";
import { parseDice, parseKeywords, parseSkill } from "../../parseRoster.mjs";
import type {
  UnitOptionsResult,
  WeaponOption,
  WeaponOptionProfile,
} from "../data/unit-options/types";
```

Then below the types from Task 5 add:

```ts
export type OptionsLookup = (entryId: string | null | undefined) => UnitOptionsResult | null;

const nameKey = (name: string): string => name.trim().toLowerCase();

/** The catalogue option a roster weapon profile belongs to. A roster lists
 * each firing mode under its own profile name; the catalogue groups them
 * under one entry. */
function optionForProfileName(
  profileName: string,
  options: UnitOptionsResult | null,
): WeaponOption | null {
  if (!options) return null;
  const key = nameKey(profileName);
  return (
    options.weapons.find(
      (o) => nameKey(o.name) === key || o.profiles.some((p) => nameKey(p.name) === key),
    ) ?? null
  );
}

/** The unit's own loadouts as editable groups, one weapon entry per weapon. */
export function rosterGroups(
  unit: ParsedUnit,
  options: UnitOptionsResult | null,
): WeaponOverrideGroup[] {
  return unit.loadouts.map((loadout, i) => {
    // A datasheet can mount one profile from two wargear groups (the
    // Forgefiend's cannons): add those up first, then collapse the profiles
    // of one weapon to the largest per-model count.
    const perProfile = new Map<string, { name: string; perModel: number }>();
    for (const w of loadout.weapons) {
      const seen = perProfile.get(w.profileId);
      if (seen) seen.perModel += w.perModel;
      else perProfile.set(w.profileId, { name: w.name, perModel: w.perModel });
    }
    const byName = new Map<string, WeaponOverrideWeapon>();
    for (const { name, perModel } of perProfile.values()) {
      const resolved = optionForProfileName(name, options)?.name ?? name;
      const key = nameKey(resolved);
      const seen = byName.get(key);
      if (seen) seen.perModel = Math.max(seen.perModel, perModel);
      else byName.set(key, { name: resolved, perModel });
    }
    return { key: `g${i + 1}`, modelCount: loadout.modelCount, weapons: [...byName.values()] };
  });
}

/** A stable fingerprint of the roster unit's loadouts, to notice later changes. */
export function rosterSignature(unit: ParsedUnit): string {
  return unit.loadouts
    .map((l) => {
      const names = [...new Set(l.weapons.map((w) => nameKey(w.name)))].sort();
      return `${l.modelCount}x${names.join("+")}`;
    })
    .sort()
    .join("|");
}

/** The override a first edit starts from: the roster's own groups. */
export function startOverride(
  unit: ParsedUnit,
  options: UnitOptionsResult | null,
): UnitWeaponOverride {
  return { groups: rosterGroups(unit, options), rosterSignature: rosterSignature(unit) };
}

function entryFromProfile(
  p: WeaponOptionProfile,
  option: WeaponOption,
  ruleTexts: Record<string, string>,
): WeaponEntry {
  return {
    profileId: `opt:${p.id}`,
    name: p.name,
    subProfile: option.profiles.length > 1,
    type: p.type,
    count: 1,
    range: p.range,
    attacks: parseDice(p.attacks),
    skill: parseSkill(p.skill),
    skillRaw: p.skill,
    strength: p.strength,
    ap: p.ap,
    damage: parseDice(p.damage),
    keywords: parseKeywords(p.keywords),
    rules: option.rules.map((name) => ({ name, text: ruleTexts[name] ?? null })),
  };
}

/**
 * The profiles of a weapon by name: from the catalogue option when there is
 * one, otherwise from the roster unit's own weapons. Each entry has count 1.
 * Null when the weapon is found in neither.
 */
export function resolveWeapon(
  name: string,
  options: UnitOptionsResult | null,
  unit: ParsedUnit,
): WeaponEntry[] | null {
  const key = nameKey(name);
  const option = options?.weapons.find((o) => nameKey(o.name) === key) ?? null;
  if (option && options) {
    return option.profiles.map((p) => entryFromProfile(p, option, options.rules));
  }
  const own = new Map<string, WeaponEntry>();
  for (const w of unit.weapons) {
    if (nameKey(w.name) === key && !own.has(w.profileId)) own.set(w.profileId, { ...w, count: 1 });
  }
  return own.size > 0 ? [...own.values()] : null;
}

function totalsByName(groups: WeaponOverrideGroup[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const g of groups) {
    for (const w of g.weapons) {
      const key = nameKey(w.name);
      totals.set(key, (totals.get(key) ?? 0) + w.perModel * g.modelCount);
    }
  }
  return totals;
}

/** `unit` with its loadouts and weapons replaced by the override's groups. */
export function applyWeaponOverride(
  unit: ParsedUnit,
  override: UnitWeaponOverride,
  lookup: OptionsLookup,
): ParsedUnit {
  const options = lookup(unit.entryId);
  const rosterTotals = totalsByName(rosterGroups(unit, options));
  const overrideTotals = totalsByName(override.groups);
  const byProfile = new Map<string, WeaponEntry>();
  const loadouts: WeaponLoadout[] = [];
  const missing: string[] = [];

  for (const group of override.groups) {
    const loadoutWeapons: LoadoutWeapon[] = [];
    for (const w of group.weapons) {
      const resolved = resolveWeapon(w.name, options, unit);
      if (!resolved) {
        if (!missing.includes(w.name)) missing.push(w.name);
        continue;
      }
      const key = nameKey(w.name);
      const edited = rosterTotals.get(key) !== overrideTotals.get(key);
      for (const entry of resolved) {
        loadoutWeapons.push({ profileId: entry.profileId, name: entry.name, perModel: w.perModel });
        const added = w.perModel * group.modelCount;
        const seen = byProfile.get(entry.profileId);
        if (seen) {
          seen.count += added;
          seen.edited = seen.edited || edited;
        } else {
          byProfile.set(entry.profileId, { ...entry, count: added, edited });
        }
      }
    }
    loadouts.push({
      key: `ovr:${group.key}`,
      modelCount: group.modelCount,
      weapons: loadoutWeapons,
      wargear: [],
    });
  }

  return {
    ...unit,
    modelCount: override.groups.reduce((n, g) => n + g.modelCount, 0),
    loadouts,
    weapons: [...byProfile.values()],
    weaponsEdited: true,
    rosterChanged: override.rosterSignature !== rosterSignature(unit),
    missingWeapons: missing,
  };
}

/** Apply each unit's override, if it has one. Overrides for units not in the
 * list are ignored. */
export function applyWeaponOverrides(
  units: ParsedUnit[],
  overrides: Record<string, UnitWeaponOverride>,
  lookup: OptionsLookup,
): ParsedUnit[] {
  return units.map((u) => {
    const override = overrides[u.id];
    return override ? applyWeaponOverride(u, override, lookup) : u;
  });
}

// ---- editing helpers (immutable) -----------------------------------------

function mapGroup(
  override: UnitWeaponOverride,
  groupKey: string,
  fn: (g: WeaponOverrideGroup) => WeaponOverrideGroup,
): UnitWeaponOverride {
  return { ...override, groups: override.groups.map((g) => (g.key === groupKey ? fn(g) : g)) };
}

export function setGroupModelCount(
  override: UnitWeaponOverride,
  groupKey: string,
  count: number,
): UnitWeaponOverride {
  const modelCount = Math.max(0, Math.floor(count));
  return mapGroup(override, groupKey, (g) => ({ ...g, modelCount }));
}

export function setWeaponPerModel(
  override: UnitWeaponOverride,
  groupKey: string,
  weaponName: string,
  perModel: number,
): UnitWeaponOverride {
  const value = Math.max(1, Math.floor(perModel));
  return mapGroup(override, groupKey, (g) => ({
    ...g,
    weapons: g.weapons.map((w) => (w.name === weaponName ? { ...w, perModel: value } : w)),
  }));
}

export function swapWeapon(
  override: UnitWeaponOverride,
  groupKey: string,
  oldName: string,
  newName: string,
): UnitWeaponOverride {
  return mapGroup(override, groupKey, (g) => {
    if (oldName === newName) return g;
    const hasNew = g.weapons.some((w) => nameKey(w.name) === nameKey(newName));
    const weapons = hasNew
      ? g.weapons.filter((w) => w.name !== oldName)
      : g.weapons.map((w) => (w.name === oldName ? { ...w, name: newName } : w));
    return { ...g, weapons };
  });
}

export function addWeapon(
  override: UnitWeaponOverride,
  groupKey: string,
  name: string,
): UnitWeaponOverride {
  return mapGroup(override, groupKey, (g) => {
    const existing = g.weapons.find((w) => nameKey(w.name) === nameKey(name));
    if (existing) {
      return {
        ...g,
        weapons: g.weapons.map((w) => (w === existing ? { ...w, perModel: w.perModel + 1 } : w)),
      };
    }
    return { ...g, weapons: [...g.weapons, { name, perModel: 1 }] };
  });
}

export function removeWeapon(
  override: UnitWeaponOverride,
  groupKey: string,
  weaponName: string,
): UnitWeaponOverride {
  return mapGroup(override, groupKey, (g) => ({
    ...g,
    weapons: g.weapons.filter((w) => w.name !== weaponName),
  }));
}

export function addGroup(override: UnitWeaponOverride): UnitWeaponOverride {
  const highest = override.groups.reduce(
    (max, g) => Math.max(max, Number(/^g(\d+)$/.exec(g.key)?.[1] ?? 0)),
    0,
  );
  return {
    ...override,
    groups: [...override.groups, { key: `g${highest + 1}`, modelCount: 1, weapons: [] }],
  };
}

export function removeGroup(override: UnitWeaponOverride, groupKey: string): UnitWeaponOverride {
  if (override.groups.length <= 1) return override;
  return { ...override, groups: override.groups.filter((g) => g.key !== groupKey) };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/weaponOverrides.test.ts && npx tsc -b`
Expected: all tests pass, `tsc` exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/weaponOverrides.ts src/lib/weaponOverrides.test.ts
git commit -m "Apply weapon overrides to a unit

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Use overrides everywhere units are shown, and highlight them

**Files:**
- Modify: `src/lib/loadouts.ts`, `src/lib/loadouts.test.ts` (`clearUnitCounts`)
- Modify: `src/lib/combat.ts`, `src/lib/combat.test.ts`, `src/lib/attackDisplay.test.ts` (`AttackRow.edited`)
- Create: `src/components/EditedTag.tsx`
- Modify: `src/App.tsx`, `src/components/ArmyPanel.tsx`, `src/components/ArmyConfigScreen.tsx`
- Modify: `src/components/UnitRow.tsx`, `src/components/UnitVisibilityPanel.tsx` (props only here), `src/components/UnitDetails.tsx`, `src/components/WeaponRow.tsx`, `src/components/AttackRow.tsx`

**Interfaces:**
- Consumes: Task 5 `StoredState.weaponOverrides`; Task 6 `applyWeaponOverrides`, `UnitWeaponOverride`, `OptionsLookup`; Task 4 `optionsLookup`.
- Produces: `clearUnitCounts(counts: CountsMap, unitId: string): CountsMap` in `src/lib/loadouts.ts`; `AttackRow.edited: boolean`; `<EditedTag className?>` and `<EditedNotice unit>` from `src/components/EditedTag.tsx`; props `weaponOverrides` on `ArmyPanel` and `ArmyConfigScreen`, and `onSetWeaponOverride(unitId, override | null)` on `ArmyConfigScreen`; App handler `handleSetWeaponOverride`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/loadouts.test.ts` (and add `clearUnitCounts` to its import list from `./loadouts`):

```ts
describe("clearUnitCounts", () => {
  it("removes every live count of one unit and keeps the rest", () => {
    expect(
      clearUnitCounts({ "u1:a": 2, "u1:ovr:g1": 3, "u2:a": 4 }, "u1"),
    ).toEqual({ "u2:a": 4 });
  });

  it("does not touch a unit whose id merely starts with the same text", () => {
    expect(clearUnitCounts({ "u10:a": 1, "u1:a": 2 }, "u1")).toEqual({ "u10:a": 1 });
  });
});
```

Append to `src/lib/combat.test.ts`:

```ts
describe("computeAttackTable — edited weapons", () => {
  it("carries the weapon's edited flag onto its row", () => {
    const [edited] = computeAttackTable(makeAttacker({ edited: true }), {}, makeUnit());
    expect(edited.edited).toBe(true);
    const [plain] = computeAttackTable(makeAttacker(), {}, makeUnit());
    expect(plain.edited).toBe(false);
  });
});
```

In `src/lib/attackDisplay.test.ts`, add `edited: false,` to the `base` fixture after `hazardous: false,`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/loadouts.test.ts src/lib/combat.test.ts`
Expected: FAIL (`clearUnitCounts` is not a function; `edited` is undefined).

- [ ] **Step 3: Implement the library changes**

In `src/lib/loadouts.ts` add after `getUnitLiveTotal`:

```ts
/** `counts` without any live model count of `unitId`. Editing a unit's
 * weapons changes its groups, so counts kept for the old ones must go. */
export function clearUnitCounts(counts: CountsMap, unitId: string): CountsMap {
  const prefix = `${unitId}:`;
  return Object.fromEntries(Object.entries(counts).filter(([key]) => !key.startsWith(prefix)));
}
```

In `src/lib/combat.ts`: in `interface AttackRow` after `hazardous: boolean;` add:

```ts
  /** The weapon was changed by a weapon override (shown with an EDITED tag). */
  edited: boolean;
```
and in the returned row object after `hazardous: hasKeyword(weapon.keywords, "Hazardous"),` add `edited: weapon.edited === true,`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/lib && npx tsc -b`
Expected: PASS and `tsc` exits 0 (UI changes follow).

- [ ] **Step 5: Create the tag and notice**

`src/components/EditedTag.tsx`:

```tsx
import type { ParsedUnit } from "../../parseRoster.mjs";

/** Amber outlined tag for an edited unit or weapon. Same shape as the allied tag. */
export function EditedTag({ className = "" }: { className?: string }) {
  return (
    <span
      title="Weapons edited in app"
      className={`display text-[10px] font-bold uppercase tracking-[0.12em] px-[5px] py-[1px] rounded-[var(--r-tag)] shrink-0 ${className}`}
      style={{ border: "1px solid var(--negative)", color: "var(--negative)" }}
    >
      Edited
    </span>
  );
}

/** Datasheet line saying a unit's weapons were edited here, with anything
 * the user should double-check. */
export function EditedNotice({ unit }: { unit: ParsedUnit }) {
  const lines = ["Weapons edited in app — not validated."];
  if (unit.rosterChanged) {
    lines.push("The roster for this unit changed in New Recruit after this edit.");
  }
  if (unit.missingWeapons && unit.missingWeapons.length > 0) {
    lines.push(`Not in the catalogue: ${unit.missingWeapons.join(", ")}.`);
  }
  return (
    <div
      role="note"
      className="mx-[14px] mt-[12px] px-[12px] py-[10px] rounded-[var(--r-control)] text-[14px] font-medium flex flex-col gap-[4px]"
      style={{ background: "var(--negative-fill)", color: "var(--negative)" }}
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Apply overrides in the pipeline**

`src/components/ArmyPanel.tsx`:
1. Add imports: `import { optionsLookup } from "../data/unit-options";`, `import { applyWeaponOverrides, type UnitWeaponOverride } from "../lib/weaponOverrides";`.
2. Add to `ArmyPanelProps`: `/** unitId -> weapon override, applied before leader bonuses. */ weaponOverrides: Record<string, UnitWeaponOverride>;` and destructure `weaponOverrides` in the component.
3. Replace `const units = applyLeaderWeaponBonuses(visible, leaderAssignments);` with:

```tsx
  const units = applyLeaderWeaponBonuses(
    applyWeaponOverrides(visible, weaponOverrides, optionsLookup(army.parsed.catalogue)),
    leaderAssignments,
  );
```

`src/components/ArmyConfigScreen.tsx`:
1. Add the same two imports.
2. Add to `ArmyConfigScreenProps`: `weaponOverrides: Record<string, UnitWeaponOverride>;` and `onSetWeaponOverride: (unitId: string, override: UnitWeaponOverride | null) => void;`; destructure both.
3. Replace `const units = applyLeaderWeaponBonuses(army.parsed.units, leaderAssignments);` with:

```tsx
  const units = applyLeaderWeaponBonuses(
    applyWeaponOverrides(army.parsed.units, weaponOverrides, optionsLookup(army.parsed.catalogue)),
    leaderAssignments,
  );
```
4. Pass `weaponOverrides={weaponOverrides}` and `onSetWeaponOverride={onSetWeaponOverride}` to `<UnitVisibilityPanel ...>`. In `src/components/UnitVisibilityPanel.tsx` add to `UnitVisibilityPanelProps` (interface only; Task 8 destructures and uses them, so nothing is unused yet): `weaponOverrides: Record<string, UnitWeaponOverride>;` and `onSetWeaponOverride: (unitId: string, override: UnitWeaponOverride | null) => void;`, with `import type { UnitWeaponOverride } from "../lib/weaponOverrides";`.

`src/App.tsx`:
1. Add imports: `import { optionsLookup } from "./data/unit-options";`, `import { clearUnitCounts } from "./lib/loadouts";`, `import { applyWeaponOverrides, type UnitWeaponOverride } from "./lib/weaponOverrides";`.
2. Replace the `unitsA` / `unitsB` blocks:

```tsx
  const unitsA = armyA
    ? applyLeaderWeaponBonuses(
        applyWeaponOverrides(
          visibleUnits(armyA.parsed.units, state.hiddenUnitIds),
          state.weaponOverrides,
          optionsLookup(armyA.parsed.catalogue),
        ),
        state.leaderAssignments,
      )
    : [];
  const unitsB = armyB
    ? applyLeaderWeaponBonuses(
        applyWeaponOverrides(
          visibleUnits(armyB.parsed.units, state.hiddenUnitIds),
          state.weaponOverrides,
          optionsLookup(armyB.parsed.catalogue),
        ),
        state.leaderAssignments,
      )
    : [];
```
3. After `handleToggleHidden` add:

```tsx
  function handleSetWeaponOverride(unitId: string, override: UnitWeaponOverride | null) {
    setState((prev) => {
      const weaponOverrides = { ...prev.weaponOverrides };
      if (override === null) {
        delete weaponOverrides[unitId];
      } else {
        weaponOverrides[unitId] = override;
      }
      // The groups changed, so live counts kept for the old ones are stale.
      const nextState: StoredState = {
        ...prev,
        weaponOverrides,
        modelCounts: clearUnitCounts(prev.modelCounts, unitId),
        syncDirty: true,
      };
      saveState(nextState);
      return nextState;
    });
    sync.noteLocalEdit();
  }
```
4. Pass `weaponOverrides={state.weaponOverrides}` to both `<ArmyPanel ...>` elements, and `weaponOverrides={state.weaponOverrides}` and `onSetWeaponOverride={handleSetWeaponOverride}` to `<ArmyConfigScreen ...>`.

- [ ] **Step 7: Show the highlights**

`src/components/UnitRow.tsx`: add `import { EditedTag } from "./EditedTag";` and, directly after the allied-faction tag block (`{isAllied && unit.faction && (...)}`), add `{unit.weaponsEdited && <EditedTag />}`.

`src/components/UnitVisibilityPanel.tsx`: add `import { EditedTag } from "./EditedTag";` and inside the unit-name `<span className="flex-1 min-w-0 text-[17px] ...">`, after the Warlord star line, add `{unit.weaponsEdited && <EditedTag className="ml-[8px] align-middle" />}`.

`src/components/UnitDetails.tsx`: add `import { EditedNotice } from "./EditedTag";` and, directly after `<UnitKeywords unit={unit} />`, add `{unit.weaponsEdited && <EditedNotice unit={unit} />}`.

`src/components/WeaponRow.tsx`: add `import { EditedTag } from "./EditedTag";` and, directly after the weapon-name `<span className="text-[17px] font-semibold leading-[1.2]">{weapon.name}</span>`, add `{weapon.edited && <EditedTag className="self-center" />}`.

`src/components/AttackRow.tsx`: add `import { EditedTag } from "./EditedTag";` and, directly after the weapon-name `<span className="text-[17px] font-semibold leading-[1.2]">{row.name}</span>`, add `{row.edited && <EditedTag className="self-center" />}`.

- [ ] **Step 8: Verify**

Run: `npx tsc -b && npx eslint src 2>&1 | tail -3 && npx vitest run`
Expected: `tsc` exits 0; eslint reports 0 errors (the 3 existing warnings are fine); all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/loadouts.ts src/lib/loadouts.test.ts src/lib/combat.ts src/lib/combat.test.ts src/lib/attackDisplay.test.ts src/components/EditedTag.tsx src/App.tsx src/components/ArmyPanel.tsx src/components/ArmyConfigScreen.tsx src/components/UnitRow.tsx src/components/UnitVisibilityPanel.tsx src/components/UnitDetails.tsx src/components/WeaponRow.tsx src/components/AttackRow.tsx
git commit -m "Apply weapon overrides to units and highlight edited ones

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The weapon editor

**Files:**
- Create: `src/components/WeaponEditor.tsx`
- Modify: `src/components/UnitDetails.tsx` (edit button and editor slot)
- Modify: `src/components/UnitVisibilityPanel.tsx` (open the editor)

**Interfaces:**
- Consumes: Task 6 helpers (`startOverride`, `rosterSignature`, `resolveWeapon`, `setGroupModelCount`, `setWeaponPerModel`, `swapWeapon`, `addWeapon`, `removeWeapon`, `addGroup`, `removeGroup`) and `UnitWeaponOverride`; Task 4 `optionsLookup`, `UnitOptionsResult`, `WeaponOptionProfile`; existing `Stepper`; Task 7 props on `UnitVisibilityPanel`.
- Produces: `<WeaponEditor unit override options onChange onClose />`; `UnitDetails` props `onEditWeapons?: () => void` and `editor?: ReactNode`.

- [ ] **Step 1: Create the editor**

`src/components/WeaponEditor.tsx`:

```tsx
import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { UnitOptionsResult, WeaponOptionProfile } from "../data/unit-options";
import {
  addGroup,
  addWeapon,
  removeGroup,
  removeWeapon,
  resolveWeapon,
  rosterSignature,
  setGroupModelCount,
  setWeaponPerModel,
  startOverride,
  swapWeapon,
  type UnitWeaponOverride,
} from "../lib/weaponOverrides";
import { Stepper } from "./Stepper";

interface WeaponEditorProps {
  /** The roster unit, before any override. */
  unit: ParsedUnit;
  override: UnitWeaponOverride | null;
  options: UnitOptionsResult | null;
  /** The new override, or null to go back to the roster's weapons. */
  onChange: (next: UnitWeaponOverride | null) => void;
  onClose: () => void;
}

function summary(p: WeaponOptionProfile): string {
  const skill = p.type === "melee" ? "WS" : "BS";
  const range = p.type === "ranged" && p.range ? `${p.range} ` : "";
  return `${range}A${p.attacks} ${skill}${p.skill ?? "—"} S${p.strength} AP${p.ap} D${p.damage}`;
}

const buttonClass =
  "min-h-[44px] px-[12px] rounded-[var(--r-control)] text-[15px] font-semibold";

/**
 * Edits which weapons a unit's models carry. Replaces the weapon table on
 * the configuration screen. Nothing here is checked against the datasheet
 * and points never change; the warning says so and stays on screen.
 */
export function WeaponEditor({ unit, override, options, onChange, onClose }: WeaponEditorProps) {
  const [picker, setPicker] = useState<{ groupKey: string; replace: string | null } | null>(null);

  if (!options || options.weapons.length === 0) {
    return (
      <div className="px-[14px] py-[12px] flex flex-col gap-[10px]">
        <p className="prose m-0">
          No weapon options for this unit. Run <code>npm run sync:options</code>.
        </p>
        <button type="button" onClick={onClose} className={buttonClass} style={{ border: "1px solid var(--rule)" }}>
          Done
        </button>
      </div>
    );
  }

  const working = override ?? startOverride(unit, options);
  const rosterChanged = override !== null && override.rosterSignature !== rosterSignature(unit);

  function pick(optionName: string) {
    if (!picker) return;
    onChange(
      picker.replace === null
        ? addWeapon(working, picker.groupKey, optionName)
        : swapWeapon(working, picker.groupKey, picker.replace, optionName),
    );
    setPicker(null);
  }

  return (
    <div className="px-[14px] py-[12px] flex flex-col gap-[12px]">
      <div
        role="note"
        className="px-[12px] py-[10px] rounded-[var(--r-control)] text-[14px] font-medium"
        style={{ background: "var(--negative-fill)", color: "var(--negative)" }}
      >
        Not validated. The app does not check what this unit may take and does not change its
        points. Check the datasheet or New Recruit.
      </div>
      {rosterChanged && (
        <div
          role="note"
          className="px-[12px] py-[10px] rounded-[var(--r-control)] text-[14px] font-medium"
          style={{ background: "var(--negative-fill)", color: "var(--negative)" }}
        >
          The roster for this unit changed in New Recruit after this edit. Keep it, or reset to the
          roster.
        </div>
      )}

      {working.groups.map((group, index) => (
        <div
          key={group.key}
          className="rounded-[var(--r-control)] p-[12px] flex flex-col gap-[10px]"
          style={{ background: "var(--paper-sunk)", border: "1px solid var(--rule)" }}
        >
          <div className="flex items-center justify-between gap-[10px]">
            <span className="caption">Group {index + 1}</span>
            <div className="flex items-center gap-[10px]">
              <span className="text-[14px] font-medium" style={{ color: "var(--ink-2)" }}>
                Models
              </span>
              <Stepper
                value={group.modelCount}
                valueWidth={44}
                decrementLabel={`Fewer models in group ${index + 1}`}
                incrementLabel={`More models in group ${index + 1}`}
                decrementDisabled={group.modelCount <= 0}
                incrementDisabled={false}
                onDecrement={() => onChange(setGroupModelCount(working, group.key, group.modelCount - 1))}
                onIncrement={() => onChange(setGroupModelCount(working, group.key, group.modelCount + 1))}
              />
            </div>
          </div>

          {group.weapons.length === 0 && (
            <p className="m-0 text-[14px]" style={{ color: "var(--ink-soft)" }}>
              No weapons in this group.
            </p>
          )}
          {group.weapons.map((weapon) => {
            const known = resolveWeapon(weapon.name, options, unit) !== null;
            return (
              <div key={weapon.name} className="flex items-center gap-[8px]">
                {known ? (
                  <button
                    type="button"
                    onClick={() => setPicker({ groupKey: group.key, replace: weapon.name })}
                    className="flex-1 min-w-0 min-h-[44px] text-left text-[17px] font-semibold"
                    aria-label={`Swap ${weapon.name}`}
                  >
                    <span className="has-rule">{weapon.name}</span>
                  </button>
                ) : (
                  <span className="flex-1 min-w-0 text-[17px] font-semibold" style={{ color: "var(--negative)" }}>
                    {weapon.name}
                    <span className="block text-[13px] font-medium">not in catalogue</span>
                  </span>
                )}
                <Stepper
                  value={`${weapon.perModel}×`}
                  valueWidth={44}
                  decrementLabel={`Fewer ${weapon.name} per model`}
                  incrementLabel={`More ${weapon.name} per model`}
                  decrementDisabled={weapon.perModel <= 1}
                  incrementDisabled={false}
                  onDecrement={() => onChange(setWeaponPerModel(working, group.key, weapon.name, weapon.perModel - 1))}
                  onIncrement={() => onChange(setWeaponPerModel(working, group.key, weapon.name, weapon.perModel + 1))}
                />
                <button
                  type="button"
                  onClick={() => onChange(removeWeapon(working, group.key, weapon.name))}
                  aria-label={`Remove ${weapon.name}`}
                  className="w-[46px] h-[46px] shrink-0 flex items-center justify-center rounded-[var(--r-control)] text-[18px]"
                  style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
                >
                  ✕
                </button>
              </div>
            );
          })}

          {picker?.groupKey === group.key ? (
            <div
              className="rounded-[var(--r-control)] overflow-hidden"
              style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
            >
              <div className="caption px-[12px] pt-[10px] pb-[6px]">
                {picker.replace === null ? "Add a weapon" : `Replace ${picker.replace}`}
              </div>
              {options.weapons.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => pick(option.name)}
                  className="w-full min-h-[44px] px-[12px] py-[8px] text-left"
                  style={{ borderTop: "1px solid var(--rule-soft)" }}
                >
                  <span className="block text-[16px] font-semibold">{option.name}</span>
                  {option.profiles.map((p) => (
                    <span
                      key={p.id}
                      className="mono block text-[12px]"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {summary(p)}
                    </span>
                  ))}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="w-full min-h-[44px] px-[12px] text-left text-[15px] font-semibold"
                style={{ borderTop: "1px solid var(--rule-soft)", color: "var(--ink-2)" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-[8px] flex-wrap">
              <button
                type="button"
                onClick={() => setPicker({ groupKey: group.key, replace: null })}
                className={buttonClass}
                style={{ border: "1px solid var(--rule)" }}
              >
                + Add weapon
              </button>
              {working.groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(removeGroup(working, group.key))}
                  className={buttonClass}
                  style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
                >
                  Remove group
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-[8px] flex-wrap">
        <button
          type="button"
          onClick={() => onChange(addGroup(working))}
          className={buttonClass}
          style={{ border: "1px solid var(--rule)" }}
        >
          + Add group
        </button>
        <button
          type="button"
          disabled={override === null}
          onClick={() => onChange(null)}
          className={buttonClass}
          style={{
            border: "1px solid var(--rule)",
            color: override === null ? "var(--ink-off)" : "var(--ink-2)",
          }}
        >
          Reset to roster
        </button>
        <button type="button" onClick={onClose} className={`${buttonClass} selected ml-auto`}>
          Done
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the editor slot to the datasheet**

In `src/components/UnitDetails.tsx`:
1. Add `import type { ReactNode } from "react";` as the first import (merge with any existing react import).
2. In `UnitDetailsProps` add:

```ts
  /** Configuration screen only: opens the weapon editor. */
  onEditWeapons?: () => void;
  /** When set, shown in place of the weapon table (the open weapon editor). */
  editor?: ReactNode;
```
3. Destructure `onEditWeapons` and `editor` in the component's parameters.
4. Replace the `unit.weapons.length > 0 && ( <div style={{ borderTop: ... }}> ... </div> )` branch of the `weapons === "counter" ? ... : ...` conditional (the `"table"` branch) with:

```tsx
        (unit.weapons.length > 0 || editor || onEditWeapons) && (
          <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
            <div className="flex items-center justify-between gap-[10px] px-[14px] pt-[12px] pb-[4px]">
              <span className="caption">Weapons</span>
              {onEditWeapons && !editor && (
                <button
                  type="button"
                  onClick={onEditWeapons}
                  className="min-h-[44px] px-[12px] rounded-[var(--r-control)] text-[15px] font-semibold"
                  style={{ border: "1px solid var(--rule)" }}
                >
                  Edit weapons
                </button>
              )}
            </div>
            {editor ?? <WeaponTable weapons={unit.weapons} />}
          </div>
        )
```

- [ ] **Step 3: Open the editor from the Units tab**

In `src/components/UnitVisibilityPanel.tsx`:
1. Add imports: `import { optionsLookup } from "../data/unit-options";`, `import { WeaponEditor } from "./WeaponEditor";` (the `UnitWeaponOverride` type import and the two props were added to the interface in Task 7).
2. Inside the component, after the `useState` for `expandedId`, add `const [editingId, setEditingId] = useState<string | null>(null);` and `const lookup = optionsLookup(army.catalogue);`; make sure `weaponOverrides` and `onSetWeaponOverride` are destructured from the props.
3. In the `units.map` callback, after `const expanded = ...`, add `const rosterUnit = army.units.find((u) => u.id === unit.id);`.
4. Replace the `<UnitDetails ... weapons="table" />` element with:

```tsx
                  <UnitDetails
                    unit={unit}
                    counts={counts}
                    onCountChange={onCountChange}
                    detachmentData={detachmentData}
                    weapons="table"
                    onEditWeapons={rosterUnit ? () => setEditingId(unit.id) : undefined}
                    editor={
                      expanded && editingId === unit.id && rosterUnit ? (
                        <WeaponEditor
                          unit={rosterUnit}
                          override={weaponOverrides[unit.id] ?? null}
                          options={lookup(rosterUnit.entryId)}
                          onChange={(next) => onSetWeaponOverride(unit.id, next)}
                          onClose={() => setEditingId(null)}
                        />
                      ) : undefined
                    }
                  />
```

- [ ] **Step 4: Verify**

Run: `npx tsc -b && npx eslint src 2>&1 | tail -3 && npx vitest run`
Expected: `tsc` exits 0; 0 lint errors; all tests pass.

- [ ] **Step 5: Verify in the browser**

Start the dev server (`preview_start` with name `waha-dev` if it is not running). At 390x844 open `http://localhost:5173/#/config/Custody%E2%80%99s?a=Custody%E2%80%99s&b=Orks`, tab Units, expand "Custodian Guard", tap "Edit weapons".
Expected: the amber "Not validated" note, one group of 5 models with "Sentinel blade". Lower the group to 3 models, tap "+ Add group", set it to 2 models, "+ Add weapon" and choose "Guardian Spear". The unit row gains an amber EDITED tag, the datasheet shows "Weapons edited in app — not validated.", and the weapon table lists Guardian Spear with an EDITED chip. No horizontal overflow, every button at least 44px.

- [ ] **Step 6: Commit**

```bash
git add src/components/WeaponEditor.tsx src/components/UnitDetails.tsx src/components/UnitVisibilityPanel.tsx
git commit -m "Add the weapon editor to the Units tab

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: End-to-end check, docs, and clean-up

**Files:**
- Modify: `docs/army-data-architecture.md` (new short section)

- [ ] **Step 1: Full verification**

Run: `npx tsc -b && npx eslint . 2>&1 | tail -3 && npx vitest run && npm run build 2>&1 | grep -E "built in|precache|error"`
Expected: all pass; build succeeds.

- [ ] **Step 2: Battle screen and calculator**

With the Custodian Guard edit from Task 8 still in place, open `http://localhost:5173/#/battle?a=Custody%E2%80%99s&b=Orks&side=a`, expand Custodian Guard, then expand any Orks unit on side B and set the header to Melee.
Expected: the Custodian Guard row shows "5/5" and an EDITED tag; its datasheet shows the notice, two model groups under MODELS with steppers, and the weapon table; the calculator lists "Guardian Spear" with an EDITED chip and a weapon count of 2, "Sentinel Blade" with count 3. Lower one group's stepper by one and confirm the calculator count follows.

- [ ] **Step 3: Survives an army sync**

Run: `npm run sync:armies 2>&1 | grep -E "Found|wrote|Done"`
Expected: "5 written". Reload the page: the edit, tag and calculator rows are unchanged. Run `git status --short armies` and confirm only roster files appear (unchanged files do not).

- [ ] **Step 4: Clean up the test edit**

In the browser, open the Units tab, expand Custodian Guard, tap "Edit weapons", then "Reset to roster". Expected: the EDITED tag and notice disappear and the unit is back to five models with Sentinel Blades.

- [ ] **Step 5: Document**

Add to `docs/army-data-architecture.md`, before `## 8. Syncing from New Recruit`, a new section:

```markdown
## Weapon overrides

A unit's weapons can be changed on the configuration screen (Units tab, "Edit weapons"). The roster files in `armies/` are never edited. An edit is stored in the synced config as `weaponOverrides[unitId]`: model groups with weapon *names*. At render time `applyWeaponOverrides` (src/lib/weaponOverrides.ts) rebuilds the unit's loadouts and weapons from those names, before leader bonuses, so every screen and the calculator see it.

Weapon names resolve against `src/data/unit-options/`, generated by `npm run sync:options` from New Recruit's catalogue books. Nothing is validated and points never change; edited units and weapons are tagged EDITED. Design: `docs/superpowers/specs/2026-10-01-weapon-overrides-design.md`.
```

- [ ] **Step 6: Commit**

```bash
git add docs/army-data-architecture.md
git commit -m "Document weapon overrides

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
