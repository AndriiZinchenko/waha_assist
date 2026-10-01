// Storage layer for the synced army config. One JSON file, one integer
// revision. Writes go through a temp file and a rename so an interrupted
// write can never leave a half-written document on disk.

import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE_NAME = "state.json";

export function emptyDoc() {
  return {
    rev: 0,
    updatedAt: null,
    data: { leaderAssignments: {}, hiddenUnitIds: {}, detachmentOverrides: {}, weaponOverrides: {} },
  };
}

function normalizeGroups(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const groups = [];
  for (const g of raw) {
    if (
      typeof g?.key !== "string" ||
      !Number.isInteger(g.modelCount) ||
      g.modelCount < 0 ||
      !Array.isArray(g.weapons)
    ) {
      return null;
    }
    const weapons = [];
    for (const w of g.weapons) {
      if (typeof w?.name !== "string" || typeof w.perModel !== "number" || !(w.perModel > 0)) {
        return null;
      }
      weapons.push({ name: w.name, perModel: w.perModel });
    }
    groups.push({ key: g.key, modelCount: g.modelCount, weapons });
  }
  return groups;
}

/** A malformed override is dropped whole: half an edit is worse than none. */
function normalizeWeaponOverrides(value) {
  const out = {};
  if (typeof value !== "object" || value === null) return out;
  for (const [unitId, raw] of Object.entries(value)) {
    const groups = normalizeGroups(raw?.groups);
    if (!groups || typeof raw.rosterSignature !== "string") continue;
    out[unitId] = { groups, rosterSignature: raw.rosterSignature };
  }
  return out;
}

/**
 * Keep only the fields and value types we sync. The request body comes from
 * a browser we do not control, and the file may have been hand-edited, so
 * both are normalized through here rather than trusted.
 */
export function normalizeSyncedData(value) {
  const source = typeof value === "object" && value !== null ? value : {};
  const leaderAssignments = {};
  const rawLeaders = source.leaderAssignments;
  if (typeof rawLeaders === "object" && rawLeaders !== null) {
    for (const [key, val] of Object.entries(rawLeaders)) {
      if (typeof val === "string") leaderAssignments[key] = val;
    }
  }
  const hiddenUnitIds = {};
  const rawHidden = source.hiddenUnitIds;
  if (typeof rawHidden === "object" && rawHidden !== null) {
    for (const [key, val] of Object.entries(rawHidden)) {
      if (typeof val === "boolean") hiddenUnitIds[key] = val;
    }
  }
  const detachmentOverrides = {};
  const rawDetachments = source.detachmentOverrides;
  if (typeof rawDetachments === "object" && rawDetachments !== null) {
    for (const [key, val] of Object.entries(rawDetachments)) {
      if (typeof val === "string") detachmentOverrides[key] = val;
    }
  }
  return {
    leaderAssignments,
    hiddenUnitIds,
    detachmentOverrides,
    weaponOverrides: normalizeWeaponOverrides(source.weaponOverrides),
  };
}

export async function readDoc(dir) {
  let raw;
  try {
    raw = await readFile(path.join(dir, FILE_NAME), "utf8");
  } catch {
    return emptyDoc();
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[state] ${FILE_NAME} is not valid JSON; treating it as empty`);
    return emptyDoc();
  }
  const rev = Number.isInteger(parsed?.rev) && parsed.rev >= 0 ? parsed.rev : 0;
  return {
    rev,
    updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null,
    data: normalizeSyncedData(parsed?.data),
  };
}

export async function writeDoc(dir, baseRev, data) {
  const current = await readDoc(dir);
  if (current.rev !== baseRev) return { ok: false, doc: current };

  const next = {
    rev: current.rev + 1,
    updatedAt: new Date().toISOString(),
    data: normalizeSyncedData(data),
  };
  const target = path.join(dir, FILE_NAME);
  const temp = path.join(dir, `${FILE_NAME}.${process.pid}.tmp`);
  try {
    await writeFile(temp, JSON.stringify(next, null, 2), "utf8");
    await rename(temp, target);
  } catch (err) {
    await unlink(temp).catch(() => {});
    throw err;
  }
  return { ok: true, doc: next };
}
