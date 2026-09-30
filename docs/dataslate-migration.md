# Dataslate re-skin — migration guide

Implementation guide for moving the live app (`src/`) to the **Dataslate** design.
Written to be handed to Claude Code. Supersedes `design_handoff_battle_assist/` and §3 of `ui-guide.md`.

**References (in `design/dataslate/`):**
- `Combat Assistant.dc.html` — system sheet + all phone/tablet artboards and states.
- `Battle Prototype.dc.html` — working battle screen on real `Chaos.json` / `Orks.json`; the behavioural reference.
- `Datasheet.dc.html`, `Calculator.dc.html`, `AppHeader.dc.html` — isolated component references.

Open them in a browser for visuals; **copy values from this doc**, not from the HTML (the references use inline styles).

**Scope:** visual layer + a few layout changes. No change to `parseRoster.mjs`, `src/lib/*` logic, persistence, sync server or i18n keys beyond the new strings in §9.

---

## 1. What changes, in one screen

| Area | Today | Dataslate |
|---|---|---|
| Ground | cool grey, hue 260 | neutral graphite, chroma 0 |
| Side A | teal | **crimson + square mark ■**, always left |
| Side B | amber/orange | **cyan + diamond mark ◆**, always right |
| Negative tone | red-orange (= side B hue) | **amber** — never a side hue |
| Display / labels | Chakra Petch | Fira Sans Extra Condensed |
| Body / rows | IBM Plex Sans | Fira Sans Condensed |
| Rules prose | IBM Plex Sans | Source Serif 4 |
| Numbers | IBM Plex Mono | JetBrains Mono |
| Phone weapon table | 8 columns squeezed | name line + 6-column stat grid under one shared header |
| Phone header | all toggles inline | back · sync · mic · calc · **overflow (⋯)** holding EN/UA + Wake |
| Primary action | rounded button | chamfered block (clip-path) |

Side identity is now **colour + shape + position**. Every place that shows a side must show all three where space allows (a mark next to the name, never colour alone).

---

## 2. Tokens — replace `:root` in `src/index.css`

Keep the variable *names* the app already uses where the role matches, so most components update for free. New names are marked `NEW`.

```css
:root {
  color-scheme: dark;

  /* Ground — neutral graphite, zero chroma */
  --inset:      oklch(0.19 0 0);     /* page behind frames, gutters between tablet panels */
  --paper:      oklch(0.255 0 0);    /* screen background, unit list */
  --panel:      oklch(0.29 0 0);     /* open datasheet body, calculator, sheets */
  --paper-sunk: oklch(0.335 0 0);    /* open row, loadout row, stat/result cell, stratagem card */
  --raised:     oklch(0.39 0 0);     /* NEW weapon keyword chip bg, card border */
  --disabled-bg:oklch(0.275 0 0);    /* NEW stepper button at bound */
  --header-bg:  oklch(0.255 0 0);    /* header = paper; separated by --rule */
  --rule-soft:  oklch(0.37 0 0);     /* NEW row dividers */
  --rule:       oklch(0.44 0 0);     /* control borders, section dividers */

  /* Ink */
  --ink:        oklch(0.98 0 0);     /* primary text, all numerals */
  --ink-2:      oklch(0.88 0 0);     /* NEW secondary text, hints, unselected segment */
  --ink-soft:   oklch(0.78 0 0);     /* captions, stat labels, "of N" */
  --ink-prose:  oklch(0.93 0 0);     /* NEW rules paragraphs (serif) */
  --ink-off:    oklch(0.55 0 0);     /* NEW disabled glyphs, leader connector lines */

  /* Sides — three shades each */
  --side-a:        oklch(0.66 0.20 22);   /* crimson: marks, rails, names in results */
  --side-a-fill:   oklch(0.34 0.09 22);   /* selected row / switcher / panel header wash */
  --side-a-on:     oklch(0.16 0.03 22);   /* text on solid --side-a */
  --side-b:        oklch(0.82 0.12 210);  /* cyan */
  --side-b-fill:   oklch(0.35 0.06 215);
  --side-b-on:     oklch(0.16 0.03 215);

  /* Tones — never reuse a side hue */
  --positive:      oklch(0.84 0.15 150);  /* boosted cells, applied rules, synced */
  --positive-fill: oklch(0.36 0.06 150);
  --negative:      oklch(0.83 0.14 78);   /* amber: penalised cells, warnings, conflict */
  --negative-fill: oklch(0.37 0.06 78);
  --boost:         var(--positive);       /* leader-boosted values use the positive family */
  --warn:          var(--negative);

  /* Selected control = inverted: bg --ink, text --paper */
  --selected-bg:   var(--ink);
  --selected-fg:   var(--paper);
  --checked-wash:  oklch(0.40 0 0);       /* NEW background of an ON checkbox-toggle */

  /* Type */
  --font-display: "Fira Sans Extra Condensed", "Fira Sans Condensed", system-ui, sans-serif;
  --font-sans:    "Fira Sans Condensed", system-ui, sans-serif;
  --font-prose:   "Source Serif 4", Georgia, serif;           /* NEW */
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  /* Shape */
  --r-tag: 2px; --r-chip: 3px; --r-control: 4px; --r-sheet: 12px;
  --chamfer: polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);
  --mark-a: inset(0);                                          /* square */
  --mark-b: polygon(50% 0,100% 50%,50% 100%,0 50%);            /* diamond */
}
```

**Remove:** `--accent-heading`, `--side-a-heading`, `--side-b-heading`, `--side-*-wash`, `--meta`. Headings are plain `--ink`; the side is carried by the mark and rail. Where `--meta` was used for neutral metadata, use `--ink-2`.

**`--accent` family:** keep the pattern where `ArmyPanel` overrides `--accent` / `--accent-fill` with its side's values; set the root values to `--ink` so anything outside a panel (calculator) is neutral.

### Fonts

Replace the Google Fonts link in `index.html` with:

```html
<link href="https://fonts.googleapis.com/css2?family=Fira+Sans+Condensed:wght@400;500;600;700&family=Fira+Sans+Extra+Condensed:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
```

All four have Cyrillic. **Offline-first:** self-host them (e.g. `@fontsource/fira-sans-condensed`, `@fontsource/fira-sans-extra-condensed`, `@fontsource/jetbrains-mono`, `@fontsource/source-serif-4`) and add the woff2 files to the PWA precache — the Google link is only for development.

Keep `font-variant-numeric: tabular-nums` on `body`.

---

## 3. Type scale

| Role | Font | Weight / size / line | Tracking | Used for |
|---|---|---|---|---|
| Display | display | 800 / 26 / 1.05, UPPERCASE | 0.01em | sheet titles (detachment name) |
| Title | display | 700 / 21 / 1.15 | 0 | army name in panel/config header |
| Row | sans | 600 / 17–18 / 1.2 (700 when open) | 0 | unit, loadout, weapon names |
| Section label | display | 800 / 15, UPPERCASE | 0.14em | RANGED, INFO, STRATAGEMS |
| Caption label | display | 700 / 11–12, UPPERCASE | 0.12–0.14em | stat captions, KEYWORDS, SIDE A |
| Hint | sans | 500 / 15 / 1.4, `--ink-2` | 0 | screen hints |
| Prose | prose | 400 / 15 / 1.45, `--ink-prose` | 0 | ability, rule, stratagem body |
| Stat | mono | 700 / 26 / 1 | −0.03em | stat line |
| Result | mono | 700 / 21 / 1 | −0.03em | calculator cells |
| Data | mono | 600 / 16–18 | 0 | weapon values, counts, points |

`InlineMarkup.tsx`: `^^Keyword^^` → `font-variant-caps: all-small-caps; font-weight: 600; letter-spacing: .04em`. `**x**` → weight 700. Everything inside prose uses `--font-prose`.

Add `text-wrap: pretty` to prose and hints.

---

## 4. Spacing, sizing, radius

- Spacing steps: **4 · 8 · 12 · 14 · 16 · 24**. Row inset = 14px; screen margin = 16px; control gap = 8px; chip gap = 6px.
- Touch targets: every control ≥ 44px. Row min-heights: unit row 54, loadout row 56, section header 48, detachment row 56.
- Weapon keyword chips are 32px tall for density — **wrap them in a 44px hit area** (`padding-block` on a transparent parent or `::before` inset −6px) when implementing.
- Radius: tags 2, chips/cells 3, controls 4, bottom sheets 12 (top corners only). Primary Start button uses `clip-path: var(--chamfer)`, no radius.

---

## 5. Component mapping

For each existing component: what to change. Values are tokens from §2.

### Global

**`App.tsx` header** (+ `SyncStatus`, `LangToggle`, `WakeLockToggle`, `VoiceToggle`, `CombatToggle`)
- 52px tall, `--paper` bg, 1px `--rule` bottom border. Icon buttons 44×44, radius 4.
- **Phone (<900px):** back · sync dot · spacer · mic · calc · ⋯. `LangToggle` and `WakeLockToggle` move into an overflow popover (260px, `--paper-sunk`, 1px `--rule`, 52px rows). New tiny component `HeaderOverflow.tsx`.
- **Tablet:** everything inline; sync dot gets its text label beside it.
- Toggle ON state for mic/calc = inverted (`--selected-bg` / `--selected-fg`).
- Army-list screen (no back): wordmark "COMBAT ASSISTANT" display 800/17 + "40K" mono 700/12 `--ink-soft`, `white-space: nowrap`.

**`SyncStatus.tsx`** — 11px dot, shape encodes state so it survives colour-blindness:
| State | Shape |
|---|---|
| synced | filled circle `--positive` |
| pending | circle, 2px `--ink` border, left half filled `--ink` |
| offline | circle, 2px **dashed** `--ink-soft` border, empty |
| conflict | **triangle** (`clip-path: polygon(50% 0,100% 100%,0 100%)`) `--negative` |

### Screen 1 — `ArmySetupScreen.tsx`
- Row: 76px min, padding 8/10/8/16, top border `--rule-soft`. Faction display 700/18; detachment sans 500/14 `--ink-2`; points mono 600/14 `--ink-soft`.
- Assigned row: bg `--side-X-fill`; A gets `box-shadow: inset 4px 0 0 var(--side-a)`, B gets `inset -4px 0 0 var(--side-b)` (rail on its own side).
- A|B picker: two 44×44 cells in a bordered group. Unselected A = 24px outlined **square** with "A"; unselected B = 22px outlined **diamond** (rotated 45°) with "B". Selected = cell filled `--side-X`, letter in `--side-X-on`.
- Footer (sticky, `--panel`): "■ Chaos Space Marines vs ◆ Orks" line (each ellipsised, in side colour) + Start (52px, chamfer, display 800/19 tracking .16em). Disabled: bg `--paper-sunk`, text `--ink-off`, with hint "Assign an army to ◆ B to start."

### Screen 2 — `ArmyConfigScreen.tsx`
- Header block: "■ SIDE A" caption in side colour, army title, then a 3-way segmented control (UNITS · LEADERS · DETACHMENT, 44px, equal widths). Top inset rail 3px `--side-X`.
- **`UnitVisibilityPanel`**: points total mono 700/28 + "/ 3000pts" mono 500/18 `--ink-soft`, 6px bar below (`--paper-sunk` track, `--ink-2` fill). Row = chevron · name · pts (mono) · toggle (80×44). Visible toggle: solid `--ink-2` border, green dot, "VISIBLE". Hidden: **dashed** `--ink-off` border, no dot, "HIDDEN", and row name `--ink-soft` + line-through.
- **`LeaderAssignmentScreen`**: one card per leader (`--panel`, radius 4), name display 700/18, status right. Chips 44px, radius 4; selected = inverted with "✓ ". Exactly one selected.
- **`DetachmentPanel`**: rows 56px, Select control 92×44; selected = inverted "✓ SELECTED"; roster's own detachment gets caption "ROSTER DETACHMENT". Expanded body `--panel`, indent 36px: rule (prose) then compact stratagem rows (name uppercase display 700/16, type line, CP badge).

### Screen 3 — battle

**`SideSwitcher.tsx`** (phone only) — 56px, two equal halves. A: mark · label/name left-aligned. B: mirrored (`flex-direction: row-reverse`, right-aligned). Active half: bg `--side-X-fill`, `inset 0 -3px 0 --side-X`. Label "SIDE A" / "SIDE A · 1 OPEN" caption in side colour; army short name (last segment after " - ") ellipsised.

**`PanelHeader.tsx`** — title (full catalogue name, wraps), below it detachment link (sans 600/15 `--ink-2`, dotted underline, " ›", 40px hit) and points (mono). Tablet: bg `--side-X-fill`, `inset 0 3px 0 --side-X`, mark at the outer edge (A left, B right).

**`UnitList` / `UnitRow`**
- 54px, 1px `--rule-soft` bottom. Chevron ▸/▾ 12px `--ink-soft`. Name row type. Count mono 600/16: live in `--ink` (**`--negative` when live < total**), "/total" `--ink-soft`. Destroyed (0 live): row opacity .45 + name line-through.
- Warlord " ★" in side colour.
- Allied tag: display 700/10, tracking .12em, 1px `--ink-off` border, radius 2, `--ink-2` text.
- **Leader nesting:** leader rows first, bodyguard below with left padding 40px and an L-connector: 1.5px `--ink-off` vertical from top to middle at x=20, horizontal 11px at middle.
- Open row: bg `--paper-sunk`, weight 700, `inset 3px 0 0 --side-X` rail (A and B both rail left on phone; on tablet B's datasheet body may rail right).
- Voice mode: 30×30 number badge after the chevron, 1.5px `--side-X` border, mono 700/15 in side colour.

### Unit datasheet (`UnitDetails`, `StatStrip`, `ModelCounter`, `WeaponTable`, `WeaponRow`, `UnitInfo`, `UnitRules`, `UnitStratagems`)
Body bg `--panel`, left rail `inset 3px 0 0 --side-X`.

1. **`StatStrip`**: 6 equal columns, 1px `--rule-soft` dividers; value = Stat type, caption below 7px gap. Invuln line below: "4++" mono 700/20 + "INVULN" caption + conditional note `--ink-soft`.
2. **Keywords**: caption "KEYWORDS", chips 36px `--paper-sunk` radius 3. Keywords with a glossary entry: 1px `--rule` border + dotted underline. Open chip = inverted; its definition renders in a box directly below the chip row (`--paper-sunk`, 1px `--rule`, radius 4, name caption + prose). Faction chip last: dashed border, display caps.
3. **`ModelCounter`** (battle only): row 56px, chevron + loadout label + gear line (13px `--ink-soft`). Stepper group 44px tall: `−` 44 · count 38 · `+` 44, 1px `--rule` borders, radius 4. Count `--negative` when below max. **At bound:** button bg `--disabled-bg`, glyph `--ink-off`, not clickable. "of N" mono 500/13 `--ink-soft`. Open loadout row bg `--paper-sunk`; its weapon table sits on `--paper-sunk` directly underneath.
4. **`WeaponTable` / `WeaponRow`** — the main layout change:
   - **Phone (<900px):** group label (RANGED/MELEE) then **one** shared header grid `repeat(6, minmax(0,1fr))`: RNG · A · BS|WS · S · AP · D. Each weapon = line 1 "1× Name" (mono count `--ink-soft` + sans 600/17), line 2 the six values on the same grid (mono 600/18), line 3 keyword chips (wrap). No count column; the count is inline with the name.
   - **Tablet:** single row grid `minmax(0,1fr) repeat(6, 50px)`, name cell first; chips below, indented 25px.
   - AP shown as "0" or "−N" (U+2212). Melee range "—". Torrent skill "auto".
   - Weapon keyword chip: 32px, `--raised` bg, display 600/13 tracking .08em; dotted underline if it has a rule; open = inverted and rule text box renders under that weapon.
   - **Leader-boosted values:** value in `--positive` with 2px underline; source pill after the keywords: radius 15, `--positive-fill` bg, `--positive` text, "▲ Might is Right". Tappable → opens the source ability.
5–7. **Collapsible sections** (INFO · RULES · STRATAGEMS): 48px header, top border `--rule`; label section type, count mono 13 `--ink-soft`, 28×28 bordered `+`/`−` at the right. Keep the existing `.expand-body` animation.
   - Info/Rules items: name sans 600/17, optional source caption (FACTION/CORE) `--ink-soft`, prose paragraphs 6px apart.
   - Stratagem card: margin 0 10 10, `--paper-sunk`, 1px `--raised` border, radius 4, padding 11/12/12. Name display 700/18 uppercase; type line sans 600/13 `--ink-2`; CP badge right (1px `--ink` border, radius 3, mono 700/18 + "CP" caption). Body: each labelled paragraph "WHEN:", "TARGET:", "EFFECT:", "RESTRICTIONS:" — label display 700/12 tracking .12em `--ink`, text prose. `WHEN:` is built from the stratagem's `phase`. Groups captioned "DETACHMENT · PACTBOUND ZEALOTS" and "CORE".

### Combat calculator (`ResultDrawer`, `ModifierControls`, `AttackTable`, `AttackRow`)
- Docked at the bottom, **never above 58% of the battle area on phone, 46% on tablet**; the unit lists stay scrollable above. Bg `--panel`, 2px `--ink` top border, shadow `0 -12px 30px rgb(0 0 0 / .45)`, 36×4 grab handle.
- **Controls** (one `flex-wrap` row, gap 8): Ranged|Melee segmented (74px halves) · Hit / Wound / Invuln steppers (`flex: 1 1 130px`; caption inside the value cell above the value) · two checkbox-toggles (`flex: 1 1 150px`, `nowrap`; ON = `--ink` border, `--checked-wash` bg, filled box with ✓) · ✕ 44×44. Values "±0", "+1", "−2"; invuln "None", "6++"…"2++". Bounds use the disabled stepper style.
- **Direction header:** "■ Attacker → ◆ Defender", each name in its side colour with its mark; arrow mono `--ink-soft`. Phone: directions stacked; tablet: 2 columns.
- **Weapon block:** "1× Bolt pistol (12")" then 5 result cells in `repeat(5, minmax(0,1fr))`, gap 3, 52px tall, radius 3: caption on top (ATK · HIT · WOUND · SAVE · D), value = Result type.
   - neutral: `--paper-sunk` / `--ink` / caption `--ink-soft`
   - boosted: `--positive-fill` / `--positive` / caption `--positive`
   - penalised: `--negative-fill` / `--negative` / caption `--negative`
   - Save shows "3+", "4++" (invuln used) or "none".
- **Note lines** under the cells, sans 500/14: 12px mono glyph column then text. neutral "·" `--ink-2`; positive "+" `--positive`; negative "!" `--negative`. Always include the neutral "S4 vs T6 · Save 2+ / AP0" line. Melta/Rapid Fire weapons with Half range off get a neutral hint to turn it on.
- Empty: centred "Select a unit on both sides to see combat results." sans 500/16 `--ink-2`, 28px padding.

### Voice (`VoiceCommander`)
Banner under the header, 48px, `--paper-sunk`, 1px `--rule` bottom. Dot 10px `--ink` with 4px 18% ring (keep `.voice-dot` pulse). Feedback replaces the text for 2.5s: success/undone on `--positive-fill` + `--positive`; "Nothing to undo" neutral `--ink-2`; error on `--negative-fill` + `--negative`. After a command, scroll both panels so the opened rows are at the top.

### Sheets and dialogs
- **`DetachmentModal`** → bottom sheet: top at 150px (phone) / 80px (tablet), max-width 720 centred, `--panel`, 3px `--side-X` top border, radius 12 top. Header: "■ DETACHMENT · SIDE A" caption, name Display type, faction line, ✕ 44×44. Body: RULES caption → rules (prose); STRATAGEMS · N caption → stratagem cards (as §5.7). Scrim `rgb(0 0 0 / .55)`, tap to close.
- **`SyncConflictModal`**: centred card, 3px `--negative` top border, triangle mark + "SYNC CONFLICT" display 800/22, prose explanation naming the army, a two-column THIS DEVICE / SERVER summary (1px-gap grid), then two 52px buttons stacked: primary inverted "KEEP THIS DEVICE'S VERSION", secondary outlined "USE THE SERVER'S VERSION".

### Empty states
Dashed 1px `--rule` box on `--panel`. Army list: title display 700/20 "No rosters found yet" + one prose line. Leaders tab: sans 500/16 `--ink-2` "No units in this army have a Leader ability."

---

## 6. Tablet (≥900px)
- Two panels in `grid-template-columns: minmax(0,1fr) minmax(0,1fr)`, 6px gutter showing `--inset`. **A always left, B always right.** No switcher.
- Panel headers get the side fill + top rail + mark at the outer edge.
- Calculator spans both columns; directions side by side.

---

## 7. Safe areas
`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Header gets `padding-top: env(safe-area-inset-top)`; the bottom-most element (calculator, Start footer, or list) gets `padding-bottom: env(safe-area-inset-bottom)` with the same background so the home indicator sits on a matching surface. Keep the existing `html, body { overflow: hidden }` rule.

---

## 8. Suggested order of work (one PR each)

1. **Tokens + fonts** — §2 in `index.css`, `index.html` font link / self-hosted fonts. Grep for the removed variables and remap (`--meta` → `--ink-2`, `--*-heading` → `--ink`, `--*-wash` → `--side-*-fill`). App should look recoloured but structurally unchanged.
2. **Side identity** — add a `<SideMark side="A" | "B" size={n} />` component (square/diamond via `clip-path`) and use it in `SideSwitcher`, `PanelHeader`, `ArmySetupScreen`, `AttackTable` direction header, `DetachmentModal`. Enforce A-left / B-right.
3. **Unit list + datasheet** — `UnitRow`, leader connectors, `StatStrip`, keyword chips with inline rule box, `ModelCounter` stepper states.
4. **Weapon table phone layout** — `WeaponTable` / `WeaponRow` per §5.4, including boosted values and source pill.
5. **Calculator** — `ModifierControls` wrap layout, result cells, note lines, height caps.
6. **Header overflow + sync shapes + voice banner.**
7. **Config screens, sheets, dialogs, empty states.**
8. **Pass:** Ukrainian strings (§9), 390px width, 1180×820, iPhone safe areas, store-lighting check at arm's length.

Each step is independently shippable; after step 1 nothing should be broken.

---

## 9. i18n additions (`src/i18n`)

| key | EN | UA |
|---|---|---|
| `side` | SIDE | СТОРОНА |
| `open` | OPEN | ВІДКРИТО |
| `overflow.language` | Language | Мова |
| `overflow.wake` | Keep screen awake | Не вимикати екран |
| `calc.halfRange` | Half range | Пів дальності |
| `calc.apWorsened` | AP worsened by 1 | БП гірше на 1 |
| `voice.notUnderstood` | Didn't catch that — try "3 against 7" | Не розчув — спробуйте «3 проти 7» |
| `setup.needSide` | Assign an army to {side} to start. | Призначте армію стороні {side}, щоб почати. |
| `det.roster` | ROSTER DETACHMENT | ЗАГІН РОСТЕРА |

Ukrainian runs 20–40% longer: never set `nowrap` on names, only on the switcher's short army name (ellipsised) and on calculator toggles. Captions use condensed display type, which absorbs most of the growth.

---

## 10. Acceptance checklist
- [ ] No colour literals in components; everything via tokens.
- [ ] Every side-tied element shows colour **and** mark; A left, B right everywhere.
- [ ] Negative/penalised is amber everywhere; no side hue used for good/bad.
- [ ] All interactive targets ≥ 44px (including chip hit areas).
- [ ] Phone weapon table fits 390px with no horizontal scroll, 10-model / 4-loadout unit included.
- [ ] Calculator never exceeds its height cap; lists stay scrollable.
- [ ] Steppers visibly disabled at bounds.
- [ ] UA strings wrap cleanly at 390px.
- [ ] Fonts load offline (PWA precache).
- [ ] Sync dot states distinguishable in greyscale.
