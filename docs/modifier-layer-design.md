# Modifier Layer — Design

*Companion to `40k-assistant-plan.md` §6 (the modifier layer) and
`combat-calculator-design.md` (the compute core this extends).*

---

## 1. What this solves

The combat calculator shows bare target numbers — no cover, no stratagem
effects, nothing situational. Plan §6's framing: don't model stratagems as
named objects (there are hundreds, they change quarterly); build a small set
of composable primitives instead, and let the player tell the tool which
apply, because the tool has no way to know on its own.

**Scope for this pass**, decided in conversation:

- **±1 to hit**
- **±1 to wound**
- **Invuln override** — a stratagem/ability granting a different invuln
  than the unit's parsed one, for this check
- **AP worsened by 1** (e.g. Armour of Contempt) — a defensive rule that
  blunts incoming AP by 1, floored at 0
- **Half range / Melta** — adds a weapon's `Melta N` bonus to Damage

**Explicitly out of scope**, dropped in conversation:

- **Reroll 1s / reroll all.** These don't change a target number — only
  expected damage, which this app doesn't compute (plan §7 calls it
  optional, and nothing today builds toward it). A reroll toggle would be
  UI with no visible effect. Revisit only alongside expected-damage output.
- **In cover.** The plan itself flags this as the one toggle where a naive
  implementation produces a wrong answer (the AP0 interaction). Deferred
  until the exact current wording is confirmed — not a scope-complexity
  call like the others, a correctness one.

---

## 2. Where modifiers live

**Per attack direction, not global.** The drawer already shows two
independent tables (A→B, B→A) — a stratagem used only when Grey Knights
attack shouldn't leak into the Custodes-attacks-back table. Each
`AttackTable` owns its own modifier state.

**Reset on unit change, not persisted.** Modifiers describe "what's true
for this specific matchup right now," not a standing preference — carrying
stale modifiers into a newly-selected pairing would silently produce a
wrong answer, which is worse than making the player re-flip a toggle.
`ResultDrawer` keys each `AttackTable` on `` `${attacker.id}:${target.id}` ``,
so React remounts it (fresh internal state) whenever either side's
selected unit changes. No new persistence — same "ephemeral, like
`activeSide`" treatment already used for `combatEnabled` and the expanded
unit.

**Two shapes of state**, both local to `AttackTable`:

```ts
interface DirectionModifiers {
  hitMod: -1 | 0 | 1;
  woundMod: -1 | 0 | 1;
  invulnOverride: number | null;  // null = use the target's own invuln
  apWorsened: boolean;
}
```

...plus a separate `meltaActive: Set<string>` (weapon profileIds with the
half-range bonus currently active) — kept apart because it's per-weapon,
not per-table, so it doesn't fit the shape above.

---

## 3. Compute core changes

`computeAttackTable` gains two new optional parameters, defaulting to "no
modifiers" so every existing call site and test keeps working unchanged:

```ts
export function computeAttackTable(
  attacker: ParsedUnit,
  attackerCounts: Record<string, number>,
  target: ParsedUnit,
  modifiers: DirectionModifiers = emptyModifiers(),
  meltaActive: ReadonlySet<string> = new Set(),
): AttackRow[]
```

**Hit target:** unmodified if `null` (auto-hit weapons never gain or lose a
hit roll — Torrent still doesn't roll to hit). Otherwise
`clamp(baseHit - modifiers.hitMod, 2, 6)`. Sign convention: a positive
modifier is a bonus, so it *lowers* the number needed — `hitMod: 1` turns a
`3+` into a `2+`.

**Wound target:** `clamp(min(baseWound, antiXThreshold ?? 6) - modifiers.woundMod, 2, 6)`
— Anti-X keeps applying first, exactly as today; the hit/wound modifier
layers on top of whatever the base calculation already produced.

**Save target:** two independent adjustments feed the existing formula,
neither changing its structure:
- Effective AP: `modifiers.apWorsened ? min(weapon.ap + 1, 0) : weapon.ap`.
  AP is stored as ≤0, so "+1" moves it toward 0 (less penetrating), and the
  `min(..., 0)` floor stops it from ever becoming a bonus.
- Effective invuln: `modifiers.invulnOverride ?? target.invuln?.value ?? null`.
  Everything downstream (compare against armor, take the better one, flag
  `isInvulnFallback`) is unchanged — the override just substitutes what
  "the target's invuln" means for this one check.

**The row's `ap` field reflects the effective AP, not the weapon's raw
stat**, when `apWorsened` is active — same principle as `count` already
being the live (post-casualty) number rather than the roster's static one.
`armorTarget` is computed from the same effective value, so the existing
`formatSaveDetail` UI logic (`sv = armorTarget + ap`) still correctly
recovers the target's unmodified `SV` for display without any change on
the UI side — the "AP worsened by 1" note is what explains *why* the shown
AP differs from the weapon's datasheet value.

**Melta:** if a weapon's `keywords` include a `Melta N` entry (parsed with
the same small-regex approach `Anti-X` already uses) and its `profileId` is
in `meltaActive`, add `N` to both `damage.flat` and `damage.avg`. This is
the one modifier that changes Damage instead of a target number.

**Row-level reasoning notes**, extending the existing "second line under the
row" pattern (`Save 3+ / AP-2`, `Anti-Infantry 2+ applied`): add `Hit ±1
applied`, `Wound ±1 applied`, `AP worsened by 1 (Armour of Contempt)`, and
`Melta 2 applied (half range)` whenever the corresponding modifier is
active for that row — plan §7's "show the reasoning, not just the numbers"
applies exactly as much here as it did to the base calculation.

---

## 4. UI

**`ModifierControls`** — a new compact strip, once per `AttackTable`,
between its header (`attacker → target`) and the column header row. Three
steppers, one toggle, all reusing the same visual language `ModelCounter`
already established (`−  value  +`) rather than introducing a new control
type:

```
Hit    −  0  +      Wound   −  0  +      Invuln   −  None  +      [ ] AP worsened by 1
```

- **Hit / Wound steppers**: clamp to `[-1, 1]` — matches "capped at ±1
  total" from the compute core (plan §5); the player is asserting the *net*
  modifier after any real-game stacking, not building up individual
  sources.
- **Invuln stepper**: cycles `None → 2 → 3 → 4 → 5 → 6 → (clamped)`, `−`
  from `2` goes back to `None`. A plain number input was the other option;
  steppers won this because the app has no numeric-input pattern anywhere
  else, and introducing one for a single control would be a second visual
  language for the same idea `ModelCounter` already solved.
- **AP worsened**: a single toggle button (on = `--ink` text on
  `--paper-sunk` fill, same "selected" treatment as everywhere else — off =
  `--ink-soft`), not a stepper, since it's binary.

**Per-weapon Melta toggle**: lives inline on `AttackRow`, not in
`ModifierControls` — it's a property of one weapon, not the whole table.
Shown only when that row's `keywords` include a `Melta N` entry; every
other row is unaffected and unchanged. Same on/off visual treatment as the
AP-worsened toggle, placed at the end of the row.

---

## 5. Testing

`src/lib/combat.test.ts` gets new cases alongside the existing ones, same
style (hand-computed expected values, real branch coverage):

- Hit modifier: `+1` lowers the target by 1; `-1` raises it; clamps at `2`
  and `6` (a base `2+` with `+1` stays `2+`, not `1+`; a base `6+` with
  `-1` stays `6+`, not `7+`).
- Auto-hit weapons (`skill: null`) are unaffected by `hitMod` — still
  `null` regardless of modifier value.
- Wound modifier: same shape, plus one case combining it with Anti-X to
  confirm they compose (Anti-X sets the base, the modifier adjusts it).
- AP worsened: `AP-2` becomes effectively `AP-1`; `AP0` stays `AP0` (floor,
  never a bonus); combined with an existing invuln-fallback case to confirm
  the fallback logic still triggers correctly off the *effective* AP.
- Invuln override: substitutes the target's parsed invuln entirely,
  including the case where the target has *no* invuln at all (override
  still applies) and the case where the override is worse than armor (no
  fallback flag, same as the existing tie/worse-invuln tests).
- Melta: `Melta 2` keyword + active profileId adds 2 to both `damage.flat`
  and `damage.avg`; inactive or absent keyword leaves damage unchanged.
