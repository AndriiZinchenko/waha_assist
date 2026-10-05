# waha-expert skill

A project skill, `.claude/skills/waha-expert/`, that answers Warhammer 40,000
rules questions from a local, cited reference library; checks the app's
combat calculator against the rules; and gives advice about the rosters in
`armies/`. Designed in conversation on 2026-10-05; pending written-spec
review.

## Goal

Three jobs, all from sources on disk rather than model memory:

1. **Rules Q&A**: "Can a unit shoot after Falling Back?", "How do Lethal Hits
   and Sustained Hits interact?"
2. **Calculator verification**: compare the rule text with the logic in
   `src/lib/` and report mismatches. It changes no code.
3. **List-aware advice**: questions about the user's own armies (Custodes,
   CSM, Orks, Grey Knights, Ultramar), using `armies/*.json` and
   `src/data/detachments/`.

Success: an answer names its edition, cites the file and section it came
from, and says "not in sources" instead of guessing.

## Context

- The app is 10th edition only. The sync scripts hard-lock to `wh40k-10e`
  and the rosters are 10th.
- 11th edition was reported as released in June 2026 (single third-party
  source, not yet confirmed with Games Workshop). The skill must therefore
  cover **both** editions and state which one each answer uses. This is the
  user's decision.
- The user already has an authenticated New Recruit session and syncs unit,
  stratagem and detachment data from it. The user rejected driving New
  Recruit's private in-browser rules engine; this skill does not use it.
- Official core rules, FAQs/errata and the Munitorum Field Manual are free
  PDFs on Warhammer Community
  (`warhammer-community.com/en-gb/downloads/warhammer-40000/`). The user
  downloads them; nothing is fetched without their say-so.

## Layout

```
.claude/skills/waha-expert/
  SKILL.md                  how to answer, source order, citation format
  references/
    10e/  core-rules.md  faq-errata.md  munitorum.md
    11e/  core-rules.md  faq-errata.md  munitorum.md
  data/
    10e/  datasheets, abilities, stratagems (queryable files)
    11e/  same, as far as sources allow
  scripts/
    pdf-to-md.mjs           PDFs -> markdown split by section, with anchors
    sync-wahapedia.mjs      Wahapedia CSV export -> data/<edition>/
```

Source PDFs go in `docs/rules-source/<edition>/` (not inside the skill) and
are the input to `pdf-to-md.mjs`. Whether they are committed is decided at
implementation time based on size and licence comfort.

Each edition folder holds only what could actually be obtained. A missing
file is listed in the skill's coverage note, not stubbed.

## How the skill answers

1. **Edition first.** Every answer starts with the edition it uses. If the
   user does not say, questions about their armies default to 10th (the
   edition of `armies/`); other questions are answered for both editions
   when they differ, and for one when they agree.
2. **Source order.** Errata/FAQ, then core rules, then datasheet or codex
   data. A conflict between sources is stated, not smoothed over.
3. **Citations.** Each claim cites a file and section, for example
   `10e/core-rules.md §Fall Back`. If the search finds nothing, the answer
   says "not in sources" and does not fill the gap from memory.
4. **Search, don't load.** `SKILL.md` tells Claude to grep the reference and
   data folders for the relevant section rather than read whole files.
5. **List-aware questions** read `armies/*.json` and
   `src/data/detachments/` for the user's actual units, weapons and
   detachment. Datasheet data from `data/` supplies what the roster lacks.
6. **Calculator checks** read the rule text for the mechanic in question,
   then the corresponding code under `src/lib/`, and report agreements and
   mismatches with citations on both sides. No edits.

## Scripts

- `pdf-to-md.mjs <pdf> <edition> <doc>`: converts one PDF into
  `references/<edition>/<doc>.md`, split by heading with stable anchors so
  citations survive a re-run. Re-runnable when a new FAQ version replaces an
  old one.
- `sync-wahapedia.mjs <edition>`: fetches the Wahapedia CSV export for that
  edition into `data/<edition>/`. Fetches are rate-limited; the skill credits
  Wahapedia as the data source. If an edition's export is unavailable, the
  script exits with a clear message and writes nothing.

## Risks

- **Source availability is unverified.** 10th edition PDFs and Wahapedia 10th
  data may no longer be downloadable. The first implementation step is a
  source check; each edition folder holds only what can be obtained.
- **Wahapedia is fan data.** It can lag behind releases and has no official
  errata text. It supplies datasheets and stratagems only, never the
  authority on core rules.
- **PDF conversion quality.** Tables and sidebars may convert badly. The
  script's output is reviewed by eye for the core rules before it is trusted.
- **11th edition vs. the app.** The skill may report that the 10th-based
  calculator differs from 11th. That is a finding, not a task; no app change
  is part of this work.

## Out of scope

- Changing the app, its sync scripts, or `armies/` data.
- A database, search index or MCP server.
- Automatic updates; refreshing sources is a manual re-run.
- Translating the skill's output to Ukrainian.

## Testing

- `pdf-to-md.mjs`: unit test on a small fixture PDF checking that sections
  and anchors are produced and that a re-run is stable.
- `sync-wahapedia.mjs`: test the CSV-to-file step against a saved sample; the
  network fetch is not tested.
- Skill behaviour: a short set of fixed questions (one per job, one in each
  edition, one the sources cannot answer) is run after the sources are in
  place, and the answers are checked for edition label, citation and the
  "not in sources" case.
