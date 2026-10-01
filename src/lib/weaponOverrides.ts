import type {
  LoadoutWeapon,
  ParsedUnit,
  WeaponEntry,
  WeaponLoadout,
} from "../../parseRoster.mjs";
import { parseDice, parseKeywords, parseSkill } from "../../parseRoster.mjs";
import type {
  UnitOptionsResult,
  WeaponOption,
  WeaponOptionProfile,
} from "../data/unit-options/types";

/** One weapon a model in a group carries. Stored by catalogue name, never
 * by stats, so a later `sync:options` updates edited units too. */
export interface WeaponOverrideWeapon {
  name: string;
  /** How many of this weapon each model in the group carries. */
  perModel: number;
}

/** A set of models that carry the same weapons. */
export interface WeaponOverrideGroup {
  /** Stable within one override ("g1", "g2", ...); names casualty counts. */
  key: string;
  modelCount: number;
  weapons: WeaponOverrideWeapon[];
}

export interface UnitWeaponOverride {
  groups: WeaponOverrideGroup[];
  /** Fingerprint of the roster unit's own loadouts when the edit was made. */
  rosterSignature: string;
}

export type OptionsLookup = (entryId: string | null | undefined) => UnitOptionsResult | null;

const nameKey = (name: string): string => name.trim().toLowerCase();

/** The catalogue option a roster weapon profile belongs to. A roster lists
 * each firing mode under its own profile name; the catalogue groups them
 * under one entry. */
function optionForProfileName(
  profileName: string,
  options: UnitOptionsResult | null,
): WeaponOption | null {
  if (!options) return null;
  const key = nameKey(profileName);
  return (
    options.weapons.find(
      (o) => nameKey(o.name) === key || o.profiles.some((p) => nameKey(p.name) === key),
    ) ?? null
  );
}

/** The unit's own loadouts as editable groups, one weapon entry per weapon. */
export function rosterGroups(
  unit: ParsedUnit,
  options: UnitOptionsResult | null,
): WeaponOverrideGroup[] {
  return unit.loadouts.map((loadout, i) => {
    // A datasheet can mount one profile from two wargear groups (the
    // Forgefiend's cannons): add those up first, then collapse the profiles
    // of one weapon to the largest per-model count.
    const perProfile = new Map<string, { name: string; perModel: number }>();
    for (const w of loadout.weapons) {
      const seen = perProfile.get(w.profileId);
      if (seen) seen.perModel += w.perModel;
      else perProfile.set(w.profileId, { name: w.name, perModel: w.perModel });
    }
    const byName = new Map<string, WeaponOverrideWeapon>();
    for (const { name, perModel } of perProfile.values()) {
      const resolved = optionForProfileName(name, options)?.name ?? name;
      const key = nameKey(resolved);
      const seen = byName.get(key);
      if (seen) seen.perModel = Math.max(seen.perModel, perModel);
      else byName.set(key, { name: resolved, perModel });
    }
    return { key: `g${i + 1}`, modelCount: loadout.modelCount, weapons: [...byName.values()] };
  });
}

/** A stable fingerprint of the roster unit's loadouts, to notice later changes. */
export function rosterSignature(unit: ParsedUnit): string {
  return unit.loadouts
    .map((l) => {
      const names = [...new Set(l.weapons.map((w) => nameKey(w.name)))].sort();
      return `${l.modelCount}x${names.join("+")}`;
    })
    .sort()
    .join("|");
}

/** The override a first edit starts from: the roster's own groups. */
export function startOverride(
  unit: ParsedUnit,
  options: UnitOptionsResult | null,
): UnitWeaponOverride {
  return { groups: rosterGroups(unit, options), rosterSignature: rosterSignature(unit) };
}

function entryFromProfile(
  p: WeaponOptionProfile,
  option: WeaponOption,
  ruleTexts: Record<string, string>,
): WeaponEntry {
  return {
    profileId: `opt:${p.id}`,
    name: p.name,
    subProfile: option.profiles.length > 1,
    type: p.type,
    count: 1,
    range: p.range,
    attacks: parseDice(p.attacks),
    skill: parseSkill(p.skill),
    skillRaw: p.skill,
    strength: p.strength,
    ap: p.ap,
    damage: parseDice(p.damage),
    keywords: parseKeywords(p.keywords),
    rules: option.rules.map((name) => ({ name, text: ruleTexts[name] ?? null })),
  };
}

/**
 * The profiles of a weapon by name: from the catalogue option when there is
 * one, otherwise from the roster unit's own weapons. Each entry has count 1.
 * Null when the weapon is found in neither.
 */
export function resolveWeapon(
  name: string,
  options: UnitOptionsResult | null,
  unit: ParsedUnit,
): WeaponEntry[] | null {
  const key = nameKey(name);
  const option = options?.weapons.find((o) => nameKey(o.name) === key) ?? null;
  if (option && options) {
    return option.profiles.map((p) => entryFromProfile(p, option, options.rules));
  }
  const own = new Map<string, WeaponEntry>();
  for (const w of unit.weapons) {
    if (nameKey(w.name) === key && !own.has(w.profileId)) own.set(w.profileId, { ...w, count: 1 });
  }
  return own.size > 0 ? [...own.values()] : null;
}

function totalsByName(groups: WeaponOverrideGroup[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const g of groups) {
    for (const w of g.weapons) {
      const key = nameKey(w.name);
      totals.set(key, (totals.get(key) ?? 0) + w.perModel * g.modelCount);
    }
  }
  return totals;
}

/** `unit` with its loadouts and weapons replaced by the override's groups. */
export function applyWeaponOverride(
  unit: ParsedUnit,
  override: UnitWeaponOverride,
  lookup: OptionsLookup,
): ParsedUnit {
  const options = lookup(unit.entryId);
  const rosterTotals = totalsByName(rosterGroups(unit, options));
  const overrideTotals = totalsByName(override.groups);
  const byProfile = new Map<string, WeaponEntry>();
  const loadouts: WeaponLoadout[] = [];
  const missing: string[] = [];

  for (const group of override.groups) {
    const loadoutWeapons: LoadoutWeapon[] = [];
    for (const w of group.weapons) {
      const resolved = resolveWeapon(w.name, options, unit);
      if (!resolved) {
        if (!missing.includes(w.name)) missing.push(w.name);
        continue;
      }
      const key = nameKey(w.name);
      const edited = rosterTotals.get(key) !== overrideTotals.get(key);
      for (const entry of resolved) {
        loadoutWeapons.push({ profileId: entry.profileId, name: entry.name, perModel: w.perModel });
        const added = w.perModel * group.modelCount;
        const seen = byProfile.get(entry.profileId);
        if (seen) {
          seen.count += added;
          seen.edited = seen.edited || edited;
        } else {
          byProfile.set(entry.profileId, { ...entry, count: added, edited });
        }
      }
    }
    loadouts.push({
      key: `ovr:${group.key}`,
      modelCount: group.modelCount,
      weapons: loadoutWeapons,
      wargear: [],
    });
  }

  return {
    ...unit,
    modelCount: override.groups.reduce((n, g) => n + g.modelCount, 0),
    loadouts,
    weapons: [...byProfile.values()],
    weaponsEdited: true,
    rosterChanged: override.rosterSignature !== rosterSignature(unit),
    missingWeapons: missing,
  };
}

/** Apply each unit's override, if it has one. Overrides for units not in the
 * list are ignored. */
export function applyWeaponOverrides(
  units: ParsedUnit[],
  overrides: Record<string, UnitWeaponOverride>,
  lookup: OptionsLookup,
): ParsedUnit[] {
  return units.map((u) => {
    const override = overrides[u.id];
    return override ? applyWeaponOverride(u, override, lookup) : u;
  });
}

// ---- editing helpers (immutable) -----------------------------------------

function mapGroup(
  override: UnitWeaponOverride,
  groupKey: string,
  fn: (g: WeaponOverrideGroup) => WeaponOverrideGroup,
): UnitWeaponOverride {
  return { ...override, groups: override.groups.map((g) => (g.key === groupKey ? fn(g) : g)) };
}

export function setGroupModelCount(
  override: UnitWeaponOverride,
  groupKey: string,
  count: number,
): UnitWeaponOverride {
  const modelCount = Math.max(0, Math.floor(count));
  return mapGroup(override, groupKey, (g) => ({ ...g, modelCount }));
}

export function setWeaponPerModel(
  override: UnitWeaponOverride,
  groupKey: string,
  weaponName: string,
  perModel: number,
): UnitWeaponOverride {
  const value = Math.max(1, Math.floor(perModel));
  return mapGroup(override, groupKey, (g) => ({
    ...g,
    weapons: g.weapons.map((w) => (w.name === weaponName ? { ...w, perModel: value } : w)),
  }));
}

export function swapWeapon(
  override: UnitWeaponOverride,
  groupKey: string,
  oldName: string,
  newName: string,
): UnitWeaponOverride {
  return mapGroup(override, groupKey, (g) => {
    if (oldName === newName) return g;
    const hasNew = g.weapons.some((w) => nameKey(w.name) === nameKey(newName));
    const weapons = hasNew
      ? g.weapons.filter((w) => w.name !== oldName)
      : g.weapons.map((w) => (w.name === oldName ? { ...w, name: newName } : w));
    return { ...g, weapons };
  });
}

export function addWeapon(
  override: UnitWeaponOverride,
  groupKey: string,
  name: string,
): UnitWeaponOverride {
  return mapGroup(override, groupKey, (g) => {
    const existing = g.weapons.find((w) => nameKey(w.name) === nameKey(name));
    if (existing) {
      return {
        ...g,
        weapons: g.weapons.map((w) => (w === existing ? { ...w, perModel: w.perModel + 1 } : w)),
      };
    }
    return { ...g, weapons: [...g.weapons, { name, perModel: 1 }] };
  });
}

export function removeWeapon(
  override: UnitWeaponOverride,
  groupKey: string,
  weaponName: string,
): UnitWeaponOverride {
  return mapGroup(override, groupKey, (g) => ({
    ...g,
    weapons: g.weapons.filter((w) => w.name !== weaponName),
  }));
}

export function addGroup(override: UnitWeaponOverride): UnitWeaponOverride {
  const highest = override.groups.reduce(
    (max, g) => Math.max(max, Number(/^g(\d+)$/.exec(g.key)?.[1] ?? 0)),
    0,
  );
  return {
    ...override,
    groups: [...override.groups, { key: `g${highest + 1}`, modelCount: 1, weapons: [] }],
  };
}

export function removeGroup(override: UnitWeaponOverride, groupKey: string): UnitWeaponOverride {
  if (override.groups.length <= 1) return override;
  return { ...override, groups: override.groups.filter((g) => g.key !== groupKey) };
}
