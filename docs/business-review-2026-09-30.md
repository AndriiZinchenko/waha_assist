# 40k Combat Assistant — product review

*30 September 2026. A business-level look at what the app is, who it serves, where it is strong, where it falls short, and what to build next. Written from the code, the docs, the five rosters in `armies/`, and the commit history.*

---

## 1. What the app is today

A two-army reference tool for Warhammer 40,000 10th Edition, used at the table on a phone or tablet. You pick an army for side A and side B, tap a unit on each side, and the calculator shows every weapon's hit, wound and save target numbers, with the invulnerable save and any applied rule called out. Around that core it offers:

- Full datasheets: stats, keywords with inline glossary, per-loadout model counters for casualties, weapon tables, abilities, faction rules, and the stratagems the unit can use.
- Army setup: hide units to fit a points limit, attach leaders to bodyguard units, swap the detachment.
- Situational modifiers: ±1 hit, ±1 wound, invuln override, AP worsened by 1, half range for Melta and Rapid Fire.
- Voice: "3 against 7" opens both units hands-free.
- Two languages (English and Ukrainian) for interface and rules text.
- Offline-first PWA, with army configuration synced between PC and tablet through a tiny state API on the dev server.
- Data pipeline: rosters, detachments and stratagems are pulled from the owner's New Recruit account by scripts.

**Positioning.** It is deliberately not a list builder, a dice roller, a game-state tracker or a rules referee (plan §2). It is a lookup accelerator: it removes the "human rules database" bottleneck during shooting and fight phases.

**Scale.** About 11,500 lines of application code, 2,300 lines of tests, 284 unit tests. Data: 5 rosters, 70 units, 282 weapon entries, 54 detachments with stratagems, 7 core stratagems. Five commits, all in September 2026, after a longer undocumented history.

## 2. Who it serves

Today: one owner and whoever they play against, using the owner's five armies. Everything is tied to that setup:

- Rosters are baked into the build from `armies/`. There is no way to load a list on the device.
- Detachment and stratagem data exist only for the five factions those rosters use.
- Sync runs on the owner's PC over Wi-Fi; the app is served from `npm run dev`.
- Stratagem data comes through a New Recruit supporter feature on the owner's account.

That is a fine shape for a personal tool. It is the main thing standing between "my tool" and "a tool my gaming group or club could use".

## 3. Strengths

- **The core answer is fast and correct by construction.** Target numbers come from a small pure function with tests, not from prose or a model. The invuln fallback and "no save" cases are handled and shown, which is the number-one table mistake.
- **Dense, legible, phone-first UI.** The Dataslate redesign gives big monospace numbers, clear A/B identity by colour and shape, and a weapon table that fits 390 px. It is built for bad light and one-handed use.
- **Honest modifiers.** The app only claims rules it can actually apply, and labels every applied rule in the result. Unresolved conditions (a conditional invuln) are flagged, not guessed.
- **Data is self-contained.** New Recruit exports carry full profiles, so there is no external rules service at play time. Offline works, including fonts.
- **Good engineering hygiene for a solo project.** Pure logic in `src/lib` with tests, generated data files, design docs for every subsystem, a route in the URL so reloads land where you were.
- **Localisation is real.** The Ukrainian dictionary covers rules text, not just buttons, and the condensed typeface absorbs the longer strings.

## 4. Weaknesses and gaps

### 4.1 Rules coverage is narrow for what the rosters actually contain

The calculator applies exactly three weapon rules automatically: Anti-X, Melta (with the half-range toggle) and Rapid Fire (same toggle). Across the five rosters the weapon keywords in use are:

| Keyword | Weapon entries | Handled today |
|---|---|---|
| Pistol | 40 | not needed for numbers |
| Rapid Fire | 40 | yes, via Half range |
| Psychic | 33 | not needed for numbers |
| Ignores Cover | 19 | no cover toggle exists |
| Devastating Wounds | 17 | no |
| Blast | 17 | no, although the target's model count is known |
| Twin-linked | 16 | no (reroll wounds) |
| Assault | 15 | not needed for numbers |
| Torrent | 13 | yes (auto-hit) |
| Hazardous | 10 | no warning |
| Anti-Infantry / Vehicle / Psyker | 17 | yes |
| Melta | 9 | yes |
| Precision | 8 | no |
| Heavy | 8 | no (+1 to hit if stationary) |
| Sustained Hits | 6 | no |
| Lance, Indirect Fire, Extra Attacks | 7 | no |

Ability text tells the same story: 18 abilities subtract 1 from hit rolls, 18 grant re-rolls, 5 grant Feel No Pain, 5 subtract 1 from wound rolls. The calculator models two leader abilities by name and nothing else. Players end up applying most defensive rules by hand, which is the lookup work the app exists to remove.

### 4.2 No expected-damage output

The app stops at target numbers. It never says "about 4.2 unsaved wounds, 8 damage, 68% to kill". That is the question the table actually argues about, and it is what makes re-rolls, Sustained Hits, Lethal Hits, Devastating Wounds and Feel No Pain matter. The modifier design explicitly deferred re-rolls for this reason. Dedicated calculators exist for this and are widely used, which shows the demand.

### 4.3 Only the owner's armies

There is no way for an opponent to bring their list. A New Recruit export on the opponent's phone cannot be opened in the app. This limits the tool to games where the owner supplies both armies.

### 4.4 Game flow is only lightly supported

The Ranged/Melee switch is now phase-aware, but nothing else is. Stratagems are listed per unit in full; there is no "what can I use in this phase" view, even though every stratagem carries its phase. Single-model units (vehicles, monsters, characters) have a model counter that only goes 1 to 0; there is no wounds-remaining counter, so the most common mid-game lookup for big models ("how many wounds left, and is it in its damaged bracket?") is not covered.

### 4.5 Operational fragility

- The app is served from a dev server on the PC. The PWA, home-screen install, safe areas and the planned on-device voice all assume an https origin, which does not exist yet.
- Voice relies on the browser's Web Speech API, which does not work in iOS home-screen apps. The on-device Vosk design is written but not built.
- The New Recruit scripts drive private page internals with Playwright. They have already broken once in a subtle way (the "Unnamed list" incident, where Horus Heresy lists were exported as Grey Knights). They will break again whenever New Recruit changes.
- Model counts are per device. If both players use their own phone, casualty counts diverge.

### 4.6 Intellectual-property exposure if it goes public

The app reproduces Games Workshop rules text: abilities, faction rules, stratagems, keyword glossary. That is normal for a private tool. Publishing it, especially with an app-store listing or a public URL, would be a different risk category. Any move beyond friends and club needs a decision on whether to ship rules text at all, or only stat lines and target numbers.

## 5. The competitive picture

- **New Recruit / BattleScribe-style builders** own list building and validation, and New Recruit has a play mode. They do not give a two-sided, tap-two-units combat lookup with rules applied.
- **Rules references (Wahapedia and similar)** are exhaustive but read-only; nothing is computed against the opponent.
- **Mathhammer calculators (UnitCrunch and similar)** compute expected damage in depth but require typing every profile in; they are not roster-aware or table-fast.
- **The official app** bundles army building and rules behind a subscription, with no combat lookup.

The app's distinct value is the combination nobody else offers: roster-aware, two-sided, phone-fast, offline, with rules applied and explained. The recommendations below deepen that, rather than chasing any of the neighbours.

## 6. Recommendations

Ordered by value per effort. Effort is a rough size: S under a day, M a few days, L a week or more.

### 6.1 Blast, Heavy, Twin-linked and Hazardous toggles — S

Blast can be automatic today: bonus attacks per five models in the target unit, and the app already tracks the target's live model count. Heavy is one toggle ("remained stationary"). Hazardous only needs a warning line. Twin-linked matters once 6.2 exists. These close the most common gaps in the table above with almost no new UI.

### 6.2 Expected damage — M

Compute average hits, wounds, unsaved wounds, damage and a kill chance per weapon and per unit, from the same pure compute core. This is what turns the calculator from "what do I need" into "is this worth doing". It unlocks re-rolls, Sustained Hits, Lethal Hits, Devastating Wounds and Feel No Pain, all of which the rosters use. Show it as one extra line under the result cells, not a separate screen.

### 6.3 Roster import on the device — M

Let a player open a New Recruit JSON export on the phone (share sheet, file picker, or paste) and keep it in local storage. The parser already exists; the work is storage, an "add army" entry point, and detachment data for factions outside the current five. This is the single change that makes the app usable against anyone.

### 6.4 Phase-aware stratagem list — S

Add a "Stratagems now" view that lists every stratagem for the current phase, for the active side, across detachment and core. The phase is already known from the header switch and each stratagem's phase text. This is the second most common lookup at the table after weapon numbers.

### 6.5 Wounds remaining and damaged brackets — S

For single-model units, replace the 0/1 model stepper with a wounds counter, and show the "damaged" ability text when the count enters the bracket. Same pattern as the casualty stepper, so it fits the current design.

### 6.6 Feel No Pain and defensive modifiers on the datasheet — S to M

Show FNP on the stat line next to the invuln, and a curated list of defensive abilities (−1 to hit, −1 to wound, Stealth) the way leader effects are curated today, with an "apply" tap that sets the matching modifier. Curated by ability name, not parsed from prose, to keep answers trustworthy.

### 6.7 Cover toggle — S

Deferred earlier for correctness, not effort. The rule is stable: +1 to armour saves against ranged attacks, not to invulnerable saves, and no benefit when the save would already be 3+ or better against AP 0. Implement with a test for that edge.

### 6.8 Proper hosting — M

Build and serve the app from an https origin with the state API behind it. This makes the home-screen install, safe areas and offline caching real for everyone, and is the prerequisite for on-device voice. A small VPS or a static host plus a tiny Node service is enough.

### 6.9 On-device voice — L

The Vosk design is already written and verified. It becomes worthwhile once hosting exists, because the current Web Speech path never works in the iOS home-screen app.

### 6.10 Shared battle between two phones — L, later

Both players' devices showing the same casualties and open units. Real value, but it needs a session model and a live channel, and it drags the app toward game-state tracking, which the plan deliberately avoids. Revisit after 6.3 shows how often two devices are used.

### Parked

- **In-app wargear configurator.** Explored 30 September; needs a full BattleScribe rules engine or New Recruit's private internals. Rejected as too fragile. Edit in New Recruit and sync.
- **Command points, victory points, objectives.** Game-state tracking remains a non-goal.
- **Public release.** Needs the IP decision in 4.6 first.

## 7. Suggested order

1. Blast, Heavy, Twin-linked, Hazardous toggles (6.1)
2. Expected damage (6.2)
3. Phase-aware stratagems (6.4)
4. Wounds remaining (6.5)
5. Roster import (6.3)
6. FNP and defensive modifiers (6.6), Cover (6.7)
7. Hosting (6.8), then on-device voice (6.9)

The first four deepen the core loop for the games you already play. Import opens the app to other opponents. Hosting and voice fix the platform underneath.
