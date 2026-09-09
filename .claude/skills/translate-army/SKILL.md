---
name: translate-army
description: Use when a new army JSON is added to armies/ (or the Ukrainian translation looks incomplete/English) and the Ukrainian dictionary at src/i18n/uk.ts needs new ability/rule entries added or regenerated.
---

# Translating a new army into Ukrainian

The app has an EN/UA language toggle (`src/lib/i18n.tsx`) that translates
unit **ability** text (the "Info" section) and **rule** text (the "Rules"
section, and the click-to-expand text behind weapon keyword badges) via a
flat dictionary: `src/i18n/uk.ts`, `Record<English text, Ukrainian text>`.
Lookup falls back to English on any miss, so nothing ever breaks — a new
army just shows English until you add entries here.

## The translation convention (read this before writing any Ukrainian)

**Never translate:**
- Ability **names** and rule **names** (e.g. `"Champion of the Order of
  Purifiers (Psychic)"`, `"Deep Strike"`). Only the *body text* is ever
  translated. `unit.abilities[].name` and `unit.rules[].name` are rendered
  verbatim in the UI — don't add dictionary entries keyed by a name, and
  don't wire a `t()` call onto a `.name` field in the components.
- Raw weapon keyword badges (`weapon.keywords`, e.g. `"Rapid Fire 2"`,
  `"Anti-Infantry 2+"`). These are never even passed through `translate()`
  — see `WeaponRow.tsx` / `AttackRow.tsx`, they render `weapon.keywords`
  directly. Don't change that.
- Bracketed ability tags inside body text, e.g. `**[RAPID FIRE X]**`,
  `**[DEVASTATING WOUNDS]**` — copy them through unchanged.

**Inside the body text you DO translate:** write natural Ukrainian for the
sentence structure and instructional verbs (щоразу, коли / поки / якщо /
додайте / оберіть / ви можете / до кінця фази / на початку...), but leave
every specific 40k rules term in English, exactly as it appears in the
source — even mid-sentence. This includes:
- Characteristic names: `Attacks`, `Toughness`, `Strength`, `Wounds`,
  `Damage`, `Objective Control`, `Ballistic Skill`, `Weapon Skill`,
  `Armour Penetration`, `Move` (usually as "характеристика Attacks", not
  "характеристики Attacks" — keep it as one English noun phrase after the
  Ukrainian word for "characteristic").
- Roll/test names: `Hit roll`, `Wound roll`, `Damage roll`, `Leadership
  test`, `Hazardous test`, `Advance`, `Charge`, `Charge move`, `Charge
  roll`.
- Phase names: `Command phase`, `Movement phase`, `Shooting phase`,
  `Charge phase`, `Fight phase`.
- Unit-type/keyword terms: `Character`, `Vehicle`, `Monster`, `Psyker`,
  `Transport`, `Infantry`, `Mounted`, faction keywords in ALL CAPS (e.g.
  `HERETIC ASTARTES`, `DAMNED`).
- Named mechanics: `Deep Strike`, `Battle-shock`, `Engagement Range`,
  `Benefit of Cover`, `Strategic Reserves`, `Critical Hit`, `Critical
  Wound`, `mortal wounds`, `invulnerable save`, `saving throw`, `objective
  marker`, `Starting Strength`, `Stratagem`, `CP`.
- Anything already ALL CAPS or `**bold**`/`^^underlined^^` in the source
  (datasheet/unit-type keywords) — leave that markup and casing untouched.

### Worked example (the reference pattern)

English (`Rapid Fire`'s rule text):
> Weapons with **[RAPID FIRE X]** in their profile are known as Rapid Fire
> weapons. Each time such a weapon targets a unit within half that
> weapon's range, the Attacks characteristic of that weapon is increased
> by the amount denoted by 'x'.

Ukrainian:
> Зброя, що має **[RAPID FIRE X]** у своєму профілі, називається зброєю
> Rapid Fire. Щоразу, коли така зброя атакує підрозділ, що перебуває в
> межах половини дальності цієї зброї, характеристика Attacks цієї зброї
> збільшується на значення, позначене як «x».

Another one (`Foesight (Psychic)`, an ability — name stays English, only
the text is translated):

English:
> Each time this model makes an attack that targets a Character unit, you
> can re-roll the Hit roll.

Ukrainian:
> Щоразу, коли ця модель здійснює атаку по підрозділу Character, ви
> можете перекинути Hit roll.

Note "re-roll the Hit roll" becomes "перекинути Hit roll" — don't also
translate "roll" into "кидок" when it's already part of the kept-English
term; that produces a redundant "кидок Hit roll".

## Workflow: adding a new army

1. **Drop the new roster JSON into `armies/`.** Nothing else needed for it
   to work in English — the app already falls back gracefully.

2. **Find what's missing.** Run the generator script from the repo root:
   ```bash
   node .claude/skills/translate-army/generate-dictionary.mjs
   ```
   It extracts every unique `{name, text}` pair for unit abilities and
   unit/weapon rules across *all* `armies/*.json` files (deduplicated by
   exact text), looks up a Ukrainian translation for each from the
   hand-written tables inside the script (`RULE_UK`, `ABILITY_UK`, plus a
   few multi-variant tables — see below), and rewrites `src/i18n/uk.ts`.
   Anything it can't find a translation for gets printed to stderr as
   `MISSING RULE TRANSLATION: ...` / `MISSING ABILITY TRANSLATION: ...`
   (truncated to 60 chars) and is silently skipped (falls back to English
   in the app) rather than breaking the build.

3. **Translate the missing entries.** For each `MISSING ABILITY
   TRANSLATION: "Some Name" | Some text prefix...`, open
   `generate-dictionary.mjs` and add an entry to `ABILITY_UK` (keyed by
   the ability **name**) or `RULE_UK` (keyed by the rule **name**)
   following the convention above. If the same *name* covers more than
   one distinct text across different datasheets (this already happens
   for `"Leader"` and `"Invulnerable Save"` — the ability text lists
   different eligible units / different save values per unit), add a
   snippet-matched entry to the `LEADER_VARIANTS` / `INVULN_VARIANTS`
   arrays instead (`[uniqueSubstringOfTheEnglishText, ukrainianTranslation]`)
   — the script picks the first variant whose snippet is found in the
   text. Follow that same pattern if a *new* multi-variant name shows up.

4. **Re-run the generator** (step 2's command) until it reports zero
   `MISSING` lines and prints the new total entry count.

5. **Verify:**
   ```bash
   npx vitest run src/lib/i18n.test.ts
   npx tsc --noEmit -p tsconfig.app.json
   ```
   Then spot-check in the running app: toggle to UA in the header, open a
   few units from the new army, and confirm ability/rule text reads as
   Ukrainian with the English terms intact per the convention, and that
   weapon keyword badges are still untouched English.

## Workflow: after `npm run sync:stratagems` (detachments and stratagems)

The sync writes one file per detachment for every faction with a roster,
so a new faction (or a new detachment in an existing one) brings dozens of
rule and stratagem texts at once. Their Ukrainian lives in per-faction
modules under `.claude/skills/translate-army/uk-detachments/`, not in the
generator's inline tables, and is keyed per detachment because the same
stratagem name can carry different text in different detachments.

1. **List the gaps as JSON** (the `MISSING ...` lines are also printed):
   ```bash
   node .claude/skills/translate-army/generate-dictionary.mjs --report missing.json
   ```
   Each item is `{kind, key, name, text}` with `kind` one of
   `DETACHMENT RULE`, `STRATAGEM TEXT`, `STRATAGEM PHASE` and `key` of the
   form `<detachment file stem>/<name>` (`core/<name>` for core stratagems).

2. **Translate into a module.** Add or extend a file in `uk-detachments/`
   (one per faction, split in two when it grows past ~50 items) exporting
   any of:
   ```js
   export const RULES = { "<stem>/<rule name>": "<Ukrainian>" };
   export const STRATAGEMS = { "<stem>/<stratagem name>": "<Ukrainian>" };
   export const PHASES = { "<exact English timing line>": "<Ukrainian>" };
   ```
   Keys are copied verbatim from the report. Timing lines are shared across
   factions, so they live in `uk-detachments/phases.mjs`. Same convention
   as above: names never translated, `TARGET:`/`EFFECT:`/`RESTRICTIONS:`
   become `ЦІЛЬ:`/`ЕФЕКТ:`/`ОБМЕЖЕННЯ:`, paragraphs and markup preserved.
   Large batches go well as one subagent per work file, each handed the
   convention section, the existing tables as style reference, and its
   slice of the report.

3. **Re-run the generator** until the report is empty, then verify as in
   step 5 above and check the Detachment tab of the configuration screen
   with UA toggled on.

The generator trusts a name-keyed inline table (`DETACHMENT_RULE_UK`,
`STRATAGEM_TEXT_UK`) only for a name that has a single text across all
detachments; anything else must come from a keyed module entry.

## Why a generator script instead of hand-editing `uk.ts` directly

`uk.ts` is keyed by the **exact** English string pulled from the roster —
and some New Recruit/BattleScribe exports contain stray non-breaking
spaces (`U+00A0`) instead of plain spaces inside ability/rule text (likely
from copy-pasting the rules text out of a PDF), invisible in an editor but
fatal to an exact-string match. `translate()` in `src/lib/i18n.tsx`
normalizes those to plain spaces before comparing, and the generator does
the same when building dictionary keys — so always regenerate through the
script (which extracts keys programmatically from the actual parsed
roster) rather than hand-typing an English key into `uk.ts`, or you risk
silently reintroducing a key that never matches.

## Files involved

- `src/i18n/uk.ts` — the generated dictionary. Don't hand-edit; regenerate
  via the script instead (any hand edit is lost on the next run).
- `src/lib/i18n.tsx` — `translate()`, `LangProvider`, `useLang`,
  `useTranslate()`. The whitespace-normalization fix lives here.
- `.claude/skills/translate-army/generate-dictionary.mjs` — the generator
  and the source-of-truth translation tables (`RULE_UK`, `ABILITY_UK`,
  `LEADER_VARIANTS`, `INVULN_VARIANTS`, plus a couple of shared constants
  for texts repeated verbatim across many datasheets, e.g.
  `DEADLY_DEMISE`, `FEEL_NO_PAIN`, `STRATAGEM_CP`).
- `.claude/skills/translate-army/uk-detachments/*.mjs` — per-faction
  Ukrainian for the synced detachment rules and stratagems, keyed
  `<detachment file stem>/<name>`, plus `phases.mjs` for the shared timing
  lines. Loaded by the generator before its inline tables.
- `src/data/keyword-glossary.ts` — hand-written definitions of the general
  unit keywords (Infantry, Battleline, Transport…) shown when a keyword in
  the unit card's keyword row is clicked. Its Ukrainian lives in the
  generator's `KEYWORD_GLOSSARY_UK` table, keyed by keyword; a new glossary
  entry without a matching table entry is reported as
  `MISSING KEYWORD GLOSSARY TRANSLATION`. Keyword names themselves are
  never translated.
- Components already wired to `useTranslate()` — don't add `t()` calls to
  any `.name` field, only to `.text`: `UnitInfo.tsx`, `UnitRules.tsx`,
  `WeaponRow.tsx`, `AttackRow.tsx`, and `StatStrip.tsx` (glossary text only).
