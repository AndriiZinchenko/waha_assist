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
    data: {
      leaderAssignments: {},
      hiddenUnitIds: {},
      detachmentOverrides: {},
      weaponOverrides: {},
      crusade: null,
    },
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

// Keep in step with HONOUR_IDS / SCAR_IDS in src/lib/crusade.ts.
const HONOUR_IDS = new Set([
  "marksmen",
  "ruthlessBlades",
  "furiousCharge",
  "hardened",
  "steadfast",
  "holdTheLine",
]);
const SCAR_IDS = new Set(["grievousWound", "damagedGear", "limp", "concussion", "vengeance", "panic"]);
const MISSION_RESULTS = new Set(["win", "loss"]);

function text(value, max = 2000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function count(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function normalizeCrusadeUnit(raw) {
  if (typeof raw?.id !== "string" || typeof raw.playerId !== "string") return null;
  const honours = [];
  for (const h of Array.isArray(raw.honours) ? raw.honours : []) {
    if (!HONOUR_IDS.has(h?.id) || honours.some((x) => x.id === h.id)) continue;
    honours.push({ id: h.id, weapon: typeof h.weapon === "string" ? text(h.weapon, 200) : null });
  }
  const scars = [];
  for (const id of Array.isArray(raw.scars) ? raw.scars : []) {
    if (SCAR_IDS.has(id) && !scars.includes(id)) scars.push(id);
  }
  return {
    id: raw.id,
    playerId: raw.playerId,
    name: text(raw.name, 200),
    rosterUnitIds: Array.isArray(raw.rosterUnitIds)
      ? raw.rosterUnitIds.filter((id) => typeof id === "string")
      : [],
    xp: count(raw.xp),
    honours,
    scars,
    skipsMission: raw.skipsMission === true,
  };
}

/** A mission's enemy force; null for a malformed one. */
function normalizeEnemy(raw) {
  if (typeof raw !== "object" || raw === null || !Array.isArray(raw.units)) return null;
  const units = [];
  for (const u of raw.units) {
    if (typeof u?.armyId !== "string" || typeof u.unitId !== "string") continue;
    if (units.some((x) => x.armyId === u.armyId && x.unitId === u.unitId)) continue;
    units.push({ armyId: u.armyId, unitId: u.unitId });
  }
  const leaders = {};
  if (typeof raw.leaders === "object" && raw.leaders !== null) {
    for (const [leader, target] of Object.entries(raw.leaders)) {
      if (typeof target === "string") leaders[leader] = target;
    }
  }
  const enemy = { units, leaders };
  if (raw.detachment === null || typeof raw.detachment === "string") {
    enemy.detachment = raw.detachment === null ? null : text(raw.detachment, 200);
  }
  return enemy;
}

/** The co-op Crusade campaign, or null when none has been started. */
function normalizeCrusade(value) {
  if (typeof value !== "object" || value === null) return null;
  const players = [];
  for (const p of Array.isArray(value.players) ? value.players : []) {
    if (typeof p?.id !== "string" || typeof p.armyId !== "string") continue;
    players.push({ id: p.id, name: text(p.name, 200), armyId: p.armyId });
  }
  const units = [];
  for (const raw of Array.isArray(value.units) ? value.units : []) {
    const unit = normalizeCrusadeUnit(raw);
    if (unit && !units.some((u) => u.id === unit.id)) units.push(unit);
  }
  const missions = [];
  for (const m of Array.isArray(value.missions) ? value.missions : []) {
    if (!Number.isInteger(m?.number) || missions.some((x) => x.number === m.number)) continue;
    const mission = {
      number: m.number,
      name: text(m.name, 200),
      result: MISSION_RESULTS.has(m.result) ? m.result : null,
      pointsLimit: count(m.pointsLimit),
      notes: text(m.notes),
    };
    // Absent means "as the campaign book has it"; keep that apart from an
    // explicit null (no enemy).
    if ("enemy" in m) mission.enemy = m.enemy === null ? null : normalizeEnemy(m.enemy);
    missions.push(mission);
  }
  return { name: text(value.name, 200), players, units, missions };
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
    crusade: normalizeCrusade(source.crusade),
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
