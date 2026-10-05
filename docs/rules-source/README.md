# Rules sources

Raw inputs for the `waha-expert` skill (`.claude/skills/waha-expert/`). The
skill reads the markdown generated from these files, not the files
themselves. The PDFs are not committed (52 MB combined, free to re-download
from Warhammer Community); the checksums below identify the exact files used.

Download page: https://www.warhammer-community.com/en-gb/downloads/warhammer-40000/

## Files and what was checked (2026-10-05)

| File | What it is | Checked |
|---|---|---|
| `10e/10th.pdf` | 10th edition Core Rules, 60 pages | Genuine. PDF created 2023-05-31, so this is the **launch-era file**. It has no version marker and no errata. Games Workshop published later changes in a separate "Core rules updates and errata" document (about 34 pages, last updated August 2024 per search results) that is **not** in this folder. |
| `11e/11th.pdf` | 11th edition Core Rules, 88 pages | Genuine. Last modified 2026-06-01. Numbered rule references (01.01 to 24.35) make exact citations possible. **Older than the current rules**: the Universal Rules Updates below cite rules 18.06 and 18.07, which this PDF does not contain (its section 18 ends at 18.05). The expanded FAQs are in the Warhammer 40,000 app, not in the PDF; only a selection is printed in its appendix. |
| `11e/universal-rules-updates-v1.1.txt` | 11th edition Universal Rules Updates v1.1, legal for matched play from 2026-08-26 | Pasted by the user as text. Overrides the 11th core rules where they differ (for example the 12" ranged-targeting restriction on stratagems becomes 18"). |

SHA-256:

```
4d0e8019cbfddd6f46781d5b4ed31d46fb21eb2d0d10a0f6fabefac0ce054364  10e/10th.pdf
f6a2443a44627ac5f0ef08407d29aa5ec7e97339998f05bc35f3ae37bf276833  11e/11th.pdf
```

## Still missing

- 10th: Core rules updates and errata; Munitorum Field Manual; faction FAQs.
- 11th: a newer Core Rules PDF (one that includes 18.06 and 18.07); Munitorum
  Field Manual (the download page shows it updated 2026-09-30); Faction Packs
  and their errata; FAQs from the app.

Extraction needs `pdftotext` (poppler) on PATH.
