# Combat Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show hit/wound/save target numbers for every weapon between the two currently-selected units, in both directions, in the result drawer `App.tsx` already reserves space for.

**Architecture:** A pure compute module (`src/lib/combat.ts`) turns an attacker/target `ParsedUnit` pair into rows of target numbers, reusing the weapon-merge logic already in `WeaponTable` (extracted to a shared lib first) and the live-count logic already in `ModelCounter`. Three new presentational components (`AttackRow`, `AttackTable`, `ResultDrawer`) render it; `App.tsx` resolves the two selected `ParsedUnit`s (new — it currently only threads ids) and wires them in.

**Tech Stack:** Existing Vite + React + TypeScript + Vitest. No new dependencies.

**Spec:** [docs/combat-calculator-design.md](combat-calculator-design.md)

## Global Constraints

- Hit target is `weapon.skill` as-is — no modifiers this pass. `null` means auto-hit, displayed `auto`.
- Wound target is the exact S-vs-T table from the spec: `S≥2T→2+`, `S>T→3+`, `S=T→4+`, `2S≤T→6+`, else `5+`.
- Save target = `min(SV−AP, invuln)` when an invuln exists, else `SV−AP`. Flag `isInvulnFallback` only when invuln is *strictly* better than the modified armor save (a tie stays on armor, unflagged). When armor exceeds 6+ and there's no invuln, the save is impossible (`saveTarget: null`), not a nonsense `7+`.
- The only keyword-driven effects computed this pass: **Anti-X N+** (wound target becomes `min(computed, N)` when the target has keyword X) and **Torrent** (already free via `skill === null`). Every other keyword (Sustained Hits, Lethal Hits, Devastating Wounds, Blast, Twin-linked) stays plain text — do not compute their effects.
- Weapon counts are **live** counts (post-casualties) via the existing `getLiveWeaponCount` from `src/lib/loadouts.ts` — never the full roster count.
- No cover, no ±1 toggles, no reroll mechanics, no expected-damage output — all explicitly out of scope for this pass (spec §1).
- No component-test infrastructure — UI tasks are verified against the running dev server in a browser, matching every prior UI pass in this project.
- This project has no git repository. Skip every commit step below — each task's completion is verified by its tests and `npm run build`/`npm run lint` passing instead.

---

### Task 1: Extract shared weapon merge (`src/lib/weapons.ts`)

**Files:**
- Create: `src/lib/weapons.ts`
- Test: `src/lib/weapons.test.ts`
- Modify: `src/components/WeaponTable.tsx`

**Interfaces:**
- Consumes: `WeaponEntry` type from `parseRoster.mjs`.
- Produces: `mergeByProfileId(weapons: WeaponEntry[]): WeaponEntry[]` — one entry per distinct `profileId`, each a **copy** (not a reference into the input array). Task 2's `combat.ts` imports this directly.

- [ ] **Step 1: Write the failing test**

Create `src/lib/weapons.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { WeaponEntry } from "../../parseRoster.mjs";
import { mergeByProfileId } from "./weapons";

const bolter: WeaponEntry = {
  profileId: "bolter-id",
  name: "Storm bolter",
  subProfile: false,
  type: "ranged",
  count: 1,
  range: '24"',
  attacks: { dice: 0, sides: 0, flat: 2, raw: "2", avg: 2 },
  skill: 3,
  skillRaw: "3+",
  strength: 4,
  ap: 0,
  damage: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 },
  keywords: ["Rapid Fire 2"],
};

describe("mergeByProfileId", () => {
  it("keeps one row per distinct profileId", () => {
    const merged = mergeByProfileId([
      { ...bolter, count: 1 },
      { ...bolter, count: 3 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].profileId).toBe("bolter-id");
  });

  it("preserves distinct profileIds as separate rows", () => {
    const other = { ...bolter, profileId: "other-id", name: "Incinerator" };
    const merged = mergeByProfileId([bolter, other]);
    expect(merged.map((w) => w.profileId).sort()).toEqual([
      "bolter-id",
      "other-id",
    ]);
  });

  it("returns copies, not references into the input", () => {
    const original = { ...bolter };
    const merged = mergeByProfileId([bolter]);
    merged[0].count = 999;
    expect(bolter.count).toBe(original.count);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/lib/weapons.test.ts`
Expected: FAIL — `src/lib/weapons.ts` does not exist yet.

- [ ] **Step 3: Implement**

Create `src/lib/weapons.ts`:

```ts
import type { WeaponEntry } from "../../parseRoster.mjs";

export function mergeByProfileId(weapons: WeaponEntry[]): WeaponEntry[] {
  const byId = new Map<string, WeaponEntry>();
  for (const w of weapons) {
    if (!byId.has(w.profileId)) {
      byId.set(w.profileId, { ...w });
    }
  }
  return [...byId.values()];
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/lib/weapons.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Point `WeaponTable` at the shared function**

Edit `src/components/WeaponTable.tsx`. Replace:

```ts
import type { ParsedUnit, WeaponEntry } from "../../parseRoster.mjs";
import { getLiveWeaponCount } from "../lib/loadouts";
import { WeaponRow } from "./WeaponRow";

interface WeaponTableProps {
  unit: ParsedUnit;
  counts: Record<string, number>;
}

type MergedWeapon = WeaponEntry;

function mergeByProfileId(weapons: WeaponEntry[]): MergedWeapon[] {
  const byId = new Map<string, MergedWeapon>();
  for (const w of weapons) {
    if (!byId.has(w.profileId)) {
      byId.set(w.profileId, { ...w });
    }
  }
  return [...byId.values()];
}

function parentName(name: string): string {
```

with:

```ts
import type { ParsedUnit, WeaponEntry } from "../../parseRoster.mjs";
import { getLiveWeaponCount } from "../lib/loadouts";
import { mergeByProfileId } from "../lib/weapons";
import { WeaponRow } from "./WeaponRow";

interface WeaponTableProps {
  unit: ParsedUnit;
  counts: Record<string, number>;
}

type MergedWeapon = WeaponEntry;

function parentName(name: string): string {
```

(This removes the local `mergeByProfileId` and imports the shared one instead. Everything else in the file — `parentName`, `groupSubProfiles`, `Section`, the exported `WeaponTable` — is unchanged.)

- [ ] **Step 6: Verify nothing broke**

Run: `npm run build && npm run lint && npm run test:unit`
Expected: build succeeds, lint is clean, all existing unit tests still pass (this step only moved code — `WeaponTable`'s rendered output is unchanged, so no new verification needed beyond the existing suite passing).

---

### Task 2: Compute core (`src/lib/combat.ts`)

**Files:**
- Create: `src/lib/combat.ts`
- Test: `src/lib/combat.test.ts`

**Interfaces:**
- Consumes: `mergeByProfileId` from `src/lib/weapons.ts` (Task 1); `getLiveWeaponCount` from `src/lib/loadouts.ts` (already exists); `ParsedUnit`, `WeaponEntry`, `DiceExpr` types from `parseRoster.mjs`.
- Produces: `interface AttackRow { profileId, name, type, subProfile, count, attacksRaw, totalAttacks, hitTarget, woundTarget, antiX, armorTarget, saveTarget, isInvulnFallback, ap, damage, keywords }` and `computeAttackTable(attacker: ParsedUnit, attackerCounts: Record<string, number>, target: ParsedUnit): AttackRow[]` — Task 3's `AttackTable`/`AttackRow` components consume both directly.

Note on `armorTarget`: the spec's row format (`Save 4+ (3+ / AP-1)`) needs the *unmodified* armor save number for display, separately from the final `saveTarget` (which may come from the invuln instead). `armorTarget` (`SV − AP`, before considering invuln; `null` if the target has no `SV`) carries that — it's a small, spec-consistent addition beyond the interface sketch in the design doc's §2, needed to actually render §4's row format.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/combat.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ParsedUnit, WeaponEntry } from "../../parseRoster.mjs";
import { computeAttackTable } from "./combat";

function makeWeapon(overrides: Partial<WeaponEntry> = {}): WeaponEntry {
  return {
    profileId: "w1",
    name: "Test weapon",
    subProfile: false,
    type: "ranged",
    count: 1,
    range: '24"',
    attacks: { dice: 0, sides: 0, flat: 2, raw: "2", avg: 2 },
    skill: 3,
    skillRaw: "3+",
    strength: 4,
    ap: 0,
    damage: { dice: 0, sides: 0, flat: 1, raw: "1", avg: 1 },
    keywords: [],
    ...overrides,
  };
}

function makeUnit(overrides: Partial<ParsedUnit> = {}): ParsedUnit {
  return {
    id: "target",
    name: "Test unit",
    kind: "unit",
    basePoints: 0,
    totalPoints: 0,
    modelCount: 1,
    models: [],
    profile: { M: '6"', T: 4, SV: 3, W: 2, LD: "6+", OC: 1 },
    invuln: null,
    keywords: [],
    faction: null,
    isWarlord: false,
    enhancements: [],
    weapons: [],
    loadouts: [],
    abilities: [],
    ...overrides,
  };
}

function makeAttacker(weaponOverrides: Partial<WeaponEntry> = {}): ParsedUnit {
  const weapon = makeWeapon(weaponOverrides);
  return makeUnit({
    id: "attacker",
    weapons: [weapon],
    loadouts: [
      {
        key: "self",
        modelCount: 1,
        weapons: [
          { profileId: weapon.profileId, name: weapon.name, perModel: weapon.count },
        ],
      },
    ],
  });
}

describe("computeAttackTable — wound target", () => {
  it("S >= 2T wounds on 2+", () => {
    const [row] = computeAttackTable(makeAttacker({ strength: 8 }), {}, makeUnit());
    expect(row.woundTarget).toBe(2);
  });

  it("S > T wounds on 3+", () => {
    const [row] = computeAttackTable(makeAttacker({ strength: 5 }), {}, makeUnit());
    expect(row.woundTarget).toBe(3);
  });

  it("S == T wounds on 4+", () => {
    const [row] = computeAttackTable(makeAttacker({ strength: 4 }), {}, makeUnit());
    expect(row.woundTarget).toBe(4);
  });

  it("2S <= T wounds on 6+", () => {
    const target = makeUnit({ profile: { M: '6"', T: 8, SV: 3, W: 2, LD: "6+", OC: 1 } });
    const [row] = computeAttackTable(makeAttacker({ strength: 3 }), {}, target);
    expect(row.woundTarget).toBe(6);
  });

  it("otherwise (S < T, 2S > T) wounds on 5+", () => {
    const [row] = computeAttackTable(makeAttacker({ strength: 3 }), {}, makeUnit());
    expect(row.woundTarget).toBe(5);
  });
});

describe("computeAttackTable — save target", () => {
  it("plain armor save with no AP", () => {
    const [row] = computeAttackTable(makeAttacker({ ap: 0 }), {}, makeUnit());
    expect(row.saveTarget).toBe(3);
    expect(row.isInvulnFallback).toBe(false);
  });

  it("AP worsens the armor save", () => {
    const [row] = computeAttackTable(makeAttacker({ ap: -2 }), {}, makeUnit());
    expect(row.saveTarget).toBe(5);
    expect(row.isInvulnFallback).toBe(false);
  });

  it("falls back to invuln when it's better than the modified armor save", () => {
    const target = makeUnit({ invuln: { value: 4, conditional: false } });
    const [row] = computeAttackTable(makeAttacker({ ap: -2 }), {}, target);
    expect(row.saveTarget).toBe(4);
    expect(row.isInvulnFallback).toBe(true);
  });

  it("does not fall back when invuln is worse than the armor save", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: false } });
    const [row] = computeAttackTable(makeAttacker({ ap: 0 }), {}, target);
    expect(row.saveTarget).toBe(3);
    expect(row.isInvulnFallback).toBe(false);
  });

  it("is impossible when AP exceeds 6+ and there's no invuln", () => {
    const [row] = computeAttackTable(makeAttacker({ ap: -5 }), {}, makeUnit());
    expect(row.saveTarget).toBe(null);
  });

  it("uses the invuln when armor is impossible", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: false } });
    const [row] = computeAttackTable(makeAttacker({ ap: -5 }), {}, target);
    expect(row.saveTarget).toBe(5);
    expect(row.isInvulnFallback).toBe(true);
  });
});

describe("computeAttackTable — Anti-X", () => {
  it("overrides a worse wound target when the target has the keyword", () => {
    const attacker = makeAttacker({ strength: 3, keywords: ["Anti-Infantry 2+"] });
    const target = makeUnit({ keywords: ["Infantry"] });
    const [row] = computeAttackTable(attacker, {}, target);
    expect(row.woundTarget).toBe(2);
    expect(row.antiX).toEqual({ keyword: "Infantry", threshold: 2 });
  });

  it("does not override an already-better wound target", () => {
    const attacker = makeAttacker({ strength: 8, keywords: ["Anti-Infantry 4+"] });
    const target = makeUnit({ keywords: ["Infantry"] });
    const [row] = computeAttackTable(attacker, {}, target);
    expect(row.woundTarget).toBe(2);
  });

  it("does not apply when the target lacks the keyword", () => {
    const attacker = makeAttacker({ strength: 3, keywords: ["Anti-Infantry 2+"] });
    const target = makeUnit({ keywords: ["Vehicle"] });
    const [row] = computeAttackTable(attacker, {}, target);
    expect(row.woundTarget).toBe(5);
    expect(row.antiX).toBe(null);
  });
});

describe("computeAttackTable — auto-hit weapons", () => {
  it("Torrent (skill: null) reports hitTarget null; wound/save still computed", () => {
    const attacker = makeAttacker({ skill: null, skillRaw: "N/A" });
    const [row] = computeAttackTable(attacker, {}, makeUnit());
    expect(row.hitTarget).toBe(null);
    expect(row.woundTarget).toBe(4);
    expect(row.saveTarget).toBe(3);
  });
});

describe("computeAttackTable — live counts", () => {
  it("reflects a casualty-reduced loadout, not the full roster count", () => {
    const weapon = makeWeapon({ profileId: "bolter", count: 1 });
    const attacker = makeUnit({
      id: "squad",
      weapons: [weapon],
      loadouts: [
        {
          key: "bolter-loadout",
          modelCount: 5,
          weapons: [{ profileId: "bolter", name: weapon.name, perModel: 1 }],
        },
      ],
    });
    const target = makeUnit();

    const fullStrength = computeAttackTable(attacker, {}, target);
    expect(fullStrength[0].count).toBe(5);
    expect(fullStrength[0].totalAttacks).toBe(10);

    const counts = { "squad:bolter-loadout": 3 };
    const afterCasualties = computeAttackTable(attacker, counts, target);
    expect(afterCasualties[0].count).toBe(3);
    expect(afterCasualties[0].totalAttacks).toBe(6);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run src/lib/combat.test.ts`
Expected: FAIL — `src/lib/combat.ts` does not exist yet.

- [ ] **Step 3: Implement**

Create `src/lib/combat.ts`:

```ts
import type { DiceExpr, ParsedUnit } from "../../parseRoster.mjs";
import { getLiveWeaponCount } from "./loadouts";
import { mergeByProfileId } from "./weapons";

export interface AttackRow {
  profileId: string;
  name: string;
  type: "ranged" | "melee";
  subProfile: boolean;
  count: number;
  attacksRaw: string;
  totalAttacks: number;
  hitTarget: number | null;
  woundTarget: number;
  antiX: { keyword: string; threshold: number } | null;
  armorTarget: number | null;
  saveTarget: number | null;
  isInvulnFallback: boolean;
  ap: number;
  damage: DiceExpr;
  keywords: string[];
}

function baseWoundTarget(strength: number, toughness: number): number {
  if (strength >= 2 * toughness) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (2 * strength <= toughness) return 6;
  return 5;
}

const ANTI_X_PATTERN = /Anti-(\w+) (\d)\+/;

function findAntiX(
  weaponKeywords: string[],
  targetKeywords: string[],
): { keyword: string; threshold: number } | null {
  for (const kw of weaponKeywords) {
    const match = ANTI_X_PATTERN.exec(kw);
    if (!match) continue;
    const [, keyword, thresholdRaw] = match;
    if (targetKeywords.includes(keyword)) {
      return { keyword, threshold: Number(thresholdRaw) };
    }
  }
  return null;
}

export function computeAttackTable(
  attacker: ParsedUnit,
  attackerCounts: Record<string, number>,
  target: ParsedUnit,
): AttackRow[] {
  const merged = mergeByProfileId(attacker.weapons);

  return merged.map((weapon) => {
    const count = getLiveWeaponCount(
      attackerCounts,
      attacker.id,
      attacker,
      weapon.profileId,
    );

    const sv = target.profile.SV;
    const armorTarget = sv != null ? sv - weapon.ap : null;
    const invulnValue = target.invuln?.value ?? null;

    let saveTarget: number | null;
    let isInvulnFallback = false;

    if (armorTarget != null && armorTarget <= 6) {
      if (invulnValue != null && invulnValue < armorTarget) {
        saveTarget = invulnValue;
        isInvulnFallback = true;
      } else {
        saveTarget = armorTarget;
      }
    } else if (invulnValue != null) {
      saveTarget = invulnValue;
      isInvulnFallback = armorTarget != null;
    } else {
      saveTarget = null;
    }

    const antiX =
      target.profile.T != null
        ? findAntiX(weapon.keywords, target.keywords)
        : null;
    const woundTarget =
      target.profile.T != null
        ? Math.min(
            baseWoundTarget(weapon.strength, target.profile.T),
            antiX?.threshold ?? 6,
          )
        : 6;

    return {
      profileId: weapon.profileId,
      name: weapon.name,
      type: weapon.type,
      subProfile: weapon.subProfile,
      count,
      attacksRaw: weapon.attacks?.raw ?? "—",
      totalAttacks: count * (weapon.attacks?.avg ?? 0),
      hitTarget: weapon.skill,
      woundTarget,
      antiX,
      armorTarget,
      saveTarget,
      isInvulnFallback,
      ap: weapon.ap,
      damage:
        weapon.damage ?? { dice: 0, sides: 0, flat: 0, raw: "—", avg: 0 },
      keywords: weapon.keywords,
    };
  });
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run src/lib/combat.test.ts`
Expected: PASS — 16 tests passed (5 wound + 6 save + 3 Anti-X + 1 auto-hit + 1 live-counts).

- [ ] **Step 5: Run the full unit suite and build**

Run: `npm run test:unit && npm run build`
Expected: both succeed.

---

### Task 3: Result drawer UI + `App` wiring

**Files:**
- Create: `src/components/AttackRow.tsx`
- Create: `src/components/AttackTable.tsx`
- Create: `src/components/ResultDrawer.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AttackRow` type and `computeAttackTable` from `src/lib/combat.ts` (Task 2); `ParsedUnit` from `parseRoster.mjs`; `Side` from `src/components/ArmyPanel.tsx`.
- Produces: `ResultDrawer` (default consumer: `App.tsx`) — nothing later in this plan depends on it further.

No component-level automated tests for this task (per Global Constraints) — verified against the running dev server.

- [ ] **Step 1: `AttackRow`**

Create `src/components/AttackRow.tsx`:

```tsx
import type { AttackRow as AttackRowData } from "../lib/combat";

interface AttackRowProps {
  row: AttackRowData;
  zebra?: boolean;
}

const MINUS = "−";

function formatAp(ap: number): string {
  if (ap === 0) return "0";
  return String(ap).replace("-", MINUS);
}

function formatHit(hitTarget: number | null): string {
  return hitTarget === null ? "auto" : `${hitTarget}+`;
}

function formatSave(row: AttackRowData): string {
  if (row.saveTarget === null) return "no save";
  return `${row.saveTarget}${row.isInvulnFallback ? "++" : "+"}`;
}

function formatSaveDetail(row: AttackRowData): string | null {
  if (row.isInvulnFallback) {
    return row.armorTarget !== null ? `was ${row.armorTarget}+` : null;
  }
  if (row.armorTarget !== null) {
    const sv = row.armorTarget + row.ap;
    return `${sv}+ / AP${formatAp(row.ap)}`;
  }
  return null;
}

export function AttackRow({ row, zebra = false }: AttackRowProps) {
  const saveDetail = formatSaveDetail(row);
  const notes = [
    saveDetail && `Save ${saveDetail}`,
    row.antiX &&
      `Anti-${row.antiX.keyword} ${row.antiX.threshold}+ applied`,
    row.keywords.length > 0 && row.keywords.join(", "),
  ].filter((n): n is string => Boolean(n));

  return (
    <div
      className="px-4 py-1.5"
      style={{ background: zebra ? "var(--paper-sunk)" : undefined }}
    >
      <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem_5rem_6rem_2.5rem] gap-x-2 items-baseline">
        <span className="mono text-[15px]">{row.count}×</span>
        <span>{row.name}</span>
        <span className="mono text-[13px] text-[var(--ink-soft)]">
          {row.totalAttacks} atk
        </span>
        <span className="mono text-[15px]">{formatHit(row.hitTarget)}</span>
        <span className="mono text-[15px]">{row.woundTarget}+</span>
        <span
          className="mono text-[15px]"
          style={{ color: row.isInvulnFallback ? "var(--warn)" : undefined }}
        >
          {formatSave(row)}
        </span>
        <span className="mono text-[15px]">{row.damage.raw}</span>
      </div>
      {notes.length > 0 && (
        <div className="text-[12px] text-[var(--ink-soft)]">
          {notes.join(" · ")}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `AttackTable`**

Create `src/components/AttackTable.tsx`:

```tsx
import type { ParsedUnit } from "../../parseRoster.mjs";
import { computeAttackTable } from "../lib/combat";
import type { Side } from "./ArmyPanel";
import { AttackRow } from "./AttackRow";

interface AttackTableProps {
  attacker: ParsedUnit;
  attackerCounts: Record<string, number>;
  target: ParsedUnit;
  side: Side;
}

const ACCENT: Record<Side, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
};

export function AttackTable({
  attacker,
  attackerCounts,
  target,
  side,
}: AttackTableProps) {
  const rows = computeAttackTable(attacker, attackerCounts, target);

  return (
    <div>
      <div
        className="px-4 py-1 text-[13px] font-semibold"
        style={{ color: ACCENT[side] }}
      >
        {attacker.name} → {target.name}
      </div>
      <div className="px-4 grid grid-cols-[2.5rem_1fr_4rem_4rem_5rem_6rem_2.5rem] gap-x-2 text-[12px] text-[var(--ink-soft)]">
        <span>Ct</span>
        <span>Weapon</span>
        <span>Atk</span>
        <span>Hit</span>
        <span>Wound</span>
        <span>Save</span>
        <span>D</span>
      </div>
      {rows.map((row, i) => (
        <AttackRow key={row.profileId} row={row} zebra={i % 2 === 1} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `ResultDrawer`**

Create `src/components/ResultDrawer.tsx`:

```tsx
import type { ParsedUnit } from "../../parseRoster.mjs";
import { AttackTable } from "./AttackTable";

interface ResultDrawerProps {
  unitA: ParsedUnit | null;
  unitB: ParsedUnit | null;
  counts: Record<string, number>;
}

export function ResultDrawer({ unitA, unitB, counts }: ResultDrawerProps) {
  if (!unitA || !unitB) {
    return (
      <div className="shrink-0 border-t border-[var(--rule)] px-4 py-2 text-[13px] text-[var(--ink-soft)]">
        Select a unit on both sides to see combat results.
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-[var(--rule)] max-h-[40vh] overflow-y-auto">
      <AttackTable
        attacker={unitA}
        attackerCounts={counts}
        target={unitB}
        side="a"
      />
      <div className="border-t border-[var(--rule)]" />
      <AttackTable
        attacker={unitB}
        attackerCounts={counts}
        target={unitA}
        side="b"
      />
    </div>
  );
}
```

- [ ] **Step 4: Wire into `App`**

Edit `src/App.tsx`. Add the import:

```ts
import { ResultDrawer } from "./components/ResultDrawer";
```

Add unit resolution right after the `armyLabel` helper (inside the `App` function body, before the `return`):

```ts
  const armyA = armies.find((a) => a.id === state.selectedArmyId.a) ?? null;
  const armyB = armies.find((a) => a.id === state.selectedArmyId.b) ?? null;
  const unitA =
    armyA?.parsed.units.find((u) => u.id === selectedUnitId.a) ?? null;
  const unitB =
    armyB?.parsed.units.find((u) => u.id === selectedUnitId.b) ?? null;
```

Replace the placeholder drawer div:

```tsx
      <div className="h-0 shrink-0" aria-hidden />
```

with:

```tsx
      <ResultDrawer unitA={unitA} unitB={unitB} counts={state.modelCounts} />
```

- [ ] **Step 5: Typecheck and build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 6: Browser verification**

Run: `npm run dev`, open the app, and confirm all of the following:

1. With no unit selected on either side (or only one side), the drawer shows the plain "Select a unit on both sides..." placeholder.
2. Expand a unit on side A and a unit on side B (e.g. Brotherhood Terminator Squad vs. a Custodes unit). The drawer opens showing two tables: "A's unit → B's unit" in the green accent, "B's unit → A's unit" in the plum accent.
3. Each row shows count, weapon name, total attacks, Hit/Wound/Save target numbers, and Damage — spot-check one row by hand against the plan §5 formulas (e.g. a Storm bolter, S4, against a T4 target: wound target should read `4+`).
4. Find a matchup where the target has a better invuln than modified armor (e.g. attack a unit with a 4++ using an AP-2 weapon against a 3+ save — save should read `4++` in `--warn` color with a "was 6+" note, not silently show `4+` unmarked).
5. Reduce a unit's live model count via `ModelCounter` (from a prior pass), then check the drawer reflects the reduced attack count for that unit as the attacker.
6. No console errors at any point.

Stop the dev server once confirmed.

- [ ] **Step 7: Run the full regression suite**

Run: `npm test && npm run test:unit && npm run lint`
Expected: all three succeed — parser eyeball script runs, all unit tests pass (20 pre-existing + 3 from Task 1 + 16 from Task 2 = 39), lint is clean.
