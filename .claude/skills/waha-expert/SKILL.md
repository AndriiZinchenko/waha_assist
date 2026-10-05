---
name: waha-expert
description: Use for Warhammer 40,000 rules questions (10th or 11th edition), looking up datasheets, stratagems or detachments, checking whether the combat calculator in src/lib matches the rules, or advising on a roster in armies/. Answers come from local cited sources only.
---

# waha-expert

Answer from the files below, never from memory. Every answer names its edition and cites a file and section. If the sources do not cover the question, say "not in sources" and stop.

## Sources (all under `.claude/skills/waha-expert/`)

| Path | Contents | Cite as |
|---|---|---|
| `references/11e/universal-rules-updates.md` | 11th Universal Rules Updates v1.1 (legal 2026-08-26). **Overrides** the 11e core rules. | `11e/universal-rules-updates.md` + section title |
| `references/11e/core-rules.md` | 11th Core Rules, split by printed rule number | `11e/core-rules.md §09.07` |
| `references/10e/core-rules.md` | 10th Core Rules, split by PDF page | `10e/core-rules.md p.20` |
| `data/<10e or 11e>/*.csv` | Wahapedia export: datasheets, weapons, abilities, stratagems, detachments, enhancements, keywords, leaders, points | `data/11e` + unit or stratagem name |
| `data/<edition>/SOURCE.txt` | When the data was exported | |

## Coverage and known gaps (state these when they matter)

- **10e core rules are the launch version (PDF dated 2023-05-31).** The later "Core rules updates and errata" are not in the sources, so a 10e core-rules answer must end with: "Based on the launch Core Rules; later errata are not in my sources."
- **11e core rules PDF is older than the current rules.** It lacks rules 18.06 and 18.07 cited by the Universal Rules Updates. Where the updates conflict with the core rules, the updates win. For anything touching disembarking, say the core text may be out of date.
- **FAQs:** only the selection printed at the very end of the 11e PDF. It has no rule numbers, so it sits at the tail of the `[TWINLINKED] (§24.38)` section: cite it as "11e FAQ appendix" with the PDF page from that section's comment, never as `§24.38`. The full FAQs live in the Warhammer 40,000 app.
- **Lost hyphens in the 11e text.** The PDF extraction drops some hyphens, so grep for both spellings: `twin-linked`/`twinlinked`, `close-quarters`/`closequarters`, `anti-infantry`/`antiinfantry`. A grep with only the hyphen finds nothing here even though the rule is present; do not answer "not in sources" until you tried both.
- **The 11e Wahapedia stratagem table also holds the old 10th edition core stratagems.** `lookup.mjs` drops those rows (type starts with "Core – ") for 11e. If you read `data/11e/Stratagems.csv` directly, ignore them.
- **Not available:** the Munitorum Field Manual (Wahapedia's points tables stand in for unit costs), balance dataslates, faction pack errata.
- **Wahapedia is fan-compiled.** Datasheet and stratagem text may differ from the printed books; credit it ("powered by Wahapedia"). 10e data is final as of 2026-06-13; 11e data is refreshed with the sync script.
- **Section bodies can run on.** A reference section ends only at the next numbered heading, so its text may include the unnumbered intro of the following chapter. Quote only the part that belongs to the rule.

## How to answer

1. **Edition first.** Begin with the edition you are answering for. If the user does not say: questions about one of their rosters use that roster's edition (see below); other questions are answered for both editions when the rule differs, for one when it does not. Never mix editions in one rule: terms differ (10e "Fall Back", "Engagement Range"; 11e "fall-back move", "engaged", "coherency"), so search both spellings and label each result.
2. **Search, don't load.** Find the section, then read just that section:
   - `grep -n -i "<term>" .claude/skills/waha-expert/references/11e/*.md`
   - `awk '/^## FALL-BACK MOVE/{f=1;print;next} /^## /{f=0} f' .claude/skills/waha-expert/references/11e/core-rules.md`
   - Weapon abilities are sections of their own with the brackets in the title, e.g. `/^## \[SUSTAINED HITS\]/` (§24.36).
   - **Derive the citation from the file, never from memory or line numbers.** For 11e, quote the `§` number in the section heading. For 10e, find the page with `awk '/^## Page /{p=$3} /<phrase>/{print "p." p ": " $0}' .claude/skills/waha-expert/references/10e/core-rules.md`.
3. **Unit, stratagem and detachment data** use the lookup CLI:
   - `node .claude/skills/waha-expert/scripts/lookup.mjs 11e unit "Custodian Guard"`
   - `node .claude/skills/waha-expert/scripts/lookup.mjs 10e stratagem "Heroic Intervention"`
   - `node .claude/skills/waha-expert/scripts/lookup.mjs 11e detachment "Shield Host"`
   Copy numbers from its output; do not recall them. 11e points are tiered ("YOUR 1ST TO 3RD UNITS COST" and so on); say which tier you mean.
4. **Source order.** Rules updates, then core rules, then datasheet data. If sources disagree, state both and say which wins and why.
5. **Cite every claim** with the format in the table. Quote a short phrase only when the exact wording matters.
6. **No match is an answer.** If grep and lookup find nothing, reply "not in sources" and say what would fix it (for example the missing document).

## List-aware questions

Read the roster in `armies/*.json` and `src/data/detachments/*.ts` (the detachment rules and stratagems the app synced). A roster's edition is `roster.gameSystemName` ("Warhammer 40,000 10th Edition"); a file with no system name is 10th, and the app's own rule is in `rosterEdition.mjs`. Today all five rosters are 10th, so answer them from `10e` sources. The detachment files under `src/data/detachments/` are synced from the 10th edition catalogue only, so do not use them for 11e questions. Use `lookup.mjs` for datasheet details the roster lacks. Answer about the user's actual units, weapons and detachment, not generic ones.

## Checking the combat calculator

The app is being extended to support both editions (`src/lib/edition.ts`), but the calculation logic is still **10th edition only**: `src/lib/combat.ts`, `rules.ts` and `coreRules.ts` contain no edition handling. Be careful with that:

1. Compare against **10e** sources unless the user asks about 11e. In 11e mode, do not report "matches": say the calculator has no 11e logic yet and list where the 11e rules differ from what the code does (these are gaps to build, not bugs).
2. Find the rule text for the mechanic (in 11e the attack sequence is §05, starting at §05.01 Hit rolls; for 10e search `10e/core-rules.md` for "Hit roll", "Wound roll").
3. Read the matching code: `src/lib/combat.ts`, `src/lib/rules.ts`, `src/lib/coreRules.ts`, `src/lib/attackDisplay.ts`, and `src/data/core-abilities.ts` for ability definitions.
4. Report each point as **matches**, **differs** or **cannot tell**, with the rule citation and a `file:line` for the code, and name the edition compared.
5. Do not edit app code. A difference is a finding for the user to act on.

## Refreshing sources

- Wahapedia data: `node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs <10e|11e>` (downloads from wahapedia.ru; ask the user first).
- A new PDF: save it under `docs/rules-source/<edition>/`, then `node .claude/skills/waha-expert/scripts/pdf-to-md.mjs <pdf> <edition> <doc-name>` (needs `pdftotext` on PATH). Update the Sources and Coverage sections above.
- See `docs/rules-source/README.md` for what was checked in each source file.
