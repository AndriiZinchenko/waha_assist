# Combat Calculator — Design

*Companion to `40k-assistant-plan.md` §5–7 (the compute core, modifier layer,
and output format this implements a first slice of) and `ui-guide.md` (the
result drawer this fills in).*

---

## 1. What this solves

The plan's own framing: two players tap an attacking unit and a target unit,
and immediately see every weapon profile with hit / wound / save numbers
already worked out. Everything built so far (parser, panels, expansion,
model counter, responsive layout) exists to get two `ParsedUnit`s in front
of the player — this is the step that actually answers "what happens if I
shoot this at that."

**Scope for this pass** (plan's own build order separates these; this
follows it):

- The bare deterministic compute core (§5): hit / wound / save target
  numbers, no modifiers.
- Two "basic" keywords that cleanly become a target-number change without
  modeling dice outcomes: **Anti-X N+** (overrides the wound target) and
  **Torrent** (auto-hit — already free, since a `null` skill already means
  "auto" throughout the app).

**Explicitly out of scope**, deferred to the modifier layer (§6):

- Cover, ±1 hit/wound toggles, AP-worsening, invuln override — none of
  these exist yet; that's the next slice, with its own toggle UI.
- Reroll mechanics (reroll 1s / reroll all), including **Twin-linked**,
  which is just a named instance of the general reroll toggle.
- **Sustained Hits N, Lethal Hits, Devastating Wounds, Blast** — these
  change dice *outcomes* (extra hits, skipped rolls, bypassed saves,
  target-size-dependent attack counts), not target numbers. They stay as
  plain keyword text on the row, exactly as `WeaponTable` already shows
  them today. Computing their effect belongs with the rest of the modifier
  layer, not bolted onto the core.
- Expected/average damage output. Plan §7 calls this optional; target
  numbers are the primary information and this pass only does that.

---

## 2. Compute core

New module: `src/lib/combat.ts`. Pure functions, no React, no I/O — the
same shape of module as `src/lib/loadouts.ts`.

### Hit target

```
hitTarget = weapon.skill        // already 2–6, or null
```

`null` means auto-hit (Torrent, or any weapon New Recruit exports with
`BS: "N/A"`). Displayed as `auto`, matching `WeaponRow`'s existing
convention. No modifiers this pass, so this is a direct pass-through — the
function exists so the modifier layer has one place to extend later.

### Wound target

The S-vs-T table from plan §5, verbatim:

```ts
function baseWoundTarget(strength: number, toughness: number): number {
  if (strength >= 2 * toughness) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (2 * strength <= toughness) return 6;
  return 5;
}
```

Always resolves to 2–6 — there is no "impossible to wound" case, unlike
saves.

**Anti-X N+:** if the weapon has a keyword matching `Anti-<Keyword> <N>+`
(e.g. `Anti-Infantry 2+`) and the target unit's `keywords` array contains
`<Keyword>`, the wound target becomes `min(baseWoundTarget, N)` — Anti-X
guarantees a wound on N+ or better, it never makes a roll *worse*. Parse
the keyword with the same regex style `parseInvuln` already uses in
`parseRoster.mjs` (a small, self-contained pattern match), not a general
keyword-effects engine.

### Save target

```
armorTarget  = target.profile.SV - weapon.ap      // ap is already negative or 0
saveTarget   = target.invuln
             ? Math.min(armorTarget, target.invuln.value)
             : armorTarget
isInvulnFallback = target.invuln != null && target.invuln.value < armorTarget
```

- If `saveTarget > 6` and there's no invuln, the save is **impossible** —
  display "no save", not a nonsense "7+".
- If an invuln exists, `saveTarget` is always ≤ the invuln value, so it's
  never displayed as impossible when one is present.
- `isInvulnFallback` is the single most commonly missed thing at the table
  per the plan — it needs to be visually distinct in the UI (§4 below), not
  just correct in the data.

### Row assembly

```ts
export interface AttackRow {
  profileId: string;
  name: string;
  type: "ranged" | "melee";
  subProfile: boolean;
  count: number;                 // live weapon count (post-casualties)
  attacksRaw: string;             // "2", "2D6", etc. — as authored
  totalAttacks: number;           // count * attacks.avg, for display
  hitTarget: number | null;       // null = auto
  woundTarget: number;
  antiX: { keyword: string; threshold: number } | null;
  saveTarget: number | null;      // null = no save possible
  isInvulnFallback: boolean;
  ap: number;
  damage: DiceExpr;
  keywords: string[];
}

export function computeAttackTable(
  attacker: ParsedUnit,
  attackerCounts: Record<string, number>,
  target: ParsedUnit,
): AttackRow[]
```

`computeAttackTable` merges the attacker's weapons by `profileId` (reusing
the shared merge described in §3), resolves each merged row's live count
via `getLiveWeaponCount` (already built for `ModelCounter`/`WeaponTable`),
and computes hit/wound/save against the target's `profile`/`invuln`/
`keywords`. Sub-profile grouping (Nemesis greatsword strike/sweep) carries
through the same way it does in `WeaponTable`, so the two views stay
consistent.

---

## 3. Shared weapon-merge extraction

`WeaponTable.tsx` already implements profileId-merge and sub-profile
grouping locally. The calculator needs the identical merge (not the
grouping/rendering — that stays presentation-only in `WeaponTable`). Rather
than duplicate the merge algorithm:

- New `src/lib/weapons.ts` exporting `mergeByProfileId(weapons: WeaponEntry[])`.
- `WeaponTable.tsx` imports it instead of its local copy — no behavior
  change, verified by the existing manual browser check plus a new unit
  test on the extracted function.
- `combat.ts` imports the same function.

Sub-profile *grouping* (the parent-name/indent logic) stays in
`WeaponTable.tsx` — it's a rendering concern, and it exists there to show
the relationship between variants that share one weapon slot. The drawer
doesn't replicate it: `AttackTable` renders one flat row per merged weapon,
strike and sweep included as ordinary sibling rows. Two full attack tables
side by side is already dense; the parent/indent treatment is worth the
extra chrome in a single-unit weapon list, not here. `AttackRow` still
carries `subProfile: true` in case a future pass wants it back.

---

## 4. Result drawer

Replaces the placeholder `<div className="h-0 shrink-0" aria-hidden />`
already reserved in `App.tsx` (added specifically so this wouldn't be a
layout rewrite).

**Component tree:**

```
App
└── ResultDrawer         unitA, unitB, counts
     ├── AttackTable      attacker=unitA, target=unitB, side="a"
     └── AttackTable      attacker=unitB, target=unitA, side="b"
          └── AttackRow
```

`App` resolves the actual `ParsedUnit` objects (not just ids) for both
sides — `selectedArmyId` + `selectedUnitId` → `ParsedUnit | null` — and
passes them down. This is new: today `App` only threads ids through to
`ArmyPanel`, which does its own resolution internally.

**Open/closed state:** the drawer renders its full content only when both
`unitA` and `unitB` are non-null; otherwise a slim placeholder bar ("Select
a unit on both sides to see combat results" or similar, sentence case, no
exclamation). No scroll-position/expansion-state concern here like the
panels had — the drawer's content is fully determined by the two selected
units, so a plain conditional render is enough; no CSS-hide-don't-unmount
trick needed.

**Row format**, per plan §7's example almost verbatim:

```
4× Bolt rifle        8 attacks   Hit 3+   Wound 5+   Save 4+ (3+ / AP-1)   D1
```

- `attacksRaw`/count feed a `4×` prefix same as `WeaponRow`; `totalAttacks`
  renders as `N attacks` (integer when `attacks.dice === 0`, otherwise
  shown with the existing "avg" convention from `WeaponRow`).
- Hit/Wound/Save read directly off `AttackRow`. `auto` and "no save" use
  the same soft-ink treatment `WeaponRow` already uses for `auto` skills.
- The save cell shows the *reasoning*, not just the number: `4+ (3+ / AP-1)`
  — unmodified save and AP in parens, same spirit as plan §7's example.
- **Invuln fallback is not a footnote.** When `isInvulnFallback` is true,
  render the save cell in `--warn` (the same token used for casualty counts
  and the conditional-invuln flag in `StatStrip`) with a `++` suffix
  instead of `+`, e.g. `4++ (was 6+)` — consistent with how `StatStrip`
  already marks a conditional invuln, so a player who's seen that screen
  recognizes the pattern here.
- Anti-X override, when applied, shows a small `--ink-soft` note under the
  row: `Anti-Infantry 2+ applied` — same "second line under the row"
  pattern `WeaponTable` uses for keywords.

**Side identity:** each `AttackTable` heading uses the attacking side's
`--accent`, matching the panels — "Grey Knights → Adeptus Custodes" reads
in green, the reverse table in plum, so which direction you're looking at
is never ambiguous.

---

## 5. Testing

`src/lib/combat.test.ts`, following the project's established pattern
(pure functions, real assertions, no component-test infra):

- **Wound table**, one case per branch: `S≥2T`, `S>T`, `S=T`, `2S≤T`, the
  `else` (5+) case.
- **Save target**: plain armor save; AP worsening it; invuln better than
  armor (fallback flagged); invuln present but *worse* than armor (not
  used, no fallback flag); no invuln and target exceeds 6 (impossible).
- **Anti-X**: overrides a worse wound target; does *not* override an
  already-better one (`min` behavior in both directions); does not apply
  when the target lacks the keyword.
- **Torrent** (`skill: null`): hit target is `null`/auto, wound/save
  computed normally.
- **Live counts**: a weapon row's `count`/`totalAttacks` reflects a
  casualty-reduced loadout, not the full roster count — reuses the same
  `ModelCounter` scenario already covered in `loadouts.test.ts` (Purifier
  Squad), confirming the calculator sees what the panel shows.

No new dependencies — this is the same Vitest setup already in place.
