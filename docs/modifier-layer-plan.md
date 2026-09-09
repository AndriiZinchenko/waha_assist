# Modifier Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player apply ±1 hit/wound, an invuln override, "AP worsened by 1" (Armour of Contempt), and per-weapon Melta to either direction of the combat calculator.

**Architecture:** `computeAttackTable` gains two optional parameters (`modifiers`, `meltaActive`) that adjust the same hit/wound/save/damage fields it already computes — no new compute path, no change to any existing call site's behavior when omitted. `AttackTable` owns the modifier state for its own direction (a new `ModifierControls` strip plus per-row Melta toggles in `AttackRow`); `ResultDrawer` keys each `AttackTable` so switching either selected unit resets both directions' modifiers, rather than carrying stale state into a new matchup.

**Tech Stack:** Existing Vite + React + TypeScript + Vitest. No new dependencies.

**Spec:** [docs/modifier-layer-design.md](modifier-layer-design.md)

## Global Constraints

- Five modifiers only: ±1 hit, ±1 wound, invuln override, AP worsened by 1, Melta. Cover and reroll toggles are explicitly out of scope for this plan (spec §1).
- Hit/wound modifiers clamp to `[-1, 1]` on input and the resulting target always clamps to `[2, 6]` on output. A positive modifier *lowers* the target number (it's a bonus).
- AP worsened: `effectiveAp = min(weapon.ap + 1, 0)` — never becomes a bonus (floored at 0).
- Invuln override fully substitutes `target.invuln?.value` in the save calculation; everything downstream (fallback comparison, `isInvulnFallback` flagging) is otherwise unchanged.
- The row's displayed `ap` field is the *effective* AP (post-modifier), not the weapon's raw stat — `armorTarget` is derived from the same effective value, so existing UI code that recovers the unmodified `SV` via `armorTarget + ap` needs no change.
- Melta only applies when the weapon's `keywords` contain a `Melta N` entry AND its `profileId` is in the active set; it adds `N` to both `damage.flat` and `damage.avg`.
- Modifier state is per attack-direction, un-persisted, and resets whenever either selected unit changes (spec §2) — never carries into a new matchup.
- No new dependencies. Reuse the existing stepper visual language (`ModelCounter`'s `− value +`) rather than introducing a new control type.
- This project has no git repository. Skip every commit step below — each task's completion is verified by its tests and `npm run build`/`npm run lint` passing, plus a live browser check for the UI task.

---

### Task 1: Compute core — modifiers and Melta (`src/lib/combat.ts`)

**Files:**
- Modify: `src/lib/combat.ts`
- Modify: `src/lib/combat.test.ts` (add cases; existing cases must keep passing unchanged)

**Interfaces:**
- Consumes: nothing new — same `ParsedUnit`/`WeaponEntry` types already in use.
- Produces: `interface DirectionModifiers { hitMod: -1|0|1; woundMod: -1|0|1; invulnOverride: number|null; apWorsened: boolean }`, `emptyModifiers(): DirectionModifiers`, and an extended `AttackRow` with four new fields: `appliedHitMod: number`, `appliedWoundMod: number`, `apWorsened: boolean`, `meltaAvailable: number | null`, `meltaBonus: number | null`. `computeAttackTable`'s signature becomes `(attacker, attackerCounts, target, modifiers = emptyModifiers(), meltaActive: ReadonlySet<string> = new Set())` — the two new parameters are optional, so Task 2 and every existing test call it exactly as before unless they want modifiers.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/combat.test.ts` (the existing `makeWeapon`/`makeUnit`/`makeAttacker` helpers and all existing `describe` blocks stay as-is; add these new ones and the two new imports):

```ts
import {
  computeAttackTable,
  emptyModifiers,
  type DirectionModifiers,
} from "./combat";
```

```ts
function modifiers(overrides: Partial<DirectionModifiers> = {}): DirectionModifiers {
  return { ...emptyModifiers(), ...overrides };
}

describe("computeAttackTable — hit/wound modifiers", () => {
  it("a +1 hit modifier lowers the target by 1", () => {
    const [row] = computeAttackTable(
      makeAttacker(), // skill: 3 by default
      {},
      makeUnit(),
      modifiers({ hitMod: 1 }),
    );
    expect(row.hitTarget).toBe(2);
    expect(row.appliedHitMod).toBe(1);
  });

  it("a -1 hit modifier raises the target by 1", () => {
    const [row] = computeAttackTable(
      makeAttacker(),
      {},
      makeUnit(),
      modifiers({ hitMod: -1 }),
    );
    expect(row.hitTarget).toBe(4);
  });

  it("hit target clamps at 2 and 6", () => {
    const better = computeAttackTable(
      makeAttacker({ skillRaw: "2+", skill: 2 }),
      {},
      makeUnit(),
      modifiers({ hitMod: 1 }),
    );
    expect(better[0].hitTarget).toBe(2);

    const worse = computeAttackTable(
      makeAttacker({ skillRaw: "6+", skill: 6 }),
      {},
      makeUnit(),
      modifiers({ hitMod: -1 }),
    );
    expect(worse[0].hitTarget).toBe(6);
  });

  it("auto-hit weapons (skill: null) are unaffected by hitMod", () => {
    const attacker = makeAttacker({ skill: null, skillRaw: "N/A" });
    const [row] = computeAttackTable(attacker, {}, makeUnit(), modifiers({ hitMod: 1 }));
    expect(row.hitTarget).toBe(null);
    expect(row.appliedHitMod).toBe(0);
  });

  it("wound modifier composes with Anti-X", () => {
    const attacker = makeAttacker({ strength: 3, keywords: ["Anti-Infantry 3+"] });
    const target = makeUnit({ keywords: ["Infantry"] });
    const [row] = computeAttackTable(attacker, {}, target, modifiers({ woundMod: 1 }));
    // base wound 5+ (S3 vs T4), Anti-Infantry 3+ -> min(5,3)=3, then -1 for the +1 modifier -> 2
    expect(row.woundTarget).toBe(2);
    expect(row.appliedWoundMod).toBe(1);
  });

  it("wound target clamps at 6", () => {
    const target = makeUnit({ profile: { M: '6"', T: 8, SV: 3, W: 2, LD: "6+", OC: 1 } });
    const [row] = computeAttackTable(
      makeAttacker({ strength: 3 }),
      {},
      target,
      modifiers({ woundMod: -1 }),
    );
    expect(row.woundTarget).toBe(6);
  });
});

describe("computeAttackTable — AP worsened by 1", () => {
  it("worsens AP-2 to effectively AP-1", () => {
    const [row] = computeAttackTable(
      makeAttacker({ ap: -2 }),
      {},
      makeUnit(),
      modifiers({ apWorsened: true }),
    );
    expect(row.ap).toBe(-1);
    expect(row.saveTarget).toBe(4); // SV3 - AP-1 = 4+
    expect(row.apWorsened).toBe(true);
  });

  it("never turns AP0 into a bonus", () => {
    const [row] = computeAttackTable(
      makeAttacker({ ap: 0 }),
      {},
      makeUnit(),
      modifiers({ apWorsened: true }),
    );
    expect(row.ap).toBe(0);
    expect(row.saveTarget).toBe(3);
  });

  it("combines with invuln fallback using the effective AP", () => {
    const target = makeUnit({ invuln: { value: 4, conditional: false } });
    const [row] = computeAttackTable(
      makeAttacker({ ap: -3 }),
      {},
      target,
      modifiers({ apWorsened: true }),
    );
    // effective AP -2, armor = 3 - (-2) = 5, invuln 4 is better -> fallback
    expect(row.ap).toBe(-2);
    expect(row.saveTarget).toBe(4);
    expect(row.isInvulnFallback).toBe(true);
  });
});

describe("computeAttackTable — invuln override", () => {
  it("substitutes the target's parsed invuln entirely", () => {
    const target = makeUnit({ invuln: { value: 5, conditional: false } });
    const [row] = computeAttackTable(
      makeAttacker({ ap: -2 }),
      {},
      target,
      modifiers({ invulnOverride: 3 }),
    );
    // armor = 3 - (-2) = 5, override 3 is better -> fallback to 3, flagged
    expect(row.saveTarget).toBe(3);
    expect(row.isInvulnFallback).toBe(true);
  });

  it("applies even when the target has no invuln at all", () => {
    const [row] = computeAttackTable(
      makeAttacker({ ap: -2 }),
      {},
      makeUnit({ invuln: null }),
      modifiers({ invulnOverride: 4 }),
    );
    // armor = 3 - (-2) = 5, override 4 is better -> fallback to 4
    expect(row.saveTarget).toBe(4);
    expect(row.isInvulnFallback).toBe(true);
  });

  it("does not flag a fallback when the override is worse than armor", () => {
    const [row] = computeAttackTable(
      makeAttacker({ ap: 0 }),
      {},
      makeUnit(),
      modifiers({ invulnOverride: 5 }),
    );
    // armor = 3 - 0 = 3, override 5 is worse -> stays on armor
    expect(row.saveTarget).toBe(3);
    expect(row.isInvulnFallback).toBe(false);
  });
});

describe("computeAttackTable — Melta", () => {
  it("adds the Melta value to damage when active", () => {
    const attacker = makeAttacker({
      keywords: ["Melta 2"],
      damage: { dice: 1, sides: 6, flat: 0, raw: "D6", avg: 3.5 },
    });
    const weaponId = attacker.weapons[0].profileId;
    const [row] = computeAttackTable(
      attacker,
      {},
      makeUnit(),
      emptyModifiers(),
      new Set([weaponId]),
    );
    expect(row.meltaAvailable).toBe(2);
    expect(row.meltaBonus).toBe(2);
    expect(row.damage.flat).toBe(2);
    expect(row.damage.avg).toBe(5.5);
  });

  it("leaves damage unchanged when Melta is available but not active", () => {
    const attacker = makeAttacker({ keywords: ["Melta 2"] });
    const [row] = computeAttackTable(attacker, {}, makeUnit(), emptyModifiers(), new Set());
    expect(row.meltaAvailable).toBe(2);
    expect(row.meltaBonus).toBe(null);
    expect(row.damage.flat).toBe(1); // makeWeapon's default damage.flat
  });

  it("reports no Melta available for a weapon without the keyword", () => {
    const attacker = makeAttacker();
    const [row] = computeAttackTable(attacker, {}, makeUnit(), emptyModifiers(), new Set(["anything"]));
    expect(row.meltaAvailable).toBe(null);
    expect(row.meltaBonus).toBe(null);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run src/lib/combat.test.ts`
Expected: FAIL — `emptyModifiers`/`DirectionModifiers` don't exist yet, and `computeAttackTable` doesn't accept the new parameters.

- [ ] **Step 3: Implement**

Replace the contents of `src/lib/combat.ts`:

```ts
import type { DiceExpr, ParsedUnit } from "../../parseRoster.mjs";
import { getLiveWeaponCount } from "./loadouts";
import { mergeByProfileId } from "./weapons";

export interface DirectionModifiers {
  hitMod: -1 | 0 | 1;
  woundMod: -1 | 0 | 1;
  invulnOverride: number | null;
  apWorsened: boolean;
}

export function emptyModifiers(): DirectionModifiers {
  return { hitMod: 0, woundMod: 0, invulnOverride: null, apWorsened: false };
}

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
  appliedHitMod: number;
  appliedWoundMod: number;
  apWorsened: boolean;
  meltaAvailable: number | null;
  meltaBonus: number | null;
}

function baseWoundTarget(strength: number, toughness: number): number {
  if (strength >= 2 * toughness) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (2 * strength <= toughness) return 6;
  return 5;
}

function clampTarget(value: number): number {
  return Math.min(6, Math.max(2, value));
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

const MELTA_PATTERN = /^Melta (\d+)$/;

function findMeltaValue(weaponKeywords: string[]): number | null {
  for (const kw of weaponKeywords) {
    const match = MELTA_PATTERN.exec(kw);
    if (match) return Number(match[1]);
  }
  return null;
}

export function computeAttackTable(
  attacker: ParsedUnit,
  attackerCounts: Record<string, number>,
  target: ParsedUnit,
  modifiers: DirectionModifiers = emptyModifiers(),
  meltaActive: ReadonlySet<string> = new Set(),
): AttackRow[] {
  const merged = mergeByProfileId(attacker.weapons);

  return merged.map((weapon) => {
    const count = getLiveWeaponCount(
      attackerCounts,
      attacker.id,
      attacker,
      weapon.profileId,
    );

    const effectiveAp = modifiers.apWorsened
      ? Math.min(weapon.ap + 1, 0)
      : weapon.ap;

    const sv = target.profile.SV;
    const armorTarget = sv != null ? sv - effectiveAp : null;
    const invulnValue = modifiers.invulnOverride ?? target.invuln?.value ?? null;

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
    const baseWound =
      target.profile.T != null
        ? Math.min(
            baseWoundTarget(weapon.strength, target.profile.T),
            antiX?.threshold ?? 6,
          )
        : 6;
    const woundTarget = clampTarget(baseWound - modifiers.woundMod);

    const hitTarget =
      weapon.skill === null ? null : clampTarget(weapon.skill - modifiers.hitMod);

    const meltaAvailable = findMeltaValue(weapon.keywords);
    const meltaBonus =
      meltaAvailable != null && meltaActive.has(weapon.profileId)
        ? meltaAvailable
        : null;
    const baseDamage =
      weapon.damage ?? { dice: 0, sides: 0, flat: 0, raw: "—", avg: 0 };
    const damage =
      meltaBonus != null
        ? {
            ...baseDamage,
            flat: baseDamage.flat + meltaBonus,
            avg: baseDamage.avg != null ? baseDamage.avg + meltaBonus : baseDamage.avg,
          }
        : baseDamage;

    return {
      profileId: weapon.profileId,
      name: weapon.name,
      type: weapon.type,
      subProfile: weapon.subProfile,
      count,
      attacksRaw: weapon.attacks?.raw ?? "—",
      totalAttacks: count * (weapon.attacks?.avg ?? 0),
      hitTarget,
      woundTarget,
      antiX,
      armorTarget,
      saveTarget,
      isInvulnFallback,
      ap: effectiveAp,
      damage,
      keywords: weapon.keywords,
      appliedHitMod: weapon.skill === null ? 0 : modifiers.hitMod,
      appliedWoundMod: modifiers.woundMod,
      apWorsened: modifiers.apWorsened,
      meltaAvailable,
      meltaBonus,
    };
  });
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run src/lib/combat.test.ts`
Expected: PASS — 31 tests passed (16 existing + 15 new: 6 hit/wound + 3 AP-worsened + 3 invuln-override + 3 Melta).

- [ ] **Step 5: Run the full unit suite and build**

Run: `npm run test:unit && npm run build`
Expected: both succeed and cleanly — the new `computeAttackTable` parameters are optional and the new `AttackRow` fields are additive, so `AttackTable.tsx`/`AttackRow.tsx` (unchanged until Task 2) keep compiling exactly as before.

---

### Task 2: UI — `ModifierControls`, per-row Melta toggle, and reset-on-change

**Files:**
- Create: `src/components/ModifierControls.tsx`
- Modify: `src/components/AttackRow.tsx`
- Modify: `src/components/AttackTable.tsx`
- Modify: `src/components/ResultDrawer.tsx`

**Interfaces:**
- Consumes: `DirectionModifiers`, `emptyModifiers`, the extended `AttackRow` type, and `computeAttackTable`'s new parameters, all from Task 1.
- Produces: nothing further downstream — this is the top of the tree for this feature.

No component-level automated tests (per Global Constraints) — verified against the running dev server.

- [ ] **Step 1: `ModifierControls`**

Create `src/components/ModifierControls.tsx`:

```tsx
import type { DirectionModifiers } from "../lib/combat";

interface ModifierControlsProps {
  modifiers: DirectionModifiers;
  onChange: (next: DirectionModifiers) => void;
}

function formatMod(mod: number): string {
  return mod > 0 ? `+${mod}` : String(mod);
}

function StepperControl({
  label,
  display,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
}: {
  label: string;
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled: boolean;
  incrementDisabled: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <button
        type="button"
        disabled={decrementDisabled}
        onClick={onDecrement}
        className="w-[24px] h-[24px] border border-[var(--rule)] disabled:opacity-40"
      >
        −
      </button>
      <span className="mono inline-block w-[2.5em] text-center">{display}</span>
      <button
        type="button"
        disabled={incrementDisabled}
        onClick={onIncrement}
        className="w-[24px] h-[24px] border border-[var(--rule)] disabled:opacity-40"
      >
        +
      </button>
    </span>
  );
}

export function ModifierControls({ modifiers, onChange }: ModifierControlsProps) {
  return (
    <div className="px-4 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
      <StepperControl
        label="Hit"
        display={formatMod(modifiers.hitMod)}
        decrementDisabled={modifiers.hitMod <= -1}
        incrementDisabled={modifiers.hitMod >= 1}
        onDecrement={() =>
          onChange({ ...modifiers, hitMod: (modifiers.hitMod - 1) as -1 | 0 | 1 })
        }
        onIncrement={() =>
          onChange({ ...modifiers, hitMod: (modifiers.hitMod + 1) as -1 | 0 | 1 })
        }
      />
      <StepperControl
        label="Wound"
        display={formatMod(modifiers.woundMod)}
        decrementDisabled={modifiers.woundMod <= -1}
        incrementDisabled={modifiers.woundMod >= 1}
        onDecrement={() =>
          onChange({ ...modifiers, woundMod: (modifiers.woundMod - 1) as -1 | 0 | 1 })
        }
        onIncrement={() =>
          onChange({ ...modifiers, woundMod: (modifiers.woundMod + 1) as -1 | 0 | 1 })
        }
      />
      <StepperControl
        label="Invuln"
        display={
          modifiers.invulnOverride === null ? "None" : `${modifiers.invulnOverride}+`
        }
        decrementDisabled={modifiers.invulnOverride === null}
        incrementDisabled={modifiers.invulnOverride === 6}
        onDecrement={() =>
          onChange({
            ...modifiers,
            invulnOverride:
              modifiers.invulnOverride === null || modifiers.invulnOverride <= 2
                ? null
                : modifiers.invulnOverride - 1,
          })
        }
        onIncrement={() =>
          onChange({
            ...modifiers,
            invulnOverride:
              modifiers.invulnOverride === null
                ? 2
                : Math.min(6, modifiers.invulnOverride + 1),
          })
        }
      />
      <button
        type="button"
        onClick={() => onChange({ ...modifiers, apWorsened: !modifiers.apWorsened })}
        className="px-2 py-1 border border-[var(--rule)]"
        style={{
          color: modifiers.apWorsened ? undefined : "var(--ink-soft)",
          background: modifiers.apWorsened ? "var(--paper-sunk)" : undefined,
        }}
      >
        AP worsened by 1
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Per-row Melta toggle and modifier notes in `AttackRow`**

Replace the contents of `src/components/AttackRow.tsx`:

```tsx
import type { AttackRow as AttackRowData } from "../lib/combat";

interface AttackRowProps {
  row: AttackRowData;
  zebra?: boolean;
  meltaActive: boolean;
  onToggleMelta: () => void;
}

const MINUS = "−";

function formatAp(ap: number): string {
  if (ap === 0) return "0";
  return String(ap).replace("-", MINUS);
}

function formatMod(mod: number): string {
  return mod > 0 ? `+${mod}` : String(mod);
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

export function AttackRow({
  row,
  zebra = false,
  meltaActive,
  onToggleMelta,
}: AttackRowProps) {
  const saveDetail = formatSaveDetail(row);
  const notes = [
    saveDetail && `Save ${saveDetail}`,
    row.antiX && `Anti-${row.antiX.keyword} ${row.antiX.threshold}+ applied`,
    row.appliedHitMod !== 0 && `Hit ${formatMod(row.appliedHitMod)} applied`,
    row.appliedWoundMod !== 0 && `Wound ${formatMod(row.appliedWoundMod)} applied`,
    row.apWorsened && "AP worsened by 1 (Armour of Contempt)",
    row.meltaBonus != null && `Melta ${row.meltaBonus} applied (half range)`,
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
      {row.meltaAvailable != null && (
        <button
          type="button"
          onClick={onToggleMelta}
          className="mt-0.5 px-2 py-0.5 text-[12px] border border-[var(--rule)]"
          style={{
            color: meltaActive ? undefined : "var(--ink-soft)",
            background: meltaActive ? "var(--paper-sunk)" : undefined,
          }}
        >
          Melta {row.meltaAvailable} (half range)
        </button>
      )}
      {notes.length > 0 && (
        <div className="text-[12px] text-[var(--ink-soft)]">
          {notes.join(" · ")}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire state into `AttackTable`**

Replace the contents of `src/components/AttackTable.tsx`:

```tsx
import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import {
  computeAttackTable,
  emptyModifiers,
  type DirectionModifiers,
} from "../lib/combat";
import type { Side } from "./ArmyPanel";
import { AttackRow } from "./AttackRow";
import { ModifierControls } from "./ModifierControls";

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
  const [modifiers, setModifiers] = useState<DirectionModifiers>(emptyModifiers());
  const [meltaActive, setMeltaActive] = useState<Set<string>>(new Set());

  const rows = computeAttackTable(
    attacker,
    attackerCounts,
    target,
    modifiers,
    meltaActive,
  );

  function toggleMelta(profileId: string) {
    setMeltaActive((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  }

  return (
    <div>
      <div
        className="px-4 py-1 text-[13px] font-semibold"
        style={{ color: ACCENT[side] }}
      >
        {attacker.name} → {target.name}
      </div>
      <ModifierControls modifiers={modifiers} onChange={setModifiers} />
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
        <AttackRow
          key={row.profileId}
          row={row}
          zebra={i % 2 === 1}
          meltaActive={meltaActive.has(row.profileId)}
          onToggleMelta={() => toggleMelta(row.profileId)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Reset modifiers when either selected unit changes**

Edit `src/components/ResultDrawer.tsx`. Replace:

```tsx
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
```

with:

```tsx
      <AttackTable
        key={`${unitA.id}:${unitB.id}`}
        attacker={unitA}
        attackerCounts={counts}
        target={unitB}
        side="a"
      />
      <div className="border-t border-[var(--rule)]" />
      <AttackTable
        key={`${unitB.id}:${unitA.id}`}
        attacker={unitB}
        attackerCounts={counts}
        target={unitA}
        side="b"
      />
```

(Both keys include both unit ids, so changing *either* side's selection remounts *both* tables — matching the spec's "resets whenever either side's selected unit changes," not just the table whose own attacker changed.)

- [ ] **Step 5: Typecheck and build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 6: Browser verification**

Run: `npm run dev`, open the app, turn on the combat calculator (header toggle), select a unit on both sides, and confirm all of the following:

1. Each `AttackTable` shows the new `ModifierControls` strip (Hit/Wound/Invuln steppers + AP-worsened toggle) between its header and the column header row.
2. Step Hit to `+1`: every row's Hit target drops by 1 (clamped at `2+`), and each row gains a `Hit +1 applied` note.
3. Step Wound to `-1`: every row's Wound target rises by 1 (clamped at `6+`), with a `Wound -1 applied` note.
4. Toggle "AP worsened by 1" on: every row's AP display and Save target shift accordingly (an `AP-2` weapon now behaves like `AP-1`), with an `AP worsened by 1 (Armour of Contempt)` note; find a case where this flips a save into invuln-fallback territory and confirm the `--warn` coloring still triggers correctly off the *effective* AP.
5. Step Invuln to e.g. `4+`: every row's Save reflects that invuln where it's better than armor (flagged `++`), even for a target with no invuln of its own.
6. Find a weapon with a `Melta N` keyword (e.g. Armiger Helverin's Meltagun) — confirm a "Melta N (half range)" button appears only on that row, and toggling it adds N to the Damage column with a matching note.
7. Change which unit is selected on either side — confirm all modifiers and Melta toggles reset to default on *both* directions, not just the one that changed.
8. No console errors at any point.

Stop the dev server once confirmed.

- [ ] **Step 7: Run the full regression suite**

Run: `npm test && npm run test:unit && npm run lint`
Expected: all three succeed — parser eyeball script runs, all unit tests pass (42 pre-existing + 15 from Task 1 = 57), lint is clean.
