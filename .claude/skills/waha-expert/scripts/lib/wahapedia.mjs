// Parsing helpers for Wahapedia's pipe-delimited CSV export.

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

// Export files start with a BOM and every line ends with a trailing "|".
// A record whose text wraps onto further lines is joined until it has all its fields.
export function parseCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
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
