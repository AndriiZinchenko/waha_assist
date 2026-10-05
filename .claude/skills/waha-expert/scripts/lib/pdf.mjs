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
