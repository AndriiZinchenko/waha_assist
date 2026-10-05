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
