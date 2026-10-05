// Pure helpers for scripts/sync-newrecruit.mjs. No I/O here so they can be
// unit-tested without a browser or filesystem.

import { parseRoster } from "../../parseRoster.mjs";
import { rosterEdition } from "../../rosterEdition.mjs";

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
  if (rosterEdition(json) === null) {
    return { ok: false, error: "not a 40k 10th or 11th edition roster" };
  }
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

/**
 * The lists that belong to one game system. New Recruit accounts can hold
 * lists for several games (e.g. Horus Heresy next to 40k) and
 * `user_get_data` returns all of them; only one system's lists are rosters
 * this app can read.
 *
 * @param {{id_system: number | string}[]} rows  user_get_data list rows
 * @param {number | string | undefined} systemId  the wanted system's id
 */
export function listsForSystem(rows, systemId) {
  if (systemId === undefined || systemId === null) return [];
  return rows.filter((row) => String(row.id_system) === String(systemId));
}

/**
 * Whether an export is the list that was asked for. When New Recruit cannot
 * open a list it can hand back whatever list it last had loaded, which would
 * otherwise be saved under the wrong file name.
 *
 * @param {any} json  the exported roster
 * @param {{name: string, catalogue: string | null}} list  what was requested
 */
export function exportMatchesList(json, list) {
  const roster = json?.roster;
  const name = roster?.name;
  if (name !== list.name) {
    return {
      ok: false,
      error: `export is "${name ?? "?"}", expected "${list.name}"`,
    };
  }
  const catalogue = roster?.forces?.[0]?.catalogueName;
  if (list.catalogue && catalogue !== list.catalogue) {
    return {
      ok: false,
      error: `export is from ${catalogue ?? "an unknown catalogue"}, expected ${list.catalogue}`,
    };
  }
  return { ok: true };
}
