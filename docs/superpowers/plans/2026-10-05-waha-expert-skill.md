# waha-expert skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `.claude/skills/waha-expert/`, a skill that answers Warhammer 40,000 rules questions (10th and 11th edition) from cited local sources, checks the app's calculator against the rules, and advises on the rosters in `armies/`.

**Architecture:** Core rules and rules updates become markdown under `references/<edition>/`, split into citable sections (11e by printed rule number, 10e by PDF page). Wahapedia's CSV export is synced into `data/<edition>/` and read through a `lookup.mjs` CLI that prints unit, stratagem and detachment cards. `SKILL.md` tells Claude how to search, cite and say "not in sources". Pure logic lives in `scripts/lib/` with vitest tests; the CLIs are thin wrappers.

**Tech Stack:** Node 20 ESM (`.mjs`), vitest (already in the repo), `pdftotext` from poppler, Wahapedia CSV export.

**Spec:** `docs/superpowers/specs/2026-10-05-waha-expert-skill-design.md`. Source intake and checks: `docs/rules-source/README.md`.

## Global Constraints

- Editions are named `10e` and `11e` everywhere (folders, labels, citations).
- Citation format: 11e `11e/core-rules.md §09.07`; 10e `10e/core-rules.md p.20`; data `data/11e` plus the unit or stratagem name.
- Source order when sources conflict: rules updates/errata/FAQ, then core rules, then datasheet data. A conflict is stated, not smoothed over.
- Every answer states its edition. Questions about the user's armies default to 10e (the edition of `armies/`); other questions are answered for both editions when they differ.
- The skill never fills a gap from memory: no match means "not in sources".
- Network access happens only in `sync-wahapedia.mjs`, with a 1-second delay between requests, and writes nothing if any file fails validation. Wahapedia is credited ("powered by Wahapedia").
- No change to app code, existing sync scripts or `armies/`. The working tree contains unrelated in-progress edits (`src/`, `scripts/`, `armies/ZZ-test-11e.json`, edition files); never `git add -A` or `git add .`, add files by explicit path.
- Source PDFs are not committed (`.gitignore` already excludes `docs/rules-source/**/*.pdf`).
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Run commands from the repo root `C:\anzi\waha_assist` in Git Bash.

## Review Focus

- `pdftotext` is missing from PATH: expect a clear "pdftotext not found, install poppler" message, not a stack trace. (Task 1 test.)
- A Wahapedia URL returns an HTML error page or an empty file with HTTP 200: expect the sync to abort and write nothing. (Task 4 tests.)
- A description that contains a literal `|` or a wrapped line: expect wrapped lines joined, over-long lines counted as malformed and reported, never silently misaligned. (Task 4 tests.)
- A lookup query that matches nothing, or matches dozens of units: expect a "no match" line, or at most 6 cards plus a "(N more matches: ...)" list. (Task 5 tests.)
- A unit with no abilities, no keywords, no points or no leader data: expect a clean card without "undefined" or empty headings. (Task 5 tests.)
- Re-running `pdf-to-md.mjs` on the same PDF: expect byte-identical output, so diffs show only real changes. (Task 1 test; Task 2 Step 4 checks it on the real PDF.)

---

### Task 1: Section-splitting library

**Files:**
- Create: `.claude/skills/waha-expert/scripts/lib/sections.mjs`
- Create: `.claude/skills/waha-expert/scripts/lib/pdf.mjs`
- Test: `.claude/skills/waha-expert/scripts/lib/sections.test.mjs`

**Interfaces:**
- Produces:
  - `splitPages(text: string): string[]` splits pdftotext output on form feed and drops an empty trailing page.
  - `splitByReference(pages: string[]): Section[]` where `Section = { id: string, title: string, page: number, body: string }`; ids are printed references like `"09.07"`, text before the first one is `{ id: "front", title: "Front matter" }`, a repeated reference gets `-2`, `-3`.
  - `splitByPage(pages: string[]): Section[]` with ids `p1`, `p2`, ... and titles `Page 1`, ...
  - `toMarkdown({ edition, doc, source, mode, sections }): string` where `mode` is `"ref"` or `"page"`.
  - `runPdftotext(pdf: string, bin?: string): string` throws an `Error` whose message contains `pdftotext not found` when the binary is missing.

- [ ] **Step 1: Write the failing tests**

```js
// .claude/skills/waha-expert/scripts/lib/sections.test.mjs
import { describe, expect, it } from "vitest";
import { splitPages, splitByReference, splitByPage, toMarkdown } from "./sections.mjs";
import { runPdftotext } from "./pdf.mjs";

describe("splitPages", () => {
  it("splits on form feed and drops the empty tail", () => {
    expect(splitPages("a\fb\f")).toEqual(["a", "b"]);
  });
});

describe("splitByReference", () => {
  const pages = [
    "intro line\nFALL-BACK MOVE 09.07\nMAXIMUM DISTANCE: M\n",
    "1. HIT ROLLS 05.01\nRoll a D6\nHEROIC INTERVENTION 15.11\nfirst\nHEROIC INTERVENTION 15.11\nsecond\nSee also\nFlying Models 21.03",
  ];
  const sections = splitByReference(pages);

  it("finds each printed reference, including ones with a numbered prefix", () => {
    expect(sections.map((s) => s.id)).toEqual(["front", "09.07", "05.01", "15.11", "15.11-2"]);
    expect(sections[2].title).toBe("1. HIT ROLLS");
  });

  it("keeps body text and records the page", () => {
    expect(sections[0].body).toBe("intro line");
    expect(sections[1]).toMatchObject({ title: "FALL-BACK MOVE", page: 1, body: "MAXIMUM DISTANCE: M" });
    expect(sections[2].page).toBe(2);
  });

  it("does not treat mixed-case cross references as headings", () => {
    expect(sections[4].body).toBe("second\nSee also\nFlying Models 21.03");
  });

  it("returns no front section when the text starts with a heading", () => {
    expect(splitByReference(["DICE 01.05\nroll"]).map((s) => s.id)).toEqual(["01.05"]);
  });
});

describe("splitByPage", () => {
  it("makes one section per page and collapses blank runs", () => {
    expect(splitByPage(["x   \n\n\n\ny ", "z"])).toEqual([
      { id: "p1", title: "Page 1", page: 1, body: "x\n\ny" },
      { id: "p2", title: "Page 2", page: 2, body: "z" },
    ]);
  });
});

describe("toMarkdown", () => {
  const ref = { edition: "11e", doc: "core-rules", source: "11th.pdf", mode: "ref" };
  const sections = [{ id: "09.07", title: "FALL-BACK MOVE", page: 33, body: "text" }];

  it("labels reference sections with their printed number", () => {
    const md = toMarkdown({ ...ref, sections });
    expect(md).toContain("## FALL-BACK MOVE (§09.07)");
    expect(md).toContain("<!-- id: 09.07, pdf page 33 -->");
  });

  it("labels page sections by page", () => {
    const md = toMarkdown({ edition: "10e", doc: "core-rules", source: "10th.pdf", mode: "page", sections: [{ id: "p20", title: "Page 20", page: 20, body: "b" }] });
    expect(md).toContain("## Page 20");
    expect(md).toContain("Cite as `p.<page>`");
  });

  it("is deterministic so re-runs produce identical files", () => {
    expect(toMarkdown({ ...ref, sections })).toBe(toMarkdown({ ...ref, sections }));
  });
});

describe("runPdftotext", () => {
  it("explains a missing binary instead of throwing a raw spawn error", () => {
    expect(() => runPdftotext("x.pdf", "no-such-binary-xyz")).toThrow(/pdftotext not found/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run .claude/skills/waha-expert/scripts/lib/sections.test.mjs`
Expected: FAIL, "Failed to resolve import ./sections.mjs". If vitest reports "No test files found", the `.claude` folder is being excluded: add `include: ["**/*.test.{ts,tsx,mjs}"]` and `exclude: ["node_modules/**", "dist/**"]` under `test:` in `vitest.config.ts`, then re-run and expect the import failure.

- [ ] **Step 3: Write the implementation**

```js
// .claude/skills/waha-expert/scripts/lib/sections.mjs
// Pure helpers that turn pdftotext output into citable markdown sections.

const REF_HEADING = /^((?:\d+\.\s+)?[A-Z][A-Z0-9 ,'/&()-]*?)\s+(\d{2}\.\d{2})$/;

// pdftotext separates pages with a form feed.
export function splitPages(text) {
  const pages = text.split("\f");
  if (pages.length > 1 && pages[pages.length - 1].trim() === "") pages.pop();
  return pages;
}

function tidy(lines) {
  return lines
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 11th edition: every rule has a printed reference such as "FALL-BACK MOVE 09.07".
// Text before the first reference is returned as { id: "front", title: "Front matter" }.
// A reference printed twice (a stratagem card shown twice) gets a "-2" suffix.
export function splitByReference(pages) {
  const sections = [];
  const seen = new Map();
  let current = { id: "front", title: "Front matter", page: 1, lines: [] };
  pages.forEach((page, i) => {
    for (const line of page.split("\n")) {
      const m = REF_HEADING.exec(line.trim());
      if (m) {
        sections.push(current);
        const n = (seen.get(m[2]) ?? 0) + 1;
        seen.set(m[2], n);
        current = { id: n === 1 ? m[2] : `${m[2]}-${n}`, title: m[1].trim(), page: i + 1, lines: [] };
      } else {
        current.lines.push(line);
      }
    }
  });
  sections.push(current);
  return sections
    .map((s) => ({ id: s.id, title: s.title, page: s.page, body: tidy(s.lines) }))
    .filter((s) => s.body !== "" || s.id !== "front");
}

// 10th edition: the printed rules carry no reference numbers, so a page is the unit.
export function splitByPage(pages) {
  return pages.map((p, i) => ({
    id: `p${i + 1}`,
    title: `Page ${i + 1}`,
    page: i + 1,
    body: tidy(p.split("\n")),
  }));
}

export function toMarkdown({ edition, doc, source, mode, sections }) {
  const head = [
    `<!-- generated by pdf-to-md.mjs from ${source}; do not edit by hand -->`,
    `# ${edition} ${doc}`,
    "",
    mode === "ref"
      ? "Cite as `§<reference>` (the printed rule number, e.g. §09.07)."
      : "Cite as `p.<page>` (PDF page number; the printed rules have no reference numbers).",
    "",
  ];
  const body = sections.map((s) => {
    const label = mode === "ref" && s.id !== "front" ? `${s.title} (§${s.id})` : s.title;
    return `## ${label}\n<!-- id: ${s.id}, pdf page ${s.page} -->\n\n${s.body}\n`;
  });
  return [...head, ...body].join("\n");
}
```

```js
// .claude/skills/waha-expert/scripts/lib/pdf.mjs
import { execFileSync } from "node:child_process";

// Plain pdftotext output (not -layout) keeps multi-column pages in reading order.
export function runPdftotext(pdf, bin = "pdftotext") {
  try {
    return execFileSync(bin, [pdf, "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`pdftotext not found (looked for "${bin}"). Install poppler and make sure pdftotext is on PATH.`);
    }
    throw err;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run .claude/skills/waha-expert/scripts/lib/sections.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/waha-expert/scripts/lib/sections.mjs .claude/skills/waha-expert/scripts/lib/pdf.mjs .claude/skills/waha-expert/scripts/lib/sections.test.mjs
git commit -m "Add section-splitting helpers for the waha-expert skill" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(If `vitest.config.ts` was changed in Step 2, add it to the same commit by path.)

---

### Task 2: PDF-to-markdown CLI and the two core-rules references

**Files:**
- Create: `.claude/skills/waha-expert/scripts/pdf-to-md.mjs`
- Create (generated): `.claude/skills/waha-expert/references/11e/core-rules.md`
- Create (generated): `.claude/skills/waha-expert/references/10e/core-rules.md`

**Interfaces:**
- Consumes: `splitPages`, `splitByReference`, `splitByPage`, `toMarkdown` from `./lib/sections.mjs`; `runPdftotext` from `./lib/pdf.mjs` (Task 1).
- Produces: CLI `node .claude/skills/waha-expert/scripts/pdf-to-md.mjs <pdf> <10e|11e> <doc-name> [--by=ref|page]`. Default split: `ref` for 11e, `page` for 10e. Writes `references/<edition>/<doc-name>.md`.

- [ ] **Step 1: Write the CLI**

```js
// .claude/skills/waha-expert/scripts/pdf-to-md.mjs
// Convert a rules PDF into markdown sections the waha-expert skill can cite.
//
//   node pdf-to-md.mjs <pdf> <10e|11e> <doc-name> [--by=ref|page]
//
// 11e PDFs print a rule number on every heading, so they split by reference
// (--by=ref). 10e PDFs do not, so they split by page (--by=page).

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPdftotext } from "./lib/pdf.mjs";
import { splitPages, splitByReference, splitByPage, toMarkdown } from "./lib/sections.mjs";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const [pdf, edition, doc] = args.filter((a) => !a.startsWith("--"));
const by = args.find((a) => a.startsWith("--by="))?.slice(5);

if (!pdf || !["10e", "11e"].includes(edition) || !doc || (by && !["ref", "page"].includes(by))) {
  console.error("usage: node pdf-to-md.mjs <pdf> <10e|11e> <doc-name> [--by=ref|page]");
  process.exit(2);
}

const mode = by ?? (edition === "11e" ? "ref" : "page");
const pages = splitPages(runPdftotext(pdf));
const sections = mode === "ref" ? splitByReference(pages) : splitByPage(pages);
const md = toMarkdown({ edition, doc, source: path.basename(pdf), mode, sections });

const out = path.join(SKILL, "references", edition, `${doc}.md`);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, md);
console.log(`${path.relative(process.cwd(), out)}: ${sections.length} sections from ${pages.length} pages`);
```

- [ ] **Step 2: Generate both references**

Run:
```bash
node .claude/skills/waha-expert/scripts/pdf-to-md.mjs docs/rules-source/11e/11th.pdf 11e core-rules
node .claude/skills/waha-expert/scripts/pdf-to-md.mjs docs/rules-source/10e/10th.pdf 10e core-rules
```
Expected: `11e/core-rules.md: 158 sections from 88 pages` and `10e/core-rules.md: 60 sections from 60 pages`.

- [ ] **Step 3: Verify the output by eye (the spec requires this for core rules)**

Run each and compare against the PDF text:
```bash
grep -n "^## FALL-BACK MOVE" .claude/skills/waha-expert/references/11e/core-rules.md
awk '/^## FALL-BACK MOVE/{f=1;print;next} /^## /{f=0} f' .claude/skills/waha-expert/references/11e/core-rules.md
grep -c "^## " .claude/skills/waha-expert/references/11e/core-rules.md
grep -n "^## .*(§15.11" .claude/skills/waha-expert/references/11e/core-rules.md
grep -n "Fall Back" .claude/skills/waha-expert/references/10e/core-rules.md | head
```
Expected: `FALL-BACK MOVE (§09.07)` shows "Ordered Retreat" and "Desperate Escape" modes with a hazard roll per model; the heading count is exactly 158; `15.11` and `15.11-2` both present, the `-2` copy being the clean text on PDF page 57; the 10e file mentions Fall Back on the movement pages. If a section looks garbled, record it in the skill's coverage note (Task 6) rather than editing generated files.

- [ ] **Step 4: Re-run to confirm idempotence**

Run:
```bash
cp .claude/skills/waha-expert/references/11e/core-rules.md /tmp/before.md
node .claude/skills/waha-expert/scripts/pdf-to-md.mjs docs/rules-source/11e/11th.pdf 11e core-rules
diff /tmp/before.md .claude/skills/waha-expert/references/11e/core-rules.md && echo IDENTICAL
```
Expected: `IDENTICAL`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/waha-expert/scripts/pdf-to-md.mjs .claude/skills/waha-expert/references
git commit -m "Add pdf-to-md and generate 10e and 11e core rules references" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Hand-supplied 11e rules updates reference

The Universal Rules Updates v1.1 were supplied by the user as text (`docs/rules-source/11e/universal-rules-updates-v1.1.txt`), so they are formatted by hand, not by `pdf-to-md`.

**Files:**
- Create: `.claude/skills/waha-expert/references/11e/universal-rules-updates.md`

- [ ] **Step 1: Write the file with exactly this content**

```markdown
<!-- hand-formatted from docs/rules-source/11e/universal-rules-updates-v1.1.txt (supplied by the user as text) -->
# 11e universal-rules-updates

Universal Rules Updates, version 1.1. Legal for matched play from 26 August 2026.
These updates have a broader scope than the Faction Packs and **override the 11e core rules** where they differ.
Cite as `11e/universal-rules-updates.md` plus the section title.

## Modifying a stratagem's CP cost

Rules that enable you to target a friendly unit with a stratagem for 0CP, but that do not specify the name of the stratagem, instead reduce the CP cost of that use of that stratagem by 1CP.

## Stratagems that can be used more than once per phase/turn

Parts of a rule that allow a player to use a stratagem even if they have already targeted another unit with that stratagem in the same phase can only be used if the name of the stratagem is specified in that rule. Similarly, if a stratagem is limited to one use per player per turn, per battle round or per battle, such parts of that rule can only be used if the name of the stratagem is specified in that rule.

## Stratagems that prevent units from being targeted

If a stratagem has an effect that says the target unit 'can only be selected as the target of a ranged attack if the attacking model is within 12"', or 'cannot be targeted by ranged attacks unless the attacking model is within 12"', that effect is changed to say 'can only be selected as the target of a ranged attack if the attacking model is within 18".'

## Stratagems that add new units to your army

If a stratagem has the effect of adding 'a new unit to your army that is identical to your destroyed unit', add the following Restriction to that stratagem: 'RESTRICTIONS: You can only use this stratagem once per battle.'

## Move types for disembarking units

- If a rule allows a unit to be eligible to declare a charge after disembarking from a TRANSPORT model that made a normal move that turn, that unit makes an assault disembark move (18.06) for that disembarkation (instead of a disembark move).
- If a rule allows a unit to disembark from a TRANSPORT model that made an advance move that turn, that unit makes a shock disembark move (18.07) for that disembarkation (instead of a disembark move).

Note: the 11e core rules reference file in this skill ends section 18 at 18.05, so rules 18.06 and 18.07 are cited here but not available in the core rules text.
```

- [ ] **Step 2: Check it against the source text**

Run: `grep -c "" docs/rules-source/11e/universal-rules-updates-v1.1.txt` and read both files side by side. Expected: the five rules updates match the source wording, apart from straight quotes in place of curly quotes.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/waha-expert/references/11e/universal-rules-updates.md
git commit -m "Add the 11e universal rules updates reference" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Wahapedia parser and sync script

**Files:**
- Create: `.claude/skills/waha-expert/scripts/lib/wahapedia.mjs`
- Test: `.claude/skills/waha-expert/scripts/lib/wahapedia.test.mjs`
- Create: `.claude/skills/waha-expert/scripts/sync-wahapedia.mjs`
- Create (generated): `.claude/skills/waha-expert/data/10e/*.csv`, `data/11e/*.csv`, `data/<edition>/SOURCE.txt`

**Interfaces:**
- Produces:
  - `parseCsv(text: string): { headers: string[], rows: Record<string,string>[], bad: number[] }`. Handles a BOM, a trailing `|` on every line, records wrapped over several lines; `bad` lists 1-based line numbers of lines with too many fields (they are skipped).
  - `htmlToText(html: string): string` turns `<br>` and `<li>` into newlines and `- `, strips tags, decodes `&amp; &lt; &gt; &quot; &#39; &nbsp;`.
  - `validateTable(name: string, text: string): string | null` returns a problem description, or `null` when the file is usable.
  - CLI `node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs <10e|11e> [--dry-run]`.

- [ ] **Step 1: Write the failing tests**

```js
// .claude/skills/waha-expert/scripts/lib/wahapedia.test.mjs
import { describe, expect, it } from "vitest";
import { parseCsv, htmlToText, validateTable } from "./wahapedia.mjs";

describe("parseCsv", () => {
  it("strips the BOM and the trailing pipe, keying rows by header", () => {
    const { headers, rows, bad } = parseCsv("\uFEFFid|name|\n1|Synapse|\n2|Other|\n");
    expect(headers).toEqual(["id", "name"]);
    expect(rows).toEqual([{ id: "1", name: "Synapse" }, { id: "2", name: "Other" }]);
    expect(bad).toEqual([]);
  });

  it("joins a record that wraps onto the next line", () => {
    const { rows } = parseCsv("id|text|\n1|line one\nline two|\n");
    expect(rows).toEqual([{ id: "1", text: "line one\nline two" }]);
  });

  it("reports lines with too many fields instead of misaligning them", () => {
    const { rows, bad } = parseCsv("id|text|\n1|ok|\n2|a|b|c|\n");
    expect(rows).toHaveLength(1);
    expect(bad).toEqual([3]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a|b|c|\n1||3|\n").rows[0]).toEqual({ a: "1", b: "", c: "3" });
  });
});

describe("htmlToText", () => {
  it("turns breaks and lists into text and decodes entities", () => {
    expect(htmlToText('If <span class="kwb">TYRANIDS</span> &amp; more<br>next')).toBe("If TYRANIDS & more\nnext");
    expect(htmlToText("<b>WHEN:</b> x<br><br><b>EFFECT:</b> y<ul><li>one</li><li>two</li></ul>")).toBe(
      "WHEN: x\n\nEFFECT: y\n- one\n- two",
    );
  });
});

describe("validateTable", () => {
  it("accepts a normal table", () => {
    expect(validateTable("Datasheets", "id|name|\n1|a|\n")).toBeNull();
  });

  it("rejects an HTML error page served with HTTP 200", () => {
    expect(validateTable("Datasheets", "<!DOCTYPE html><html>Not found</html>")).toMatch(/HTML page/);
  });

  it("rejects an empty file and a header-only file", () => {
    expect(validateTable("Datasheets", "")).toMatch(/no header row/);
    expect(validateTable("Datasheets", "id|name|\n")).toMatch(/no data rows/);
  });

  it("rejects a table where more than 0.5% of lines are malformed", () => {
    const rows = Array.from({ length: 50 }, (_, i) => `${i}|ok|`).join("\n");
    expect(validateTable("T", `id|t|\n${rows}\n99|a|b|c|\n`)).toMatch(/malformed/);
  });

  it("tolerates a single malformed line in a large table", () => {
    const rows = Array.from({ length: 400 }, (_, i) => `${i}|ok|`).join("\n");
    expect(validateTable("T", `id|t|\n${rows}\n99|a|b|c|\n`)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run .claude/skills/waha-expert/scripts/lib/wahapedia.test.mjs`
Expected: FAIL, cannot resolve `./wahapedia.mjs`.

- [ ] **Step 3: Write the library**

```js
// .claude/skills/waha-expert/scripts/lib/wahapedia.mjs
// Parsing helpers for Wahapedia's pipe-delimited CSV export.

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

// Export files start with a BOM and every line ends with a trailing "|".
// A record whose text wraps onto further lines is joined until it has all its fields.
export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headers = lines[0].split("|").slice(0, -1);
  const rows = [];
  const bad = [];
  let pending = "";
  for (let i = 1; i < lines.length; i++) {
    const line = pending ? `${pending}\n${lines[i]}` : lines[i];
    if (line.trim() === "") continue;
    const parts = line.split("|");
    if (parts.length - 1 < headers.length) {
      pending = line;
      continue;
    }
    pending = "";
    if (parts.length - 1 > headers.length) {
      bad.push(i + 1);
      continue;
    }
    const row = {};
    headers.forEach((h, c) => (row[h] = parts[c]));
    rows.push(row);
  }
  return { headers, rows, bad };
}

export function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|ul|ol|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITIES[e])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Returns a problem description, or null when the table is usable.
export function validateTable(name, text) {
  if (/^\s*<(!doctype|html)/i.test(text)) return `${name}: got an HTML page, not CSV`;
  const { headers, rows, bad } = parseCsv(text);
  if (headers.length === 0) return `${name}: no header row`;
  if (rows.length === 0) return `${name}: no data rows`;
  if (bad.length > rows.length * 0.005) return `${name}: ${bad.length} malformed line(s), first at line ${bad[0]}`;
  return null;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run .claude/skills/waha-expert/scripts/lib/wahapedia.test.mjs`
Expected: PASS.

- [ ] **Step 5: Write the sync script**

```js
// .claude/skills/waha-expert/scripts/sync-wahapedia.mjs
// Download Wahapedia's CSV export for one edition into data/<edition>/.
//
//   node sync-wahapedia.mjs <10e|11e> [--dry-run]
//
// Every file is fetched and validated before anything is written, so a bad
// response leaves the existing data untouched. Requests are one second apart.
// Data is from Wahapedia (wahapedia.ru), "powered by Wahapedia".

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, validateTable } from "./lib/wahapedia.mjs";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITES = { "10e": "wh40k10ed", "11e": "wh40k11ed" };
const TABLES = [
  "Datasheets",
  "Datasheets_abilities",
  "Datasheets_models",
  "Datasheets_wargear",
  "Datasheets_keywords",
  "Datasheets_leader",
  "Datasheets_models_cost",
  "Abilities",
  "Stratagems",
  "Detachments",
  "Detachment_abilities",
  "Enhancements",
  "Factions",
  "Last_update",
];
const DELAY_MS = 1000;

const args = process.argv.slice(2);
const edition = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
if (!SITES[edition]) {
  console.error("usage: node sync-wahapedia.mjs <10e|11e> [--dry-run]");
  process.exit(2);
}

function fail(message) {
  console.error(`sync aborted, nothing written: ${message}`);
  process.exit(1);
}

const base = `https://wahapedia.ru/${SITES[edition]}`;
const fetched = {};
for (const name of TABLES) {
  const url = `${base}/${name}.csv`;
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": "waha-assist rules sync (personal tool)" } });
  } catch (err) {
    fail(`${url}: ${err.message}`);
  }
  if (!res.ok) fail(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  const problem = validateTable(name, text);
  if (problem) fail(problem);
  const { rows, bad } = parseCsv(text);
  fetched[name] = text;
  console.log(`${name}: ${rows.length} rows${bad.length ? `, ${bad.length} malformed line(s) skipped (lines ${bad.join(", ")})` : ""}`);
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

if (dryRun) {
  console.log("dry run: nothing written");
  process.exit(0);
}

const outDir = path.join(SKILL, "data", edition);
mkdirSync(outDir, { recursive: true });
for (const [name, text] of Object.entries(fetched)) writeFileSync(path.join(outDir, `${name}.csv`), text);
const lastUpdate = parseCsv(fetched.Last_update).rows[0].last_update;
writeFileSync(
  path.join(outDir, "SOURCE.txt"),
  `powered by Wahapedia (${base}/)\nWahapedia last_update: ${lastUpdate}\nfetched: ${new Date().toISOString().slice(0, 10)}\n`,
);
console.log(`wrote ${Object.keys(fetched).length} files to ${path.relative(process.cwd(), outDir)}`);
```

- [ ] **Step 6: Dry run both editions (this downloads from wahapedia.ru, the source you approved; ask the user to confirm before running)**

Run:
```bash
node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs 10e --dry-run
node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs 11e --dry-run
```
Expected: each prints 14 `<Name>: N rows` lines then `dry run: nothing written`. Any `malformed line(s) skipped` note is fine below the 0.5% limit; record how many in the commit message. If a run aborts with `HTTP 404` for one table, remove that name from `TABLES`, add a sentence to the coverage note in Task 6, and re-run.

- [ ] **Step 7: Real run, then size check**

Run:
```bash
node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs 10e
node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs 11e
du -sh .claude/skills/waha-expert/data
cat .claude/skills/waha-expert/data/10e/SOURCE.txt .claude/skills/waha-expert/data/11e/SOURCE.txt
```
Expected: SOURCE.txt shows `last_update: 2026-06-13` for 10e and a date on or after 2026-09-28 for 11e. If `du` reports 15 MB or less, commit the data. If more, append `.claude/skills/waha-expert/data/` to `.gitignore` instead and, in Task 6, change the SKILL.md data line to say the data must be fetched with the sync script on a fresh clone.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/waha-expert/scripts/lib/wahapedia.mjs .claude/skills/waha-expert/scripts/lib/wahapedia.test.mjs .claude/skills/waha-expert/scripts/sync-wahapedia.mjs .claude/skills/waha-expert/data
git commit -m "Add the Wahapedia sync script and 10e/11e data" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(If the data folder was gitignored in Step 7, add `.gitignore` and omit `data`.)

---

### Task 5: Lookup cards and CLI

**Files:**
- Create: `.claude/skills/waha-expert/scripts/lib/cards.mjs`
- Test: `.claude/skills/waha-expert/scripts/lib/cards.test.mjs`
- Create: `.claude/skills/waha-expert/scripts/lookup.mjs`

**Interfaces:**
- Consumes: `parseCsv`, `htmlToText` from `./wahapedia.mjs` (Task 4); tables are arrays of row objects keyed by CSV header.
- Produces:
  - `findByName(rows, query, key = "name")`: exact case-insensitive match first, else substring matches.
  - `unitCard(t, sheet)`, `stratagemCard(s)`, `detachmentCard(t, d)`: return strings.
  - `lookup(t, kind, query, max = 6)` where `kind` is `"unit" | "stratagem" | "detachment"`: returns up to `max` cards joined by `---`, a `No <kind> matching "<query>" in the data.` line when nothing matches, and a `(N more matches: a, b)` line when there are more.
  - CLI `node .claude/skills/waha-expert/scripts/lookup.mjs <10e|11e> <unit|stratagem|detachment> <name...>`.
  - Table names in `t`: `Datasheets, Datasheets_models, Datasheets_wargear, Datasheets_abilities, Datasheets_keywords, Datasheets_leader, Datasheets_models_cost, Abilities, Factions, Stratagems, Detachments, Detachment_abilities, Enhancements`.

- [ ] **Step 1: Write the failing tests**

```js
// .claude/skills/waha-expert/scripts/lib/cards.test.mjs
import { describe, expect, it } from "vitest";
import { findByName, unitCard, stratagemCard, detachmentCard, lookup } from "./cards.mjs";

const t = {
  Factions: [{ id: "AC", name: "Adeptus Custodes" }],
  Datasheets: [
    { id: "1", name: "Custodian Guard", faction_id: "AC", role: "Battleline", leader_head: "" },
    { id: "3", name: "Captain-General", faction_id: "AC", role: "Characters", leader_head: "" },
    { id: "9", name: "Bare Unit", faction_id: "AC", role: "", leader_head: "" },
  ],
  Datasheets_models: [
    { datasheet_id: "1", name: "Custodian Guard", M: '6"', T: "6", Sv: "2+", inv_sv: "4+", W: "3", Ld: "6+", OC: "2" },
  ],
  Datasheets_wargear: [
    { datasheet_id: "1", name: "Guardian spear", description: "assault, <b>anti-vehicle</b> 4+", range: "24", type: "Ranged", A: "2", BS_WS: "2", S: "4", AP: "-1", D: "2" },
    { datasheet_id: "1", name: "Guardian spear", description: "", range: "Melee", type: "Melee", A: "5", BS_WS: "2", S: "7", AP: "-2", D: "2" },
  ],
  Datasheets_abilities: [
    { datasheet_id: "1", ability_id: "10", name: "", description: "", type: "Core", parameter: "" },
    { datasheet_id: "1", ability_id: "", name: "Stand Vigil", description: "Each time...<br>second", type: "Datasheet", parameter: "" },
  ],
  Abilities: [{ id: "10", name: "Deep Strike", description: "Can be set up in reserve." }],
  Datasheets_keywords: [
    { datasheet_id: "1", keyword: "Infantry", model: "", is_faction_keyword: "false" },
    { datasheet_id: "1", keyword: "Adeptus Custodes", model: "", is_faction_keyword: "true" },
  ],
  Datasheets_leader: [{ leader_id: "3", attached_id: "1" }],
  Datasheets_models_cost: [
    { datasheet_id: "1", line: "1", description: "YOUR UNIT COSTS", cost: "" },
    { datasheet_id: "1", line: "2", description: "4 models", cost: "170" },
  ],
  Stratagems: [
    { id: "s1", name: "HEROIC INTERVENTION", type: "Core – Strategic Ploy Stratagem", cp_cost: "1", turn: "Opponent's turn", phase: "Charge phase", detachment: "", detachment_id: "", description: "<b>WHEN:</b> x<br><br><b>EFFECT:</b> y" },
    { id: "s2", name: "SHIELD WALL", type: "Shield Host – Battle Tactic Stratagem", cp_cost: "1", turn: "Either player's turn", phase: "Any phase", detachment: "Shield Host", detachment_id: "d1", description: "<b>WHEN:</b> z" },
  ],
  Detachments: [{ id: "d1", faction_id: "AC", name: "Shield Host", legend: "", dp: "2", force_disposition: "Purge the Foe" }],
  Detachment_abilities: [{ id: "a1", faction_id: "AC", name: "Martial Mastery", legend: "", description: "At the start of the battle round, pick one.", detachment: "Shield Host", detachment_id: "d1" }],
  Enhancements: [{ faction_id: "AC", id: "e1", name: "Panoptispex", cost: "25", detachment: "Shield Host", detachment_id: "d1", description: "<b>Bearer</b> can see." }],
};

describe("findByName", () => {
  it("prefers an exact match over substring matches", () => {
    const rows = [{ name: "Guard" }, { name: "Custodian Guard" }];
    expect(findByName(rows, "guard")).toEqual([{ name: "Guard" }]);
    expect(findByName(rows, "custodian").map((r) => r.name)).toEqual(["Custodian Guard"]);
  });
});

describe("unitCard", () => {
  const card = unitCard(t, t.Datasheets[0]);

  it("shows the header, keywords, profile and points", () => {
    expect(card).toContain("# Custodian Guard — Adeptus Custodes (Battleline)");
    expect(card).toContain("Keywords: Infantry, Adeptus Custodes");
    expect(card).toContain('Custodian Guard: M 6", T 6, Sv 2+, invuln 4+, W 3, Ld 6+, OC 2');
    expect(card).toContain("Points: 4 models 170");
  });

  it("shows ranged and melee weapons with their keywords", () => {
    expect(card).toContain('- Guardian spear 24": A 2, BS 2+, S 4, AP -1, D 2 [assault, anti-vehicle 4+]');
    expect(card).toContain("- Guardian spear: A 5, WS 2+, S 7, AP -2, D 2");
  });

  it("resolves shared abilities and keeps datasheet ones", () => {
    expect(card).toContain("- Core: Deep Strike — Can be set up in reserve.");
    expect(card).toContain("- Datasheet: Stand Vigil — Each time...\nsecond");
  });

  it("names the leaders that can attach", () => {
    expect(card).toContain("Can be led by: Captain-General");
  });

  it("lists what a leader can lead", () => {
    expect(unitCard(t, t.Datasheets[1])).toContain("Can lead: Custodian Guard");
  });

  it("leaves out sections a unit has no data for", () => {
    const bare = unitCard(t, t.Datasheets[2]);
    expect(bare).toBe("# Bare Unit — Adeptus Custodes");
    expect(bare).not.toMatch(/undefined|Abilities|Keywords|Points|weapons/);
  });
});

describe("stratagemCard", () => {
  it("shows cost, timing and cleaned text", () => {
    expect(stratagemCard(t.Stratagems[0])).toBe(
      "## HEROIC INTERVENTION — 1CP\nCore – Strategic Ploy Stratagem · Opponent's turn, Charge phase\nWHEN: x\n\nEFFECT: y",
    );
  });
});

describe("detachmentCard", () => {
  const card = detachmentCard(t, t.Detachments[0]);

  it("shows the detachment, its ability, stratagems and enhancements", () => {
    expect(card).toContain("# Shield Host — Adeptus Custodes (2 DP, force disposition: Purge the Foe)");
    expect(card).toContain("Martial Mastery");
    expect(card).toContain("At the start of the battle round, pick one.");
    expect(card).toContain("## SHIELD WALL — 1CP");
    expect(card).not.toContain("HEROIC INTERVENTION");
    expect(card).toContain("- Panoptispex (25pts): Bearer can see.");
  });
});

describe("lookup", () => {
  it("says so when nothing matches", () => {
    expect(lookup(t, "unit", "Zzz")).toBe('No unit matching "Zzz" in the data.');
  });

  it("caps the cards and lists the remaining matches", () => {
    const many = { ...t, Datasheets: Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, name: `Unit ${i + 1}`, faction_id: "AC", role: "", leader_head: "" })) };
    const out = lookup(many, "unit", "Unit", 6);
    expect(out.split("\n\n---\n\n")).toHaveLength(7); // six cards plus the "more matches" line
    expect(out).toContain("(2 more matches: Unit 7, Unit 8)");
  });

  it("finds a stratagem by name", () => {
    expect(lookup(t, "stratagem", "heroic")).toContain("HEROIC INTERVENTION — 1CP");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run .claude/skills/waha-expert/scripts/lib/cards.test.mjs`
Expected: FAIL, cannot resolve `./cards.mjs`.

- [ ] **Step 3: Write the implementation**

```js
// .claude/skills/waha-expert/scripts/lib/cards.mjs
// Readable text cards built from Wahapedia tables. `t` maps table name -> row objects.

import { htmlToText } from "./wahapedia.mjs";

const plus = (v) => (/^\d+$/.test(v) ? `${v}+` : v);
const norm = (s) => s.toLowerCase();

export function findByName(rows, query, key = "name") {
  const q = norm(query);
  const exact = rows.filter((r) => norm(r[key]) === q);
  return exact.length ? exact : rows.filter((r) => norm(r[key]).includes(q));
}

const factionName = (t, id) => t.Factions.find((f) => f.id === id)?.name ?? id;

export function unitCard(t, sheet) {
  const out = [`# ${sheet.name} — ${factionName(t, sheet.faction_id)}${sheet.role ? ` (${sheet.role})` : ""}`];

  const keywords = t.Datasheets_keywords.filter((k) => k.datasheet_id === sheet.id).map((k) => k.keyword);
  if (keywords.length) out.push(`Keywords: ${keywords.join(", ")}`);

  for (const m of t.Datasheets_models.filter((x) => x.datasheet_id === sheet.id)) {
    const inv = m.inv_sv ? `, invuln ${m.inv_sv}` : "";
    out.push(`${m.name}: M ${m.M}, T ${m.T}, Sv ${m.Sv}${inv}, W ${m.W}, Ld ${m.Ld}, OC ${m.OC}`);
  }

  const costs = t.Datasheets_models_cost.filter((c) => c.datasheet_id === sheet.id && c.cost);
  if (costs.length) out.push(`Points: ${costs.map((c) => `${c.description} ${c.cost}`).join("; ")}`);

  const weapons = t.Datasheets_wargear.filter((w) => w.datasheet_id === sheet.id);
  for (const type of ["Ranged", "Melee"]) {
    const list = weapons.filter((w) => w.type === type);
    if (!list.length) continue;
    out.push("", `${type} weapons`);
    for (const w of list) {
      const range = type === "Ranged" ? ` ${w.range}"` : "";
      const kw = w.description ? ` [${htmlToText(w.description)}]` : "";
      const skill = type === "Ranged" ? "BS" : "WS";
      out.push(`- ${w.name}${range}: A ${w.A}, ${skill} ${plus(w.BS_WS)}, S ${w.S}, AP ${w.AP}, D ${w.D}${kw}`);
    }
  }

  const abilities = t.Datasheets_abilities.filter((a) => a.datasheet_id === sheet.id);
  if (abilities.length) {
    out.push("", "Abilities");
    for (const a of abilities) {
      const shared = a.ability_id ? t.Abilities.find((x) => x.id === a.ability_id) : null;
      const name = a.name || shared?.name || "(unnamed)";
      const text = htmlToText(a.description || shared?.description || "");
      const param = a.parameter ? ` ${a.parameter}` : "";
      out.push(`- ${a.type ? `${a.type}: ` : ""}${name}${param}${text ? ` — ${text}` : ""}`);
    }
  }

  const nameOf = (id) => t.Datasheets.find((d) => d.id === id)?.name ?? id;
  const leads = t.Datasheets_leader.filter((l) => l.leader_id === sheet.id).map((l) => nameOf(l.attached_id));
  const ledBy = t.Datasheets_leader.filter((l) => l.attached_id === sheet.id).map((l) => nameOf(l.leader_id));
  if (leads.length || ledBy.length) out.push("");
  if (leads.length) out.push(`Can lead: ${leads.join(", ")}`);
  if (ledBy.length) out.push(`Can be led by: ${ledBy.join(", ")}`);

  return out.join("\n");
}

export function stratagemCard(s) {
  const timing = [s.turn, s.phase].filter(Boolean).join(", ");
  const meta = [s.type, timing].filter(Boolean).join(" · ");
  return [`## ${s.name} — ${s.cp_cost}CP`, meta, htmlToText(s.description)].join("\n");
}

export function detachmentCard(t, d) {
  const extra = [d.dp && `${d.dp} DP`, d.force_disposition && `force disposition: ${d.force_disposition}`].filter(Boolean);
  const out = [`# ${d.name} — ${factionName(t, d.faction_id)}${extra.length ? ` (${extra.join(", ")})` : ""}`];
  if (d.legend) out.push(htmlToText(d.legend));

  const abilities = t.Detachment_abilities.filter((a) => a.detachment_id === d.id);
  if (abilities.length) {
    out.push("", "Detachment rules");
    for (const a of abilities) out.push(`### ${a.name}`, htmlToText(a.description));
  }
  const strats = t.Stratagems.filter((s) => s.detachment_id === d.id);
  if (strats.length) out.push("", "Stratagems", ...strats.map(stratagemCard));
  const enhancements = t.Enhancements.filter((e) => e.detachment_id === d.id);
  if (enhancements.length) {
    out.push("", "Enhancements", ...enhancements.map((e) => `- ${e.name} (${e.cost}pts): ${htmlToText(e.description)}`));
  }
  return out.join("\n");
}

export function lookup(t, kind, query, max = 6) {
  const table = { unit: t.Datasheets, stratagem: t.Stratagems, detachment: t.Detachments }[kind];
  const hits = findByName(table, query);
  if (hits.length === 0) return `No ${kind} matching "${query}" in the data.`;
  const card = { unit: (r) => unitCard(t, r), stratagem: stratagemCard, detachment: (r) => detachmentCard(t, r) }[kind];
  const shown = hits.slice(0, max).map(card).join("\n\n---\n\n");
  if (hits.length <= max) return shown;
  const rest = hits.slice(max, max + 10).map((h) => h.name);
  const tail = hits.length > max + 10 ? ", ..." : "";
  return `${shown}\n\n---\n\n(${hits.length - max} more matches: ${rest.join(", ")}${tail})`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run .claude/skills/waha-expert/scripts/lib/cards.test.mjs`
Expected: PASS.

- [ ] **Step 5: Write the CLI**

```js
// .claude/skills/waha-expert/scripts/lookup.mjs
// Print readable cards from the synced Wahapedia data.
//
//   node lookup.mjs <10e|11e> <unit|stratagem|detachment> <name...>

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./lib/wahapedia.mjs";
import { lookup } from "./lib/cards.mjs";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEEDED = {
  unit: ["Datasheets", "Datasheets_models", "Datasheets_wargear", "Datasheets_abilities", "Datasheets_keywords", "Datasheets_leader", "Datasheets_models_cost", "Abilities", "Factions"],
  stratagem: ["Stratagems"],
  detachment: ["Detachments", "Detachment_abilities", "Stratagems", "Enhancements", "Factions"],
};

const [edition, kind, ...rest] = process.argv.slice(2);
const query = rest.join(" ").trim();
if (!["10e", "11e"].includes(edition) || !NEEDED[kind] || !query) {
  console.error("usage: node lookup.mjs <10e|11e> <unit|stratagem|detachment> <name...>");
  process.exit(2);
}

const t = {};
for (const name of NEEDED[kind]) {
  const file = path.join(SKILL, "data", edition, `${name}.csv`);
  if (!existsSync(file)) {
    console.error(`missing ${path.relative(process.cwd(), file)}; run: node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs ${edition}`);
    process.exit(1);
  }
  t[name] = parseCsv(readFileSync(file, "utf8")).rows;
}
console.log(lookup(t, kind, query));
```

- [ ] **Step 6: Smoke test against the real data**

Run:
```bash
node .claude/skills/waha-expert/scripts/lookup.mjs 11e unit "Custodian Guard"
node .claude/skills/waha-expert/scripts/lookup.mjs 10e stratagem "Heroic Intervention"
node .claude/skills/waha-expert/scripts/lookup.mjs 11e detachment "Shield Host"
node .claude/skills/waha-expert/scripts/lookup.mjs 10e unit "Zzzz"
```
Expected: a unit card with profile, weapons, abilities and points; a stratagem card with WHEN/TARGET/EFFECT text; a detachment card with rules, stratagems and enhancements; `No unit matching "Zzzz" in the data.` Check there is no `undefined`, no `<br>` and no HTML tags in any output.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/waha-expert/scripts/lib/cards.mjs .claude/skills/waha-expert/scripts/lib/cards.test.mjs .claude/skills/waha-expert/scripts/lookup.mjs
git commit -m "Add lookup cards for units, stratagems and detachments" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: SKILL.md, coverage note and evaluation

**Files:**
- Create: `.claude/skills/waha-expert/SKILL.md`
- Create: `.claude/skills/waha-expert/eval.md`

- [ ] **Step 1: Write SKILL.md**

````markdown
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
- **FAQs:** only the selection printed in the 11e PDF appendix (§24.xx). The full FAQs live in the Warhammer 40,000 app.
- **Not available:** Munitorum Field Manual rules (the Wahapedia points tables are used for unit costs instead), balance dataslates, faction pack errata.
- **Wahapedia is fan-compiled.** Datasheet and stratagem text may differ from the printed books; credit it ("powered by Wahapedia").

## How to answer

1. **Edition first.** Begin with the edition you are answering for. If the user does not say: questions about their own armies use 10e (what `armies/` is built on); other questions are answered for both editions when the rule differs, for one when it does not.
2. **Search, don't load.** Find the section, then read just that section:
   - `grep -n -i "<term>" .claude/skills/waha-expert/references/11e/*.md`
   - `awk '/^## FALL-BACK MOVE/{f=1;next} /^## /{f=0} f' .claude/skills/waha-expert/references/11e/core-rules.md`
   - Terms differ between editions (10e "Fall Back" and "Engagement Range"; 11e "fall-back move", "engaged", "coherency"). Search for both spellings.
3. **Unit, stratagem and detachment data** use the lookup CLI:
   - `node .claude/skills/waha-expert/scripts/lookup.mjs 11e unit "Custodian Guard"`
   - `node .claude/skills/waha-expert/scripts/lookup.mjs 10e stratagem "Heroic Intervention"`
   - `node .claude/skills/waha-expert/scripts/lookup.mjs 11e detachment "Shield Host"`
4. **Source order.** Rules updates, then core rules, then datasheet data. If sources disagree, state both and say which wins and why.
5. **Cite every claim** with the format in the table. Quote a short phrase only when the exact wording matters.
6. **No match is an answer.** If grep and lookup find nothing, reply "not in sources" and say what would fix it (for example the missing document).

## List-aware questions

Read `armies/*.json` (the user's rosters, 10e) and `src/data/detachments/*.ts` (their detachment rules and stratagems), then use `lookup.mjs` for datasheet details the roster lacks. Answer about the user's actual units, weapons and detachment, not generic ones.

## Checking the combat calculator

1. Find the rule text for the mechanic (in 11e the attack sequence is §05, starting at §05.01 Hit rolls; for 10e search `10e/core-rules.md` for "Hit roll", "Wound roll").
2. Read the matching code: `src/lib/combat.ts`, `src/lib/rules.ts`, `src/lib/coreRules.ts`, `src/lib/attackDisplay.ts`, and `src/data/core-abilities.ts` for ability definitions.
3. Report each point as **matches**, **differs** or **cannot tell**, with the rule citation and a `file:line` for the code. State which edition you compared against; the app is built for 10e.
4. Do not edit app code. A difference is a finding for the user to act on.

## Refreshing sources

- Wahapedia data: `node .claude/skills/waha-expert/scripts/sync-wahapedia.mjs <10e|11e>`
- A new PDF: save it under `docs/rules-source/<edition>/`, then `node .claude/skills/waha-expert/scripts/pdf-to-md.mjs <pdf> <edition> <doc-name>` (needs `pdftotext` on PATH). Update the Coverage section above.
- See `docs/rules-source/README.md` for what was checked in each source file.
````

- [ ] **Step 2: Write the evaluation list**

```markdown
<!-- .claude/skills/waha-expert/eval.md -->
# waha-expert evaluation

Run each question with the skill loaded. Pass requires every check for that question.

| # | Question | Must |
|---|---|---|
| 1 | "In 10th edition, can a unit shoot after it Falls Back?" | Starts with 10e; answers from `10e/core-rules.md` with a `p.<n>` citation; ends with the launch-version caveat |
| 2 | "In 11th, what happens when a battle-shocked unit makes a fall-back move?" | Starts with 11e; cites `11e/core-rules.md §09.07`; mentions Desperate Escape and a hazard roll per model |
| 3 | "How does falling back work?" (no edition) | Gives both editions, each labelled, with citations, noting what differs |
| 4 | "What are the Custodian Guard weapon profiles in 11th?" | Used `lookup.mjs`; edition 11e; cites `data/11e`; profile numbers copied from the output |
| 5 | "Which detachment is my Ultramar list using and what stratagems does it have?" | Defaults to 10e; reads `armies/Ultramar.json` and `src/data/detachments/`; names the real detachment from the file |
| 6 | "Does the app's Sustained Hits handling match the 10th edition rules?" | Cites rule text and `file:line` in `src/lib`; reports matches/differs/cannot tell; edits nothing |
| 7 | "What did the June 2024 Balance Dataslate change for Orks?" | Replies "not in sources" and names the missing document; no invented changes |
| 8 | "In 11th, how far away can a ranged attack target a unit under a stratagem that says 12 inches?" | Cites `11e/universal-rules-updates.md` (18") and says it overrides the core rules |
```

- [ ] **Step 3: Run the evaluation**

For each question, dispatch a fresh subagent (Agent tool, general-purpose) with the prompt: "Read `.claude/skills/waha-expert/SKILL.md` and follow it exactly. Answer: <question>. Do not edit any files." Check its answer against the "Must" column. Fix SKILL.md wording (not the checks) for any failure and re-run that question until it passes. Record the final pass/fail per question in the commit message.

- [ ] **Step 4: Verify the whole suite and lint**

Run:
```bash
npx vitest run .claude/skills/waha-expert
npx eslint .claude/skills/waha-expert/scripts
```
Expected: all tests in the three test files pass; eslint reports nothing, or only rules the repo's `eslint.config.js` already ignores for `.mjs` scripts (if it fails on `.claude/`, check that config ignores it before changing any code).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/waha-expert/SKILL.md .claude/skills/waha-expert/eval.md
git commit -m "Add waha-expert SKILL.md and evaluation checklist" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Later, when more sources are downloaded

Each is the same two commands, no code change:

- 10th "Core rules updates and errata": save as `docs/rules-source/10e/errata.pdf`, run `pdf-to-md.mjs docs/rules-source/10e/errata.pdf 10e errata`, then edit SKILL.md's Sources table and Coverage section.
- A newer 11th Core Rules PDF: replace `docs/rules-source/11e/11th.pdf`, re-run Task 2 Step 2 for 11e, re-check that sections 18.06 and 18.07 now exist, and delete the note about them in `universal-rules-updates.md` and SKILL.md.
- 11th Munitorum Field Manual or Faction Packs: same `pdf-to-md.mjs` call with a new doc name.
