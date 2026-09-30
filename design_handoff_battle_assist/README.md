# Handoff: WAHA — 40K Battle Assist UI Redesign

> **Superseded.** The app now uses the Dataslate design: see
> `docs/dataslate-migration.md` and `design/dataslate/`. This folder is kept for
> history only.

## Overview
A visual redesign of the army-list, army-detail, and battle-comparison/calculator screens for a Warhammer 40k army-building/battle-assist web app. Goal: replace the flat, beige, "generic form" look of the current app with a darker, higher-contrast, tablet-first UI, while preserving the existing information architecture and interaction model (pick two armies → compare rosters side by side → expand units → run combat math).

## About the Design Files
The file in this bundle (`Waha 40k Assist.dc.html`) is a **design reference** built as a single self-contained HTML/JS prototype (a custom "Design Component" runtime, not React). It is **not meant to be copied into your React app as-is** — treat it as a high-fidelity visual and interaction spec. Your task is to recreate this UI using your existing React app's component structure, state management, and libraries.

You can open the file directly in a browser to interact with it (click through Armies → Compare, expand units, toggle the calculator controls) — that's the fastest way to understand the intended behavior.

## Fidelity
**High-fidelity.** Colors, spacing, typography, and copy in the file are final-intent (not placeholder), except for the sample army/unit data, which is illustrative — wire it up to your real data model.

## Design Tokens

**Typography**
- Display/headers: `Chakra Petch` (weights 500/600/700), Google Font
- Body/UI text: `IBM Plex Sans` (400/500/600), Google Font
- Numeric/tabular data (stats, points, dice values): `IBM Plex Mono` (500/600), Google Font — used anywhere a number needs to align in a column or read as "data"

**Color palette** (OKLCH; hex equivalents given for convenience — regenerate exactly from OKLCH if your tooling supports it, hex is an approximation)
- Page background: `oklch(0.23 0.006 260)` (~`#33353c`, near-black cool gray, NOT pure black)
- Header / calculator bar background: `oklch(0.19 0.006 260)` (~`#292a30`)
- Card/panel background (army rows, weapon rows): `oklch(0.27 0.006 260)` (~`#3d3f47`)
- Deepest inset panels (stat chips, expanded unit card background): `oklch(0.17–0.2 0.006–0.02 260)`
- Primary text: `oklch(0.92 0.004 260)` (near-white, cool)
- Secondary/muted text: `oklch(0.55–0.62 0.01 260)` (mid gray)
- Borders/dividers: `oklch(0.32–0.36 0.008 260)`
- **Accent A (Side A / "friendly")**: teal-cyan, hue 190 — e.g. `oklch(0.55 0.1 190)` for icons/borders, `oklch(0.85 0.08 190)` for headings, `oklch(0.44 0.11 190)` for filled buttons
- **Accent B (Side B / "enemy")**: warm amber-red, hue 30 — e.g. `oklch(0.55 0.1 30)` for icons/borders, `oklch(0.8 0.1 30)` for headings
- **Success/positive note** (e.g. "Anti-Infantry applied"): green, hue 145 — `oklch(0.68 0.15 145)`
- **Warning/unresolved note** (e.g. "conditional invuln not applied"): amber-red, hue 30 — `oklch(0.68 0.16 30)`
- **Expected damage highlight**: warm yellow, hue 90 — `oklch(0.75 0.12 90)`

Do not use pure white or pure black anywhere; every "white" and "black" in this design is a subtly cool-toned near-white/near-black to keep the grimdark, non-clinical feel.

**Spacing / radius**
- Card corner radius: 8–10px
- Chip/button radius: 6–7px
- Stat-chip radius: 7px
- Touch targets: minimum 44px height on all interactive controls (tabs, list rows, steppers, chips) — this is a **tablet-first** app, so err generous on hit areas over desktop-dense sizing
- Max content width: 1440px, centered, so it doesn't stretch awkwardly on large displays

## Screens / Views

### 1. Armies (roster picker)
- **Purpose**: user selects which army is Side A and which is Side B before comparing.
- **Layout**: single centered column, max-width ~920px. Helper line ("Pick an army for Side A, then an army for Side B."), then one row per saved army, then a full-width "Start Comparison" button pinned at the bottom of the list.
- **Army row**: card with a 4px colored left edge (empty/transparent when unpicked, teal when assigned to Side A, amber when assigned to Side B). Row content: faction name + detachment name (large, Chakra Petch) on one line, a secondary label line below (list nickname), and on the right a small "A"/"B" badge chip (only rendered once picked) plus the points total in monospace. Tapping a row cycles it into Side A, then Side B, then removes it; tapping an already-assigned slot again clears it.
- **Start button**: disabled/muted until both sides are picked; becomes solid teal and clickable once both are set. Navigates to the Compare screen.

### 2. Compare (side-by-side roster + calculator)
- **Layout**: two-pane roster comparison filling the viewport height, with a persistent calculator bar docked to the bottom (its own scroll region, max ~46vh so it never eats the whole screen).
- **Pane header** (one per side): faction name (colored by side-accent) + detachment label, points total on the right. Side A pane has a subtle teal-tinted header background; Side B a subtle amber-tinted one — this is the primary way users tell sides apart at a glance, reinforced by accent color throughout.
- **Unit row** (list item inside each pane): chevron + unit name (+ "★" suffix if it's the Warlord) + alive/total count in monospace on the right. Tapping the row expands/collapses its detail card in place (accordion, not a modal/drawer).
- **Unit detail card** (shown when a unit row is expanded): rounded panel, tinted with the side's accent (very low-opacity background + accent left border), containing three stacked sections:
  1. **Stat block**: 6-column grid of stat chips (M, T, Sv, W, Ld, Invuln) — big monospace number, small caption label underneath each.
  2. **Models**: one row per wargear loadout the unit has. Each loadout row shows a chevron, the loadout's display name (e.g. "Combi-bolter + Power Fist"), a **−/count/+ stepper** for how many models currently carry that loadout, and "of N" (max models with that loadout). Tapping the loadout's chevron expands a nested weapon-profile table for just that loadout: columns **Ct (count) / Weapon / Range / A / Skill / S / AP / D**, grouped under "Ranged" and "Melee" sub-headers (only shown if that unit has weapons of that type), with a muted keyword caption line under each weapon row (e.g. "Ignores Cover, Torrent").
  3. **Info**: plain-text rules/ability description for the unit, separated by a top divider.
- **Calculator bar** (bottom, spans both panes): 
  - Row of controls: Ranged/Melee segmented toggle, Hit modifier stepper, Wound modifier stepper, Invuln override stepper (cycles None → 6+ → 5+ → 4+ → 3+ → 2+, used to manually assert a conditional/aura invulnerable save applies), "AP worsened by 1" toggle chip, "Half range (Melta/Rapid Fire)" toggle chip, and a "Clear" button (resets all calculator modifiers) pinned to the right.
  - Below that: a two-column results grid. Left column = the currently-expanded Side A unit attacking the currently-expanded Side B unit; right column = the reverse. Each column header shows "{Attacker} → {Defender}" with attacker/defender names colored by their side.
  - Within each column, **one block per weapon** the attacking unit currently carries (not just one weapon — every gun/melee weapon across all its loadouts, scaled by however many models are assigned to that loadout). Each block has: a header line "{count}× {weapon name}", a 5-column stat strip (Atk / Hit / Wound / Save / Dmg) with the computed target numbers and the expected-damage figure highlighted in warm yellow, and a caption line below reading "Save {defender armor}+ / AP{weapon AP} · {keyword list} · {any contextual notes}". Contextual notes are colored: **green** when a beneficial rule was actually applied given current state (e.g. "Anti-Infantry 4+ applied"), **amber/red** when a rule exists but hasn't been resolved yet (e.g. "Target has a conditional 5+ invuln, not applied — set Invuln override if it applies here").

## Interactions & Behavior
- All expand/collapse is a simple boolean toggle per item (unit expanded, loadout expanded) — accordion style, multiple can be open at once, no exclusivity required.
- Picking armies: tap-to-cycle behavior described above (empty → A → B → empty, or direct removal if already assigned).
- Stepper buttons (model counts, hit/wound/invuln modifiers) clamp to sensible bounds (model counts 0..max; hit/wound modifiers −2..+2; invuln cycles through a fixed step list).
- The calculator recomputes live from: the two currently-expanded units (one per side), the weapon loadout counts, and the modifier controls. There is no "calculate" button — every control change updates the results grid immediately.
- No animations beyond a simple chevron rotation (90°, ~150ms) on expand/collapse — keep it snappy, this is a reference tool used mid-game.

## State Management
Suggested state shape (adapt to your store of choice):
```
{
  screen: 'armies' | 'compare',
  sideAArmyId, sideBArmyId,
  openUnitIdBySide: { A: unitId | null, B: unitId | null },   // which unit card is expanded per side
  loadoutOpenState: { [unitId+loadoutId]: boolean },
  loadoutModelCounts: { [unitId+loadoutId]: number },
  calculator: { mode: 'ranged'|'melee', hitMod, woundMod, invulnOverride, apWorsened, halfRange }
}
```
Derive the calculator's two result columns from `openUnitIdBySide` — look up each side's currently-expanded unit, flatten its weapons across loadouts (respecting each loadout's current model count), and run the to-hit/to-wound/to-save math against the other side's currently-expanded unit's stat block.

## Data Model Notes
Each **army** has: id, faction name, detachment name, list nickname, points total, and a list of **units**.
Each **unit** has: name, warlord flag, model count/alive count, whether it counts as Infantry (affects Anti-Infantry rules), an optional conditional-invuln value (for auras that only apply situationally), a 6-stat block (M/T/Sv/W/Ld/Invuln), one or more **loadouts**, and a rules/info text blurb.
Each **loadout** has: a display name, current/max model count, and a list of **weapon profiles**, each with: name, mode (Ranged/Melee), range, attacks, skill (hit threshold), Strength, AP, Damage, keyword list, and optional special flags (e.g. `antiInfantry: 4` to auto-apply an Anti-Infantry X+ rule against Infantry targets).

## Assets
No images/icons — this design uses only typography, color, and simple Unicode glyphs (›, ★, ×, −, +). No external icon set is required.

## Files
- `Waha 40k Assist.dc.html` — the full interactive reference (open directly in a browser).
