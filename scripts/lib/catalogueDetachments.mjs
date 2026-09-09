// Pure helpers for scripts/sync-stratagems.mjs: reading every detachment a
// faction can field out of New Recruit's catalogue books (BattleScribe
// data), and pairing each one with its stratagems. No I/O, so every rule
// is unit-testable.

import { cleanExportText } from "./stratagems.mjs";

const NON_BREAKING_SPACE = String.fromCharCode(160);
const GROUP_NAMES = new Set(["Detachment", "Detachments"]);

/** The Stratagems book capitalises some names differently ("Talons Of The
 * Emperor" for the catalogue's "Talons of the Emperor"). */
function nameKey(name) {
  return String(name ?? "").trim().toLowerCase();
}

function cleanRuleText(text) {
  return cleanExportText(String(text ?? "").split(NON_BREAKING_SPACE).join(" ").trim());
}

/**
 * Every selection entry sitting in a group called "Detachment" or
 * "Detachments", wherever the catalogue nests it. Some factions keep the
 * group under a shared entry, others at the top level.
 */
export function detachmentEntries(catalogue) {
  const found = [];
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (GROUP_NAMES.has(node.name) && Array.isArray(node.selectionEntries)) {
      found.push(...node.selectionEntries);
      return;
    }
    for (const value of Object.values(node)) {
      if (typeof value === "object") walk(value);
    }
  })(catalogue);
  return found;
}

/**
 * Whether a detachment is on offer to an army built from the catalogue
 * with this BattleScribe id. Two kinds of "hidden unless" modifier gate
 * entries: chapter detachments in the shared Space Marines book are hidden
 * unless the primary catalogue is that chapter, and Boarding Actions
 * detachments are hidden unless a boarding selection is in the force. The
 * first passes when the id matches; the second never does, because the
 * app is for ordinary games.
 */
export function isAvailableTo(entry, catalogueId) {
  if (entry.hidden) return false;
  if (/\[Legends\]/i.test(entry.name ?? "")) return false;
  for (const modifier of entry.modifiers ?? []) {
    if (modifier.type !== "set" || modifier.field !== "hidden" || modifier.value !== true) continue;
    for (const condition of modifier.conditions ?? []) {
      if (condition.type !== "notInstanceOf") continue;
      const gatedToUs = condition.scope === "primary-catalogue" && condition.childId === catalogueId;
      if (!gatedToUs) return false;
    }
  }
  return true;
}

/**
 * The entry's own rules, then any it reaches through a rule info link
 * (Ork detachments point at core weapon abilities this way). Links that
 * do not resolve are dropped rather than failing the whole sync.
 */
export function resolveRules(entry, sharedRules) {
  const rules = (entry.rules ?? []).map((rule) => ({
    name: rule.name,
    text: cleanRuleText(rule.description),
  }));
  for (const link of entry.infoLinks ?? []) {
    if (link.type !== "rule") continue;
    const target = sharedRules.get(link.targetId);
    if (!target) continue;
    rules.push({ name: target.name, text: cleanRuleText(target.description) });
  }
  return rules;
}

function indexSharedRules(catalogues) {
  const index = new Map();
  for (const catalogue of catalogues) {
    for (const rule of catalogue?.sharedRules ?? []) {
      if (rule?.id && !index.has(rule.id)) index.set(rule.id, rule);
    }
  }
  return index;
}

/**
 * All detachments available to armies built from `catalogue`, searched in
 * the catalogue first and then in each catalogue it links (the shared
 * Space Marines book, the core rules for linked rule text). The first
 * entry with a given name wins.
 */
export function detachmentsForCatalogue({ catalogue, linked }) {
  const all = [catalogue, ...linked];
  const sharedRules = indexSharedRules(all);
  const seen = new Set();
  const out = [];
  for (const book of all) {
    for (const entry of detachmentEntries(book)) {
      if (!isAvailableTo(entry, catalogue.id)) continue;
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      out.push({ name: entry.name, rules: resolveRules(entry, sharedRules) });
    }
  }
  return out;
}

/**
 * The Stratagems book tags every entry with a short faction code but the
 * catalogue does not carry it, so it is inferred: the code most of the
 * catalogue's detachment names appear under.
 */
export function inferFactionId(stratagems, detachmentNames) {
  const names = new Set(detachmentNames.map(nameKey));
  const votes = new Map();
  for (const s of stratagems) {
    if (!s.faction_id || !names.has(nameKey(s.detachment))) continue;
    votes.set(s.faction_id, (votes.get(s.faction_id) ?? 0) + 1);
  }
  let best = null;
  for (const [id, count] of votes) {
    if (best === null || count > votes.get(best)) best = id;
  }
  return best;
}

export function stratagemsForDetachment(stratagems, name, factionId) {
  const key = nameKey(name);
  return stratagems.filter(
    (s) => nameKey(s.detachment) === key && (factionId === null || s.faction_id === factionId),
  );
}
