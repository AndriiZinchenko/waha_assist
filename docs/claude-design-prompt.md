# Claude Design prompt: 40k Combat Assistant redesign from scratch

Paste everything below the line into Claude Design.

---

Design a complete new visual identity and UI for **40k Combat Assistant**, a web app (installable to the iPhone home screen) that two Warhammer 40,000 players use at the table during a game. There is a working app today. Treat it as a functional spec only. I want a totally new look and I am open to new layouts and navigation patterns, as long as every function listed below still has a home.

## Who uses it and where

- Two players stand at a gaming table mid-game. One of them holds a phone or props a tablet on the table edge, often with dice in the other hand.
- Lighting is bad: game-store fluorescents or a dim living room. Text must be readable at arm's length.
- The core question they ask, dozens of times a game: "my unit X attacks your unit Y, what do I need to roll?" They want the answer in two taps, not a menu hunt.
- The second question: "what does this rule / stratagem / keyword actually say?" They want the full text inline, without leaving the screen.
- Offline-first. No network needed during a game.

## Hard requirements (keep these, style them however you want)

- **Primary target: iPhone portrait, 390×844.** Also design the battle screen for **tablet landscape (≥900px wide)**, where both armies are shown side by side instead of one at a time.
- **Two sides, A and B, must never be confused.** Every element tied to a side (its army, its units, its unit cards, attacker/defender names in results) needs a strong, consistent side identity. Today that is done with color; you may add shape, icon, or position cues too.
- Touch targets at least 44px. One-handed use.
- Data is dense. A squad can have ten models with four different weapon loadouts. Scrolling past whitespace to find a weapon is the failure mode. Favor dense, scannable layouts with large numerals over airy cards.
- Numbers (stats, dice targets, points, model counts) must align and read as data. A monospace or tabular-figure face is expected.
- Two languages: English and Ukrainian. Ukrainian strings run roughly 20–40% longer. Long names are common ("Imperium - Adeptus Astartes - Ultramarines", "Lord Discordant on Helstalker").
- Respect iPhone safe areas (notch at top, home indicator at bottom).
- No imagery or unit art. Typography, color, and simple icons only.

## Global header (on every screen)

Contains, left to right: a button back to the army list, a sync status dot, an EN/UA language toggle, a Keep Screen Awake toggle, a voice-commands microphone toggle, and a combat calculator toggle. On phones this row is tight; feel free to move some of these into an overflow menu.

Sync status has four states: synced, local changes pending, server unreachable (changes stay on this device), and conflict.

## Screen 1: Army list (pick two armies)

- A short hint line: "Tap an army to configure it. Use A | B to assign it to a side."
- One entry per saved army roster, typically 3–8. Each shows: faction name (e.g. "Chaos - Chaos Space Marines"), detachment and list nickname (e.g. "Pactbound Zealots · Chaos"), and points (e.g. "2000pts").
- Each entry has an **A / B side picker**. An army assigned to a side takes on that side's identity.
- Tapping the entry itself (not the picker) opens its configuration screen.
- A **Start** button, disabled until both sides have an army, leads to the battle screen.
- Empty state: no rosters found yet.

## Screen 2: Army configuration (per army, three tabs)

Header row: Back button and the army name.

**Units tab**
- Hint: "Expand a unit for its full datasheet. Hide units to trim the list down to a smaller points limit."
- A live points total versus the roster limit, e.g. "2000 / 3000pts".
- One row per unit: name (★ suffix if it is the Warlord), its points cost, and a Visible / Hidden toggle. Hidden units disappear from the battle screen.
- Expanding a unit shows its full datasheet card (see "Unit datasheet card" below) with an always-visible weapon table.

**Leaders tab**
- Hint: "Assign leaders to the units they attach to."
- One card per character that has the Leader ability, with a set of chips listing the units it can join, plus "Unattached". Exactly one chip is selected.
- Empty state: "No units in this army have a Leader ability."

**Detachment tab**
- Hint: "Expand a detachment for its rules and stratagems. Select one to play with it instead of the roster's."
- A list of every detachment for the faction. Each one expands to show its detachment rules and its stratagems. A Select / Selected control picks which one is used in battle.

## Screen 3: Battle (the heart of the app)

**Phone portrait:** one army visible at a time, with a switcher between side A and side B at the top (showing both army names). **Tablet landscape:** both armies side by side, no switcher.

Each army panel has:
- A panel header: army name, detachment name (tappable, opens a sheet with the detachment's rules and stratagems), and total points.
- A unit list. Each row: a disclosure indicator, unit name (★ if Warlord), and live/total model count (e.g. "5/5", "8/10", with casualties highlighted). Units from an allied faction carry a small faction tag (e.g. "CHAOS KNIGHTS").
- **Leader nesting:** a unit with a leader attached appears directly under that leader, visually nested.
- Tapping a row expands its datasheet card in place. Only one unit per side is open at a time, and that open unit is the one the combat calculator uses for that side. Tapping it again closes it.
- When voice mode is on, every unit shows a number badge so players can say "3 against 7".

### Unit datasheet card (used on battle and configuration screens)

Top to bottom:
1. **Stat line**: six stats, each a big number with a small caption: M (14"), T (9), SV (2+), W (10), LD (6+), OC (4). Below it, the invulnerable save if any (e.g. "4++ INVULN").
2. **Keywords**: e.g. "Mounted, Character, Chaos, Daemon, Lord Discordant". Keywords that have a rule are tappable and expand the rule text inline.
3. **Models** (battle screen only): one row per wargear loadout, with a −/count/+ stepper and "of N". This is how players record casualties. Each loadout expands to its weapon table.
4. **Weapons table**, grouped under "Ranged" and "Melee". Per weapon: count, name, range, attacks, skill (BS/WS), strength, AP, damage, plus a line of weapon keywords (e.g. "Ignores Cover, Torrent", "Melta 2", "Lance"), each tappable to expand its rule text. Values changed by an attached leader are highlighted as boosted, with a tappable pill naming the source. On a 390px screen this table does not fit as eight columns; design a phone layout for it.
5. **Info** (collapsible): unit abilities, each a name plus a paragraph of rules text. Text can contain inline keyword emphasis in small caps (e.g. VEHICLE, HERETIC ASTARTES).
6. **Rules** (collapsible): faction and core rules that apply to the unit.
7. **Stratagems** (collapsible): stratagems this unit can use, split into "Detachment" and "Core". Each stratagem shows name, CP cost, type (e.g. "Battle Tactic"), phase (e.g. "Shooting phase"), and body text made of labelled paragraphs (WHEN:, TARGET:, EFFECT:, RESTRICTIONS:).

### Combat calculator (toggled from the header, docked to the bottom of the battle screen)

- If fewer than two units are expanded: "Select a unit on both sides to see combat results."
- **Controls**: Ranged / Melee toggle; Hit modifier stepper (−2..+2); Wound modifier stepper (−2..+2); Invuln override stepper (None, 6+, 5+, 4+, 3+, 2+); "AP worsened by 1" toggle; "Half range (Melta/Rapid Fire)" toggle; and a Close button.
- **Results**: two directions, A attacking B and B attacking A. Each direction has a header "Lord Discordant on Helstalker → Warboss in Mega Armour" with each name in its side's identity. On phones they stack; on tablets they sit side by side.
- Under each direction, one block per weapon: "1× Bolt pistol (12")", then five result cells: **Atk** (1), **Hit** (2+), **Wound** (5+), **Save** (2+, or "4++" when the invuln is better, or "no save"), **D** (1). Cells can be tinted as boosted or penalised.
- Under the cells, a line of explanatory notes, each one neutral, positive, or negative:
  - neutral: "Save 3+ / AP−1"
  - positive: "Anti-Infantry 4+ applied", "Hit +1 applied", "Melta 2 applied (half range)"
  - negative: "Target has a conditional 5+ invuln, not applied — set Invuln override if it applies here"
- Results update live on every control change. There is no Calculate button.
- It must never cover the whole screen; the unit lists stay usable above it.

### Voice mode

When the microphone is on, a small listening banner reads "Listening — say “3 against 7”" and briefly shows feedback ("Undone", "Nothing to undo", or an error). A spoken command expands unit 3 on side A and unit 7 on side B.

### Other states to design

- Sync conflict dialog: explains that this device and the server both changed leaders or hidden units, with two choices: keep this device's version, or use the server's.
- Detachment sheet from the panel header: detachment name, faction, rules, stratagems, close button.
- Stepper disabled at its bounds.

## Sample data to use

- **Side A: Chaos - Chaos Space Marines**, Pactbound Zealots, 2000pts. Units: Lord Discordant on Helstalker, Warpsmith, Master of Executions (leading Legionaries 5/5), Master of Possession (leading Legionaries 5/5), Abaddon the Despoiler ★ (leading Chaos Terminator Squad 5/5), Havocs 5/5, Obliterators 2/2, Traitor Guardsmen Squad 10/10, Forgefiend, Venomcrawler, Chaos Rhino, War Dog Brigand (allied, CHAOS KNIGHTS).
- **Lord Discordant on Helstalker** weapons: Bolt pistol 12" A1 BS2+ S4 AP0 D1 [Pistol]; Baleflamer 12" D6+3 auto-hit S6 AP−1 D2 [Ignores Cover, Torrent]; Magma cutter 6" A2 BS3+ S9 AP−4 D6 [Melta 2]; Bladed limbs Melee A4 WS3+ S6 AP−1 D2 [Extra Attacks]; Impaler chainglaive Melee A5 WS2+ S8 AP−3 D3 [Lance]. Abilities: Corrupt Machine Spirits, Spirit Thief.
- **Side B: Xenos - Orks**, Blitz Brigade, 2000pts. Units: Ghazghkull Thraka ★ 2/2, Gretchin 11/11, Boss Snikrot (leading Kommandos 10/10), Warboss in Mega Armour (leading Meganobz 5/5), Mek (leading Nobz 8/8). Warboss in Mega Armour: M5" T6 SV2+ W7 LD6+ OC1, 5++ invuln.

## What I want back

A cohesive design system and these artboards:

1. Phone 390×844: Army list, with one army on A and one on B.
2. Phone: Configuration, Units tab with one unit expanded; Leaders tab; Detachment tab with one detachment expanded.
3. Phone: Battle, side A, unit list with nested leaders.
4. Phone: Battle, unit datasheet expanded, showing stats, models with one loadout open, and the weapon table.
5. Phone: Battle with the combat calculator open and results showing.
6. Phone: Stratagems section expanded, and a keyword rule expanded inline.
7. Tablet landscape 1180×820: Battle with both panels and the calculator open.
8. A small states sheet: sync status states, voice listening banner, sync conflict dialog, empty states, disabled Start button.

Include the palette (with a clear Side A / Side B identity and positive / negative / boosted tones), type scale, spacing and radius tokens, and core components: list row, stepper, segmented toggle, chip, collapsible section header, stat cell, result cell, note line.

The current app is a dark cool-grey UI with a teal side A and an amber side B, Chakra Petch headings, IBM Plex Sans body, and IBM Plex Mono numbers. You do not need to keep any of that. Propose a direction that feels at home in the Warhammer 40k world while staying a crisp, fast reference tool, not a themed decoration piece.
