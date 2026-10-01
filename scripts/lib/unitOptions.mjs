// Pure helpers for scripts/sync-unit-options.mjs: reading, from New
// Recruit's catalogue books (BattleScribe data), every weapon a unit's
// datasheet offers. No I/O, so every rule is unit-testable.

const WEAPON_TYPES = new Set(["Ranged Weapons", "Melee Weapons"]);
const CRUSADE = /crusade|battle honour|battle trait|battle scar|tallies|weapon modification/i;
const MAX_DEPTH = 14;

const nameKey = (name) => String(name ?? "").trim().toLowerCase();

/** Every object with a string id in the given roots, by id. First one wins. */
export function indexNodes(roots) {
  const byId = new Map();
  (function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node.id === "string" && !byId.has(node.id)) byId.set(node.id, node);
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") visit(value);
    }
  })(roots);
  return byId;
}

/** rule name -> description, from shared and inline rules. First one wins. */
export function collectRuleTexts(roots) {
  const texts = {};
  (function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const key of ["rules", "sharedRules"]) {
      for (const rule of Array.isArray(node[key]) ? node[key] : []) {
        if (rule && rule.name && typeof rule.description === "string" && !(rule.name in texts)) {
          texts[rule.name] = rule.description.trim();
        }
      }
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") visit(value);
    }
  })(roots);
  return texts;
}

/** A link resolves to its target, keeping the link's own name when it has one. */
function resolve(node, byId) {
  if (node && node.targetId) {
    const target = byId.get(node.targetId);
    if (!target) return null;
    return { ...target, name: node.name ?? target.name };
  }
  return node;
}

function characteristics(profile) {
  const out = {};
  for (const c of profile.characteristics ?? []) {
    out[c.name] = String(c.$text ?? c.value ?? "").trim();
  }
  return out;
}

function toProfile(profile) {
  const c = characteristics(profile);
  return {
    id: profile.id,
    name: String(profile.name ?? "").replace(/^➤\s*/, ""),
    type: profile.typeName === "Ranged Weapons" ? "ranged" : "melee",
    range: c.Range ?? null,
    attacks: c.A ?? "",
    skill: c.BS ?? c.WS ?? null,
    strength: Number(c.S),
    ap: Number(c.AP),
    damage: c.D ?? "",
    keywords: c.Keywords ?? "-",
  };
}

/**
 * The weapon profiles of an entry: those written on it, plus those attached
 * through profile info links (BattleScribe's way of reusing a shared
 * profile, which most catalogues use for common weapons like a bolt pistol).
 */
function weaponProfiles(node, byId) {
  const linked = (node.infoLinks ?? [])
    .filter((l) => l.type === "profile")
    .map((l) => byId.get(l.targetId))
    .filter(Boolean);
  return [...(node.profiles ?? []), ...linked].filter((p) => WEAPON_TYPES.has(p.typeName));
}

function ruleNames(node) {
  const names = new Set();
  for (const link of node.infoLinks ?? []) {
    if (link.type === "rule" && link.name) names.add(link.name);
  }
  for (const rule of node.rules ?? []) {
    if (rule && rule.name) names.add(rule.name);
  }
  return [...names];
}

/**
 * Every weapon the entry offers, anywhere under it: direct entries, entries
 * inside groups, and entries reached through links. Null when the entry id
 * is not in the index.
 */
export function weaponOptionsForEntry(entryId, byId) {
  const root = byId.get(entryId);
  if (!root) return null;
  const found = new Map();
  const path = new Set();
  (function walk(entry, depth) {
    const node = resolve(entry, byId);
    if (!node || depth > MAX_DEPTH || path.has(node.id)) return;
    if (CRUSADE.test(node.name ?? "")) return;
    path.add(node.id);
    const profiles = weaponProfiles(node, byId);
    if (profiles.length > 0 && !found.has(nameKey(node.name))) {
      found.set(nameKey(node.name), {
        name: node.name,
        profiles: profiles.map(toProfile),
        rules: ruleNames(node),
      });
    }
    for (const key of ["selectionEntries", "selectionEntryGroups", "entryLinks"]) {
      for (const child of node[key] ?? []) walk(child, depth + 1);
    }
    path.delete(node.id);
  })(root, 0);
  return [...found.values()];
}

/** The catalogue entry id and name of every unit in a roster export. */
export function unitEntriesFromRoster(json) {
  const out = [];
  for (const sel of json?.roster?.forces?.[0]?.selections ?? []) {
    if (sel.type !== "unit" && sel.type !== "model") continue;
    if (typeof sel.entryId !== "string" || !sel.entryId) continue;
    out.push({ entryId: sel.entryId.split("::").pop(), name: sel.name });
  }
  return out;
}

/**
 * The options file content for one faction.
 *
 * @param {{catalogue: string, roots: object[], entries: {entryId: string, name: string}[]}} input
 *   `roots` are the catalogue, the catalogues it links and the core book.
 */
export function buildFactionOptions({ catalogue, roots, entries }) {
  const byId = indexNodes(roots);
  const texts = collectRuleTexts(roots);
  const units = {};
  const missing = [];
  const usedRules = new Set();
  for (const { entryId, name } of entries) {
    if (units[entryId]) continue;
    const weapons = weaponOptionsForEntry(entryId, byId);
    if (!weapons) {
      if (!missing.includes(name)) missing.push(name);
      continue;
    }
    units[entryId] = { name, weapons };
    for (const w of weapons) for (const r of w.rules) usedRules.add(r);
  }
  const rules = {};
  for (const name of [...usedRules].sort()) {
    if (texts[name] !== undefined) rules[name] = texts[name];
  }
  return { options: { catalogue, rules, units }, missing };
}

const GENERATED = "// Generated by scripts/sync-unit-options.mjs. Do not edit by hand.";

export function renderFactionFile(constName, options) {
  return [
    `import type { FactionUnitOptions } from "./types";`,
    "",
    GENERATED,
    `export const ${constName}: FactionUnitOptions = ${JSON.stringify(options, null, 2)};`,
    "",
  ].join("\n");
}

/** @param factions Array of { constName, stem } in the order to export. */
export function renderFactionsIndex(factions) {
  const lines = [`import type { FactionUnitOptions } from "./types";`];
  for (const f of factions) lines.push(`import { ${f.constName} } from "./${f.stem}";`);
  lines.push("", GENERATED);
  lines.push(`export const factionOptions: FactionUnitOptions[] = [`);
  for (const f of factions) lines.push(`  ${f.constName},`);
  lines.push("];", "");
  return lines.join("\n");
}
