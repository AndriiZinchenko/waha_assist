// Pure helpers for scripts/sync-newrecruit.mjs. No I/O here so they can be
// unit-tested without a browser or filesystem.

import { parseRoster } from "../../parseRoster.mjs";

/** New Recruit list name -> safe file stem for armies/<stem>.json */
export function sanitizeFileName(name) {
  const cleaned = String(name ?? "")
    .replace(/[<>:"/\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "list";
}

/**
 * Decide which file each list is written to, and which existing .json files
 * in armies/ no current list would touch.
 *
 * @param {{key: string, name: string}[]} lists
 * @param {string[]} existingFiles  file names currently in armies/
 */
export function planWrites(lists, existingFiles) {
  const taken = new Set();
  const writes = lists.map(({ key, name }) => {
    const stem = sanitizeFileName(name);
    const file = taken.has(stem) ? `${stem} (${key}).json` : `${stem}.json`;
    taken.add(stem);
    return { key, name, file };
  });
  const written = new Set(writes.map((w) => w.file));
  const orphans = existingFiles.filter(
    (f) => f.endsWith(".json") && !written.has(f),
  );
  return { writes, orphans };
}

/**
 * Run an export through the app's own parser so a bad download never
 * replaces a good file. Returns { ok, catalogue } or { ok: false, error }.
 */
export function validateRoster(json) {
  try {
    const parsed = parseRoster(json);
    if (!parsed || !parsed.units || parsed.units.length === 0) {
      return { ok: false, error: "parsed roster has no units" };
    }
    return { ok: true, catalogue: parsed.catalogue };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
