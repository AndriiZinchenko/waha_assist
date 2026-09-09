# UI Guide — Army Panel

Implementation spec for the two-army view. Written to be handed to Claude Code.

**Scope of this document:** one `<ArmyPanel>` component, rendered twice (left and
right). No combat calculator yet — but the layout must leave room for it.

**Input:** the object returned by `parseRoster()` (see `parser-summary.md` §4),
sourced from the `armies/` folder via `src/lib/armies.ts` — not a live file
drop. See `army-data-architecture.md` for how armies get discovered and how
selection is persisted.

---

## 1. What this screen is for

Two players are standing at a table mid-game. One of them taps a unit in the left
panel and a unit in the right panel, and wants the attack numbers immediately.

Design consequences that follow from that, and that should override any general
instinct about "clean" UI:

- **Read at arm's length, in bad light.** A phone or tablet propped on a table
  edge, under game-store fluorescents. High contrast, large numerals.
- **Dense beats airy.** A 10-model squad with four loadouts has a lot of rows.
  Scrolling past whitespace to find the psycannon is the failure mode.
- **Tapped with one hand, possibly holding dice.** Touch targets ≥44px.
- **The two panels must never be confused.** Same component, mirrored — so
  identity has to come from color, not layout.
- **Offline.** Game stores have bad signal. No network calls after import.

---

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 18 + TypeScript | fast, no framework overhead needed |
| Styling | Tailwind v4 + CSS custom properties for tokens | tokens keep the palette in one place; Tailwind for layout only |
| State | `useState` / `useReducer` in `App` | **do not add Zustand/Redux.** Two selected unit ids and a count map is all the state there is |
| Icons | none for v1 | text and numbers carry everything; add `lucide-react` only if a real need appears |
| Component lib | none | shadcn/MUI would push this toward a generic card layout — see §8 |

Persist which army is selected per side, plus live model counts, to
`localStorage` via `src/lib/persistence.ts` — never the roster content
itself, which is always cheaply re-derived from the `armies/` folder. See
`army-data-architecture.md` §5.

---

## 3. Design tokens

**Superseded by a full re-skin** — see `design_handoff_battle_assist/README.md`
for the source design spec (dark, tablet-first, OKLCH palette) and
`design_handoff_battle_assist/Waha 40k Assist.dc.html` for the interactive
reference this was built against. The values below are what actually shipped
in `index.css`; treat the handoff as the design *intent*, this as the
*implementation* — they're close but not pixel-identical (the handoff's own
README says to treat it as reference, not something to copy verbatim).

Put these in `index.css` as custom properties and reference them from Tailwind
via `theme()` or arbitrary values. **Do not scatter color literals through
components.**

```css
:root {
  color-scheme: dark;

  /* Ground: near-black cool gray, not pure black — grimdark, not clinical. */
  --paper:      oklch(0.23 0.006 260);  /* page background */
  --panel:      oklch(0.27 0.006 260);  /* card/row background (unselected) */
  --paper-sunk: oklch(0.32 0.02 260);   /* selected/active/highlighted background */
  --inset:      oklch(0.17 0.006 260);  /* deepest recessed bg — stat chips, weapon tables */
  --header-bg:  oklch(0.19 0.006 260);  /* header bar, calculator bar */
  --rule:       oklch(0.34 0.008 260);  /* hairlines */
  --ink:        oklch(0.92 0.004 260);  /* primary text and all numerals */
  --ink-soft:   oklch(0.58 0.01 260);   /* labels, keywords, secondary */

  /* Per-side identity — three shades per side, not one flat color. */
  --side-a:         oklch(0.55 0.1 190);       /* icons/borders/badges */
  --side-a-heading: oklch(0.85 0.08 190);      /* faction names, section headings */
  --side-a-fill:    oklch(0.44 0.11 190);      /* filled buttons (Start Comparison) */
  --side-a-wash:    oklch(0.22 0.02 190 / 0.5);/* panel header / detail-card tint */
  --side-b:         oklch(0.55 0.1 30);
  --side-b-heading: oklch(0.8 0.1 30);
  --side-b-wash:    oklch(0.24 0.06 30 / 0.35);

  --warn:     oklch(0.68 0.16 30);   /* invuln fallback flag, "not applied" notes */
  --boost:    oklch(0.75 0.12 90);   /* half-range-boosted Atk/Damage values */
  --positive: oklch(0.68 0.15 145);  /* "rule applied" notes */
  --negative: oklch(0.68 0.16 30);   /* "rule not applied" notes */
}
```

The panel sets `--accent` / `--accent-heading` / `--accent-wash` to that
side's tokens from its `side` prop (`ArmyPanel.tsx`), and everything inside
reads those three — same "one variable differs" pattern as before, just three
variables now instead of one, matching the handoff's icon/heading/fill
distinction per side.

**Typography — three families now, not two:**

- `Chakra Petch` (weights 500/600/700) — display/headings: faction names,
  army-row titles. The one place this app breaks from IBM Plex.
- `IBM Plex Sans` — body text, unit names, abilities, labels
- `IBM Plex Mono` — every numeral in the statline and weapon table

Mono here is not decoration. The weapon table is a numeric grid where columns
must align across rows of differing digit counts; tabular figures are the reason
the table is scannable. Set `font-variant-numeric: tabular-nums` regardless.

Scale (dense, small steps): 10 / 11 / 12 / 13 / 15 / 18 / 19px. Line-height
1.35 for body, 1.1 for the stat strip. Card corner radius 8–10px, chip/button
radius 6–7px — rounded throughout now, not the old flat/square style.

---

## 4. Layout

**Landscape / desktop (≥900px):** two panels, 50/50, each with a sticky header
and its own scroll container. A hairline in `--rule` between them.

```
┌──────────────────────────────┬──────────────────────────────┐
│▌Grey Knights          2000pt │▌Orks                  2000pt │  ← sticky
│▌Warpbane Task Force          │▌Da Big Hunt                  │    header
├──────────────────────────────┼──────────────────────────────┤
│  Castellan Crowe        1/1  │  Warboss                1/1  │
│  Grand Master Voldus★   1/1  │  Boyz                 20/20  │  ← scrolls
│ ▾Brotherhood Terminators5/5  │  Nobz                  5/5   │    independently
│   ┌────────────────────────┐ │  ...                         │
│   │M 5"  T 5  Sv 2+  4++   │ │                              │
│   │W 3   Ld 6+  OC 2       │ │                              │
│   └────────────────────────┘ │                              │
│   models  −  5  +   of 5     │                              │
│   ── Ranged ───────────────  │                              │
│   4× Storm bolter            │                              │
│      24"  2  3+  4  0  1     │                              │
│      Rapid Fire 2            │                              │
│   ── Melee ────────────────  │                              │
│   5× Nemesis force weapon    │                              │
│      —   4  3+  6  −2  2     │                              │
│  Strike Squad           5/5  │                              │
└──────────────────────────────┴──────────────────────────────┘
                    ▲ 4px accent spine, --side-a / --side-b
```

**Portrait / narrow (<900px):** one panel at a time. A two-segment control pinned
at the top switches armies; each segment carries its side accent so you always
know which army you're looking at. Preserve each panel's scroll position and
expansion state when switching.

Both `ArmyPanel`s stay mounted at all times, in both breakpoints — the
inactive one is hidden with CSS (`display: none` below 900px) by `App`, never
unmounted. This is what makes "preserve scroll position and expansion state"
free: nothing is torn down, so there's nothing to restore. Above 900px both
are always visible regardless of which one is "active."

**The result drawer is opt-in, not automatic.** A slim header bar sits above
`SideSwitcher` (visible at every breakpoint, unlike `SideSwitcher` itself),
holding a single `CombatToggle` button. Off: the drawer renders nothing at
all — no placeholder, no reserved space, both panels get the full height.
On: the existing "select a unit on both sides" hint or the full
`ResultDrawer` shows, exactly as before, gated on `combatEnabled` at the top
of `App`. This replaced an earlier design where the drawer auto-opened
whenever both panels had a selected unit — in practice that meant the drawer
could appear mid-browse whenever you were just looking at two units, not
necessarily checking combat math. `combatEnabled` is plain, un-persisted
state (like `activeSide`) — it resets to off on reload.

---

## 5. Component tree

```
App                                    — owns selection + persistence + mode ("setup" | "panels")
├── header                             — always visible, every breakpoint
│    ├── "Armies" button               (see §6) — switches mode to "setup"
│    └── CombatToggle                  (see §4, §6)
├── mode === "setup":
│    └── ArmySetupScreen               (see §6) — replaces SideSwitcher + both panels entirely
└── mode === "panels":
     ├── SideSwitcher                  (visible only <900px; see §4, §6)
     ├── ArmyPanel  side="a"  ...
     ├── ArmyPanel  side="b"  ...
     │    ├── PanelHeader
     │    └── UnitList
     │         └── UnitRow            (collapsed / expanded)
     │              ├── StatStrip
     │              ├── ModelCounter                    — one accordion block per loadout
     │              │    └── WeaponTable (per loadout)  — that loadout's own weapons, own live count
     │              │         └── WeaponRow
     │              └── UnitInfo                        — abilities/reference text, one accordion, collapsed by default
     └── ResultDrawer     (shown only when combatEnabled; see combat-calculator-design.md)
          └── AttackTable       — one per direction (side A→B, side B→A)
               └── AttackRow
```

```ts
type Side = "a" | "b";

// ArmyPanel only ever renders once an army is guaranteed selected for that
// side (mode === "panels" implies both slots are filled) — no ArmyPicker
// fallback branch inside it any more.
interface ArmyPanelProps {
  side: Side;
  army: ArmyEntry;                  // from src/lib/armies.ts
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string | null) => void;
  counts: Record<string, number>;   // key: `${unitId}:${loadout.key}`, value: live model count for that loadout
  onCountChange: (key: string, next: number) => void;
  hidden: boolean;
}
```

Counts and the selected army id both live in `App`, not in the panel — the
calculator will need them, and lifting later is more work than lifting now.
`App` loads/resolves them from `src/lib/persistence.ts` on mount and saves
on every change. `mode` itself isn't a separate persisted field — it's
derived once at mount from whether both sides already have a valid saved
army (`canStart`, `src/lib/armySetup.ts`), same as before.

---

## 6. Component specs

### CombatToggle

A single ≥44px button in the always-visible header bar, one per app (not
per side — it gates the whole `ResultDrawer`, which already covers both
directions). One glyph, `⚔` — the sole deliberate exception to "no icons"
(§2, §8): every other icon-shaped urge in this app gets satisfied with text
or a symbol already in the design language (`›`, `★`), and this one gets a
real glyph because the user asked for it specifically, not because it's the
default choice. Off state: `--ink-soft` text, no fill. On state: full
`--ink` text on a `--paper-sunk` fill — the same "selected" visual language
`UnitRow` and `ArmySetupScreen` already use, not a new pattern. `aria-pressed`
reflects state for accessibility; no separate on/off icon needed since the
fill communicates it.

### "Armies" header button

Plain-text button (`Armies`, `--ink-soft`), opposite `CombatToggle` in the
same header bar (`justify-between`). Not a toggle — a momentary action that
switches the app into `ArmySetupScreen` and resets `nextSlot` to `a`, so
reopening it always starts by revising Side A first regardless of where you
left off. This is the answer to "how do I change the loaded army" — see
`ArmySetupScreen` below.

### SideSwitcher

Portrait only (<900px), pinned above both panels. Two equal-width tap
segments, each ≥44px tall — side A left, side B right, fixed order (matches
the panels' own left/right identity, never reordered). A segment shows the
loaded army's catalogue name; when that side has no army selected yet, show
a plain placeholder (`"Side A"` / `"Side B"`) instead of leaving it blank.

The active segment gets a 3px accent bar along its bottom edge in that
side's `--accent` — the same visual language as a selected `UnitRow` (§6
`UnitRow`), not a new pattern. The inactive segment is plain text in
`--ink-soft`. Flat fill, no rounded corners, no icons — same rules as
everywhere else (§8).

### PanelHeader

Army name (18px, weight 600), faction and detachment on a second line in
`--ink-soft` (13px), points right-aligned in mono. Sticky. Bottom border in
`--rule`. The 4px accent spine runs down the full left edge of the panel,
header included.

No army-swap button, import button, or overflow menu on the panel itself —
that control lives one level up, in the "Armies" header button (see above),
since changing an army now means leaving the two-panel view entirely (see
`ArmySetupScreen`).

### ArmySetupScreen

Replaces the header's `SideSwitcher` + both `ArmyPanel`s entirely while
active — not a per-panel picker (that was `ArmyPicker`, now removed). Lists
every entry from `armies` (§5's `ArmyEntry[]`), one row each. Each row
mirrors `PanelHeader`'s own typography: catalogue as the primary line (18px,
weight 600), detachment plus the roster's own New Recruit name as a second
line in `--ink-soft` (13px), points right-aligned in mono. No search box
(§8) — the `armies/` folder holds a personal collection, not a catalog.

Tapping a row assigns it to whichever slot `nextSlot` currently points at
(`src/lib/armySetup.ts`), then flips `nextSlot` to the other one — so the
1st tap is always Side A, the 2nd is Side B, and further taps keep
alternating, letting you freely revise either side before starting. An
assigned row gets the same "selected" visual language as `UnitRow`
(`--paper-sunk` background, `inset 3px 0 0 var(--accent)`) plus a small
letter badge (`A`/`B`) in that side's `--accent`, background `--paper` text,
so both sides' current picks are visible at a glance across the whole list.

A `Start` button at the bottom is disabled until both slots are filled
(`canStart()`); tapping it switches back to the two-panel view. The app
boots straight into this screen whenever `localStorage` doesn't already
have a valid army for both sides — no separate empty state to design for.

### UnitRow — collapsed

A single row, 48px tall: unit name left, model count right as `5/5` in mono.
A `★` after the name if `isWarlord`. Warlord marking is the only badge; keyword
chips (Infantry, Character, Psyker) are noise at this level — they belong in the
expanded body.

Selected state: background `--paper-sunk`, and a 3px accent bar on the left edge
of the row. **Not** a border-radius change, not a shadow, not a scale transform.

Casualties: when the live model count is below the roster count, show `3/5` with
the first number in `--warn`. That is the entire casualty indicator.

Expanded: chevron rotates, body slides open. This is user-triggered motion and
is welcome — 150ms, and respect `prefers-reduced-motion`.

**The `.expand-body` CSS trick (`index.css`) requires an unpadded direct
child.** It's a `grid-template-rows: 0fr → 1fr` collapse on the outer
element, with `overflow: hidden; min-height: 0` on its one child to let
that child's *content* shrink to zero. Padding on that same direct child
does **not** shrink with it — `overflow`/`min-height` only suppress
content's minimum size, not a box's own padding — so a padded direct child
leaves a visible sliver at the padding's height even while fully
"collapsed" (caught on `UnitInfo`: `pb-2` directly under `.expand-body`
left an 8px gap with the first line of text peeking through). Every
`.expand-body` needs a bare, unstyled `<div>` as its immediate child, with
any padding pushed one level deeper — `UnitRow`'s own top-level usage and
`ModelCounter`'s per-loadout one already follow this; `UnitInfo` didn't and
was fixed to match.

Only one unit expands per panel at a time. Expanding is the same action as
selecting: tapping a unit both expands it and sets it as this side's chosen
unit for the calculator.

### StatStrip

The six unit characteristics in a bordered strip, mirroring how a datasheet
reads: `M T Sv W Ld OC`. Label above value, value in mono at 22px, label in
`--ink-soft` at 12px sentence case.

If `invuln` is present, append a seventh cell showing `4++`. If
`invuln.conditional` is true (the Armigers' `5+*`), render the value in `--warn`
and make the cell tappable to reveal the ability text explaining the condition —
that condition exists only in prose and the user must be able to see it.

### ModelCounter

**One stepper per loadout, not one per unit.** `parseRoster()` groups a
unit's model children by their *exact wargear signature* — weapons **and**
non-weapon equipment (a Narthecium, a banner) — into
`unit.loadouts: WeaponLoadout[]` — New Recruit's own `group` label is not
the boundary (a named sergeant sharing the rank-and-file's wargear merges
into the same loadout as them; see `parser-summary.md` / the parser change
that added this). A uniform unit has one loadout and renders one stepper; a
unit with wargear options (Purifier Squad: bolter / incinerator / psycannon)
renders one stepper per option, each independently clamped to
`[0, loadout.modelCount]`:

```
Purifiers
  Storm bolter     −  6  +  of 6
  Incinerator      −  2  +  of 2
  Psycannon        −  2  +  of 2
```

Label each stepper with the item name(s) — weapon **or** wargear — that
distinguish it from the unit's *other* loadouts: compute the set of item
names common to every loadout in the unit and exclude those from the label;
fall back to the full item list if that leaves nothing (only possible when
a loadout's items are a strict subset of another's). This is a manual
decision, not a heuristic guess: the player taps the stepper for the model
that actually died, because the tool cannot know which one did.

**Non-weapon wargear matters as much as weapons here.** A Narthecium or a
banner parses as an `Abilities` profile, not a weapon — `collectWeapons`
never sees it. A Terminator Squad's Narthecium-carrying model shares its
only *weapon* (Nemesis force weapon) with the rest of the squad, so a
weapon-only label would fall back to "Nemesis force weapon" — the one thing
every model in the squad has, telling the player nothing. `collectLoadouts`
folds each model's non-weapon `Abilities`-typed items into the loadout's
signature (grouping) and its label (via `WeaponLoadout.wargear: string[]`)
for exactly this reason: `Apothecary's narthecium` is what actually
identifies that model, and needs to say so.

The unit's total live count (shown in the collapsed row as `N/M`, `N` in
`--warn` when below `M`) is the sum of all its loadouts' live counts.

**Each loadout is itself an accordion, expanded by default**, revision from
the original design: the stepper row is the toggle (chevron rotates, same
150ms motion as `UnitRow`'s own expand), and its body holds that specific
loadout's own `WeaponTable` — not a merged whole-unit one. Real usage
surfaced that a single merged table (`9× Purifying Flame`, summed across
every Purifier loadout) hid *which* models actually carry what; showing
each loadout's weapons against its own stepper — "check weapons model by
model" — was worth losing the single merged total for. Expanded by default
because that visibility is the point of this view; collapsing one you don't
care about is the escape hatch, not the default.

### WeaponTable

Takes a plain `weapons: WeaponEntry[]` — already the live-counted list for
whichever loadout is rendering it (`getLoadoutWeapons(unit, loadout,
liveCount)` in `src/lib/loadouts.ts` resolves each loadout weapon reference
against `unit.weapons` for full stats and sets `count` from *that loadout's
own* live model count, not summed across others). `WeaponTable` itself does
no counting — it only merges same-profile rows within the list it's given
(harmless no-op within one loadout, since a single model selection's own
weapons are already unique by profile) and renders.

**Consequence of the per-loadout split:** a weapon shared by every loadout
in a unit (Purifying Flame, on all three Purifier options) now appears
**once per loadout that carries it**, each showing that loadout's own
count — `6×`, `2×`, `2×` in three separate tables — rather than merged into
one `9×` row. Deliberate tradeoff, not a bug: see `ModelCounter` above.

Sort ranged first, then melee. Separate with a hairline rule and a small
sentence-case label (`Ranged` / `Melee`) in `--ink-soft`. Not all caps.

Column order follows the datasheet convention: **count, name, Range, A,
Skill, S, AP, D**. Show a header row (`Ct · Weapon · Range · A · Skill · S ·
AP · D`) once above the table, `--ink-soft`, 12px — real usage showed that
column position alone, without labels, wasn't enough for players to place
A/S/AP/D correctly. One header per `WeaponTable` instance (so per loadout
now, not once per unit), not repeated per Ranged/Melee section within it.

- Skill renders `3+`; when `skill === null` (Torrent) render `auto` in
  `--ink-soft` — not `N/A`, not a dash.
- `A` and `D` show the raw string (`2D6`, `D6+3`), with the average in
  `--ink-soft` at 12px beneath if it differs from the raw value.
- AP shows `−2` with a proper minus sign, and `0` rather than `-0`.
- Keywords go on a second line under the row in `--ink-soft` 12px, comma
  separated. Empty keyword lists render nothing — no placeholder dash.

Sub-profiles (`subProfile: true`) group under one parent name with the two
variants indented beneath it, so the relationship is visible. Do not flatten
them into two unrelated rows. `subProfile` is detected structurally by the
parser — an owning selection with more than one Ranged/Melee profile, e.g.
`Nemesis greatsword - strike`/`- sweep` — not by New Recruit's optional `➤`
naming marker: a Custodes Sentinel Blade carries a melee profile and a
ranged profile with the *exact same bare name* and no `➤` at all, and still
needs the same parent/indent treatment (see `parser-summary.md`).

Zebra the rows with `--paper-sunk` at 50% — the eye tracks across eight numeric
columns and needs the guide.

### UnitInfo

Replaces the old top-level weapon-table slot in the expand body. One
accordion for the whole unit, **collapsed by default** (unlike each
loadout's weapon accordion above) — this is reference text, not the thing
you open a unit to check. Renders every entry in `unit.abilities` — name in
weight 600, text in `--ink-soft` beneath, no truncation, no per-ability
sub-accordion. A real simplification from an earlier draft of this spec
(which wanted each ability individually collapsed to two lines, and
`Damaged: N-M Wounds Remaining` abilities flagged in `--warn` and floated to
the top): current build shows the full list flat. Revisit the flagging if a
damaged-vehicle abilities becomes something players miss in practice.

**No stratagems here or anywhere** — the roster export never contains them
(plan §8, `parser-summary.md`); this section can only ever show what
`parseRoster()` already captures as `Abilities` profiles (Invulnerable
Save, Leader, faction/detachment rules text, and similar).

---

## 7. Empty and error states

**No army selected:** the panel body shows `ArmyPicker` (§6) — every army
discovered in `armies/`. Both panels show this independently; one army
loaded and one empty is a normal state.

**`armies/` is empty:** `ArmyPicker` states that plainly — "No armies found.
Add a New Recruit JSON export to the `armies/` folder." Not a blank list.

**A file in `armies/` fails to parse:** it's excluded from the picker
entirely rather than shown as a per-panel error state — `src/lib/armies.ts`
skips it and logs why to the console. See `army-data-architecture.md`.

**A loadout has no weapons** (rare — a pure wargear difference like Vexilla
with no dedicated weapon of its own): its `WeaponTable` renders nothing,
same principle as before — no "no weapons found" message, just an absent
Ranged/Melee section. The stepper and its accordion still exist; there's
just nothing under it.

---

## 8. Do not

These are the defaults that will show up if this spec is followed loosely, and
each one actively hurts this screen:

- **Rounded cards with soft shadows around every unit.** The unit list is a list.
  Cards add ~16px of chrome per row and push the psycannon below the fold.
- **All-caps labels** anywhere. Sentence case throughout.
- **Icons next to stat labels.** `T` is already the shortest possible label and
  every player reads it instantly. A shield glyph next to `Sv` is decoration.
- **A gradient anywhere.** Flat fills only.
- **Hover animations on rows, fade-in-up on mount, staggered list entrances.**
  Motion is reserved for expand/collapse, which is the only thing that changes
  shape in response to a tap.
- **Faction color theming pulled from the roster.** Tempting, but two Imperium
  armies would render nearly identically and the panels must stay
  distinguishable. Side accent is fixed. Revisit only after the calculator ships.
- **A search box.** A 2000pt list is 8–14 units. Scrolling is faster than typing.
- **Sticky expanded unit headers, breadcrumbs, or a minimap.** The list is short.

---

## 9. Build order

1. Static `ArmyPanel` rendering armies from `src/lib/armies.ts` (§1), collapsed
   rows only, `ArmyPicker` for the empty state.
2. Expansion + `StatStrip` + `WeaponTable` with the profileId merge.
3. Selection state lifted to `App`, both panels wired.
4. `ModelCounter` — one stepper per `unit.loadouts` entry, with `WeaponTable`
   counts derived from live loadout counts (§6 `ModelCounter`/`WeaponTable`).
5. ~~File import (drop zone → `parseRoster` → panel)~~ — superseded: armies
   are discovered from the `armies/` folder instead (see
   `army-data-architecture.md`).
6. Responsive: portrait segmented control — done: `SideSwitcher` (§6), both
   `ArmyPanel`s stay mounted and are CSS-hidden rather than unmounted, so
   scroll position and expansion state survive switching (§4).
7. ~~`localStorage` persistence~~ — done: `src/lib/persistence.ts` (see
   `army-data-architecture.md` §5).

Check step 2 against the **Purifier Squad** in the sample Grey Knights list — ten
models across four loadout groups, with a weapon name that collides with a
different profile elsewhere in the army. If that unit renders correctly, the
table logic is right.
