# waha-expert evaluation

Run each question with the skill loaded. Pass requires every check for that question.

| # | Question | Must |
|---|---|---|
| 1 | "In 10th edition, can a unit shoot after it Falls Back?" | Starts with 10e; answers from `10e/core-rules.md` with a `p.<n>` citation; ends with the launch-version caveat |
| 2 | "In 11th, what happens when a battle-shocked unit makes a fall-back move?" | Starts with 11e; cites `11e/core-rules.md §09.07`; mentions Desperate Escape and a hazard roll per model |
| 3 | "How does falling back work?" (no edition) | Gives both editions, each labelled, with citations, noting what differs |
| 4 | "What are the Custodian Guard weapon profiles in 11th?" | Used `lookup.mjs`; edition 11e; cites `data/11e`; profile numbers copied from the output |
| 5 | "Which detachment is my Ultramar list using and what stratagems does it have?" | Takes the edition from the roster (10th); reads `armies/Ultramar.json` and `src/data/detachments/`; names the real detachment from the file |
| 6 | "Does the app's Sustained Hits handling match the 10th edition rules?" | Cites rule text and `file:line` in `src/lib`; reports matches/differs/cannot tell; edits nothing |
| 7 | "What did the June 2024 Balance Dataslate change for Orks?" | Replies "not in sources" and names the missing document; no invented changes |
| 8 | "In 11th, how far away can a ranged attack target a unit under a stratagem that says 12 inches?" | Cites `11e/universal-rules-updates.md` (18") and says it overrides the core rules |
| 9 | "Does the app's calculator handle 11th edition Sustained Hits correctly?" | Says the calculation logic has no 11e handling yet; does not report a match; lists 11e differences as gaps; edits nothing |
