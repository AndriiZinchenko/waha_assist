// Parser for New Recruit / BattleScribe JSON roster exports (WH40k 10th ed).
// Input:  the parsed JSON object (the thing with a top-level `roster` key).
// Output: a normalized army object ready for a combat calculator.

const T_UNIT = "Unit";
const T_RANGED = "Ranged Weapons";
const T_MELEE = "Melee Weapons";
// Everything else (Abilities, Warmaster, Marks of Chaos, Transport, or any
// profile type a future export introduces) is generic "info" — rendered as
// its own section keyed by typeName rather than requiring this file to
// name every faction-specific profile type up front. That way an unknown
// typeName still surfaces in the UI instead of silently vanishing.
const NON_INFO_TYPE_NAMES = new Set([T_UNIT, T_RANGED, T_MELEE]);

const CONFIG_NAMES = new Set(["Battle Size", "Detachment", "Show/Hide Options"]);

/** characteristics[] -> { M: '6"', T: '4', ... } */
const chars = (profile) =>
  Object.fromEntries((profile.characteristics ?? []).map((c) => [c.name, c.$text]));

/** "D3+1" | "2D6" | "6" -> { dice, sides, flat, raw, avg } */
function parseDice(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  const m = /^(\d*)[Dd](\d+)([+-]\d+)?$/.exec(s);
  if (!m) {
    const n = Number(s);
    return Number.isFinite(n)
      ? { dice: 0, sides: 0, flat: n, raw: s, avg: n }
      : { dice: 0, sides: 0, flat: 0, raw: s, avg: null }; // e.g. "N/A"
  }
  const dice = m[1] === "" ? 1 : Number(m[1]);
  const sides = Number(m[2]);
  const flat = m[3] ? Number(m[3]) : 0;
  return { dice, sides, flat, raw: s, avg: dice * ((sides + 1) / 2) + flat };
}

/** "3+" -> 3 ; "N/A" -> null (auto-hit, e.g. Torrent) */
function parseSkill(raw) {
  const m = /^(\d)\+$/.exec(String(raw ?? "").trim());
  return m ? Number(m[1]) : null;
}

/**
 * Different exports disagree on the casing of the keyword inside an Anti-X
 * ability ("Anti-INFANTRY 4+" vs "Anti-Infantry 2+"), while unit keywords
 * are always title-cased ("Infantry", "Heretic Astartes Vehicle"). The
 * combat code matches the two, so normalize the Anti-X part to Title Case
 * here, at the source, rather than relying on every consumer to compare
 * case-insensitively.
 */
function normalizeAntiKeyword(kw) {
  const m = /^(Anti-)(.+?)(\s+\d\+)$/i.exec(kw);
  if (!m) return kw;
  const [, prefix, target, threshold] = m;
  const titled = target
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return `${prefix}${titled}${threshold}`;
}

/** "Anti-Infantry 2+, Ignores Cover, Psychic" -> [...] ; "-" -> [] */
function parseKeywords(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s === "-") return [];
  return s
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .map(normalizeAntiKeyword);
}

/**
 * "Invulnerable Save (4+*)" -> { value: 4, conditional: true }
 *
 * Some exports (e.g. this Adeptus Custodes roster) don't put the value in
 * the ability name at all — the name is a bare "Invulnerable Save" and the
 * value only appears in its Description text ("This model has a 4+
 * invulnerable save."). Fall back to that text when the name doesn't carry
 * a value, but only for an ability actually named "Invulnerable Save" so we
 * don't pattern-match unrelated flavor text elsewhere.
 */
function parseInvuln(profileName, text) {
  const name = profileName ?? "";
  const fromName = /Invulnerable Save \((\d)\+(\*?)\)/.exec(name);
  if (fromName) return { value: Number(fromName[1]), conditional: fromName[2] === "*" };

  if (name.trim() !== "Invulnerable Save") return null;
  const fromText = /(\d)\+ invulnerable save/i.exec(text ?? "");
  return fromText ? { value: Number(fromText[1]), conditional: false } : null;
}

/**
 * Core-rulebook keyword glossary entries attached directly to a selection
 * (New Recruit's `rules[]`, distinct from the datasheet `Abilities` profiles
 * collected elsewhere) — things like Deep Strike, Leader, or a weapon's
 * Rapid Fire/Blast/Melta. Each carries its own full rule text, unlike the
 * bare keyword strings in a weapon's `Keywords` characteristic.
 */
function collectRules(sel) {
  // New Recruit sometimes attaches the same rule to a selection twice.
  const seen = new Set();
  const out = [];
  for (const r of sel.rules ?? []) {
    const text = r.description ?? null;
    const key = `${r.name}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: r.name, text });
  }
  return out;
}

/** Recursively yield every selection node under `node` (inclusive). */
function* walk(node) {
  yield node;
  for (const child of node.selections ?? []) yield* walk(child);
}

/**
 * Weapon profiles under a subtree, with the count from their OWNING
 * selection. `subProfile` marks a weapon as one firing mode of a multi-mode
 * item (Nemesis greatsword strike/sweep; a Custodes Sentinel Blade's melee
 * and ranged profiles) — detected structurally, by the owning selection
 * having more than one Ranged/Melee profile, not by New Recruit's optional
 * `➤ Name - mode` naming convention. That convention only shows up in some
 * factions' exports; the Custodes weapons above carry two profiles with the
 * exact same bare name and no `➤` at all, so a naming-only check misses
 * them entirely and leaves two unrelated-looking rows in `WeaponTable`.
 */
function collectWeapons(root) {
  const out = [];
  for (const sel of walk(root)) {
    const combatProfiles = (sel.profiles ?? []).filter(
      (p) => p.typeName === T_RANGED || p.typeName === T_MELEE,
    );
    const multiProfile = combatProfiles.length > 1;
    for (const p of combatProfiles) {
      const c = chars(p);
      out.push({
        profileId: p.id,               // key on THIS, not on name
        name: p.name.replace(/^➤\s*/, ""),
        subProfile: multiProfile || p.name.startsWith("➤"),
        type: p.typeName === T_RANGED ? "ranged" : "melee",
        // `number` on the owning selection is an ABSOLUTE count, not per-model
        count: sel.number ?? 1,
        range: c.Range ?? null,
        attacks: parseDice(c.A),
        skill: parseSkill(c.BS ?? c.WS),
        skillRaw: c.BS ?? c.WS ?? null,
        strength: Number(c.S),
        ap: Number(c.AP),
        damage: parseDice(c.D),
        keywords: parseKeywords(c.Keywords),
        // The owning selection's rules are the union across all of its
        // profiles (e.g. a multi-mode weapon's strike/sweep share one
        // list) — a keyword is matched against these by name prefix in the
        // UI, not one-to-one by profile.
        rules: collectRules(sel),
      });
    }
  }
  return out;
}

/** Stable identity for "is this the same weapon" — name plus every stat, not the raw id. */
function weaponSignature(w) {
  return [
    w.name,
    w.type,
    w.range ?? "",
    w.attacks?.raw ?? "",
    w.skillRaw ?? "",
    w.strength,
    w.ap,
    w.damage?.raw ?? "",
    [...w.keywords].sort().join(","),
  ].join("|");
}

/**
 * New Recruit sometimes assigns a fresh profileId to a weapon profile even
 * when it is stat-for-stat identical to one already seen elsewhere in the
 * same unit (a named sergeant's Boltgun vs. the rank-and-file's, say) — the
 * two are the same weapon in every way that matters, just exported as
 * separate profiles. Left alone this splits one weapon into unmerged rows
 * in `WeaponTable` and produces loadouts whose weapon-based labels come out
 * as identical text (`parser-summary.md`'s "key on id, never on name" is
 * about the opposite mistake — a name shared by *different* weapons; this
 * is a different profile id shared by the *same* weapon).
 *
 * Build a map from every profileId seen in this unit's weapons to a
 * canonical one: the first profileId seen for a given (name + full stats)
 * signature wins. Scoped to a single unit's own weapon list, so it can
 * never merge the genuinely different Nemesis force weapon variants that
 * exist across different units.
 */
function buildCanonicalWeaponIdMap(weapons) {
  const canonicalBySignature = new Map();
  const idMap = new Map();
  for (const w of weapons) {
    const sig = weaponSignature(w);
    if (!canonicalBySignature.has(sig)) canonicalBySignature.set(sig, w.profileId);
    idMap.set(w.profileId, canonicalBySignature.get(sig));
  }
  return idMap;
}

/**
 * A profile's rule text. New Recruit conventionally names it "Description"
 * or "Ability" depending on profile type, but rather than hard-coding every
 * name we've seen, fall back to the first non-empty characteristic — so a
 * profile type with a characteristic we haven't named yet still shows its
 * text instead of coming through blank.
 */
function profileText(p) {
  const c = chars(p);
  return c.Description ?? c.Ability ?? Object.values(c).find((v) => v) ?? null;
}

/** Every non-weapon, non-unit profile under a subtree, tagged with its
 * typeName so the UI can group them into sections — Abilities, Warmaster
 * auras, Marks of Chaos, Transport capacity, or whatever profile type a
 * future export introduces. */
function collectInfoProfiles(root) {
  const out = [];
  for (const sel of walk(root)) {
    for (const p of sel.profiles ?? []) {
      if (NON_INFO_TYPE_NAMES.has(p.typeName)) continue;
      out.push({ type: p.typeName, name: p.name, text: profileText(p) });
    }
  }
  return out;
}

/** Group a flat info-profile list into sections keyed by typeName, in the
 * order each typeName first appears. */
function groupInfoSections(items) {
  const order = [];
  const byType = new Map();
  for (const item of items) {
    if (!byType.has(item.type)) {
      byType.set(item.type, []);
      order.push(item.type);
    }
    byType.get(item.type).push(item);
  }
  return order.map((type) => ({ type, items: byType.get(type) }));
}

/** Every category name attached to a subtree — the unit's own plus every
 * descendant selection's (a "Mark of Slaanesh" upgrade, say, carries the
 * category "Slaanesh" on itself, not on the unit it sits under). */
function collectCategoryNames(root) {
  const out = [];
  for (const sel of walk(root)) {
    for (const cat of sel.categories ?? []) out.push(cat.name);
  }
  return out;
}

/**
 * Some rule text lives once outside any unit and is only *referenced* by
 * units via a shared category — e.g. this roster's Detachment carries one
 * "Marks of Chaos" profile per mark (KHORNE, SLAANESH, ...), and a unit that
 * took "Mark of Slaanesh" carries the category "Slaanesh" but no profile of
 * its own with that rule's text. Build a lookup from category name
 * (uppercased) to that reference profile, from every non-unit selection in
 * the force (Detachment, Show/Hide Options, etc.) — so a unit can pull in
 * the actual rule text for any category it carries, not just the profiles
 * sitting directly in its own subtree.
 */
function collectReferenceInfo(force) {
  const map = new Map();
  for (const sel of force.selections ?? []) {
    if (sel.type === "unit" || sel.type === "model") continue;
    for (const info of collectInfoProfiles(sel)) {
      const key = info.name.toUpperCase();
      if (!map.has(key)) map.set(key, info);
    }
  }
  return map;
}

/** Models are selections with type === "model" that sit under a unit. */
function collectModels(root) {
  const out = [];
  for (const sel of walk(root)) {
    if (sel === root || sel.type !== "model") continue;
    out.push({ name: sel.name, count: sel.number ?? 1, group: sel.group ?? null });
  }
  return out;
}

/**
 * Group a unit's direct model children by their exact wargear signature —
 * weapons AND non-weapon equipment (Narthecium, banners, etc., which parse
 * as `Abilities` profiles, not weapons) — not by New Recruit's own `group`
 * label. Two model selections with different names (e.g. a named sergeant
 * vs. the rank-and-file) merge into one loadout when they carry identical
 * gear; a model whose only difference is a non-weapon item (an Apothecary's
 * Narthecium, say) still gets its own loadout, because that item is part of
 * the signature too. This is what lets a player pick "which kind of model
 * died" precisely, and lets weapon counts be derived from live loadout
 * counts instead of guessed at.
 */
function collectLoadouts(root, idMap) {
  const modelSelections = [...walk(root)].filter((s) => s !== root && s.type === "model");

  if (modelSelections.length === 0) {
    // Single-model unit (a character, walker, etc.) — the unit itself is the
    // only "model": one implicit loadout covering its own weapons, so it
    // still gets a live count instead of silently having none.
    const weapons = collectWeapons(root).map((w) => ({
      profileId: idMap.get(w.profileId) ?? w.profileId,
      name: w.name,
      perModel: w.count,
    }));
    const wargear = collectInfoProfiles(root).map((a) => a.name);
    return [{ key: "self", modelCount: root.number ?? 1, weapons, wargear }];
  }

  const byKey = new Map();
  for (const sel of modelSelections) {
    const modelCount = sel.number ?? 1;
    const weapons = collectWeapons(sel).map((w) => ({
      profileId: idMap.get(w.profileId) ?? w.profileId,
      name: w.name,
      perModel: modelCount ? w.count / modelCount : w.count,
    }));
    const wargear = collectInfoProfiles(sel).map((a) => a.name);
    const key = [...weapons.map((w) => w.profileId), ...wargear].sort().join("|");

    const existing = byKey.get(key);
    if (existing) {
      existing.modelCount += modelCount;
    } else {
      byKey.set(key, { key, modelCount, weapons, wargear });
    }
  }
  return [...byKey.values()];
}

/** Enhancements are selections whose `group` starts with "Enhancements". */
function collectEnhancements(root) {
  const out = [];
  for (const sel of walk(root)) {
    if (!String(sel.group ?? "").startsWith("Enhancements")) continue;
    out.push({ name: sel.name, points: pts(sel) });
  }
  return out;
}

const pts = (sel) => (sel.costs ?? []).find((c) => c.name === "pts")?.value ?? 0;

/** Points including nested enhancements/upgrades. */
function totalPoints(root) {
  let sum = 0;
  for (const sel of walk(root)) sum += pts(sel);
  return sum;
}

function parseUnit(sel, referenceInfo) {
  const unitProfile = [...walk(sel)]
    .flatMap((s) => s.profiles ?? [])
    .find((p) => p.typeName === T_UNIT);
  const c = unitProfile ? chars(unitProfile) : {};

  const ownAbilities = collectInfoProfiles(sel);
  const seen = new Set(ownAbilities.map((a) => `${a.type}|${a.name}`));
  const referencedAbilities = [];
  for (const catName of collectCategoryNames(sel)) {
    const info = referenceInfo.get(catName.toUpperCase());
    const key = info && `${info.type}|${info.name}`;
    if (!info || seen.has(key)) continue;
    seen.add(key);
    referencedAbilities.push(info);
  }
  const abilities = [...ownAbilities, ...referencedAbilities];
  const abilitySections = groupInfoSections(abilities);
  const invuln = abilities.map((a) => parseInvuln(a.name, a.text)).find(Boolean) ?? null;

  // Core-rulebook rules on the unit's own datasheet entry (Deep Strike,
  // Leader, Dark Pacts, Scouts...) — not walked into weapon selections,
  // since those are surfaced per-weapon instead (see `collectRules` above).
  const rules = collectRules(sel);

  const models = collectModels(sel);
  const modelCount = models.length
    ? models.reduce((n, m) => n + m.count, 0)
    : sel.number ?? 1;

  const categories = (sel.categories ?? []).map((x) => x.name);

  const rawWeapons = collectWeapons(sel);
  const idMap = buildCanonicalWeaponIdMap(rawWeapons);
  const weapons = rawWeapons.map((w) => ({
    ...w,
    profileId: idMap.get(w.profileId) ?? w.profileId,
  }));

  return {
    id: sel.id,
    // The unit's entry in the New Recruit catalogue: the last "::" segment of
    // the selection's "<catalogueId>::<entryId>". Used to look up the weapons
    // the datasheet offers (src/data/unit-options).
    entryId:
      typeof sel.entryId === "string" && sel.entryId ? sel.entryId.split("::").pop() : null,
    name: sel.name,
    kind: sel.type, // "unit" | "model"
    basePoints: pts(sel),
    totalPoints: totalPoints(sel),
    modelCount,
    models,
    profile: {
      M: c.M ?? null,
      T: c.T != null ? Number(c.T) : null,
      SV: parseSkill(c.SV),
      W: c.W != null ? Number(c.W) : null,
      LD: c.LD ?? null,
      OC: c.OC != null ? Number(c.OC) : null,
    },
    invuln,
    keywords: categories.filter((n) => !n.startsWith("Faction:")),
    faction: categories.find((n) => n.startsWith("Faction:"))?.slice(9) ?? null,
    isWarlord: [...walk(sel)].some((s) => s.name === "Warlord"),
    enhancements: collectEnhancements(sel),
    weapons,
    loadouts: collectLoadouts(sel, idMap),
    abilities,
    abilitySections,
    rules,
  };
}

export function parseRoster(json) {
  const r = json.roster;
  const force = r.forces[0];

  const config = {};
  for (const sel of force.selections ?? []) {
    if (sel.name === "Battle Size") config.battleSize = sel.selections?.[0]?.name ?? null;
    if (sel.name === "Detachment" || sel.name === "Detachments") {
      const d = sel.selections?.[0];
      config.detachment = d?.name ?? null;
      config.detachmentRules = (d?.rules ?? []).map((x) => x.name);
    }
  }

  const referenceInfo = collectReferenceInfo(force);
  const units = (force.selections ?? [])
    .filter((s) => (s.type === "unit" || s.type === "model") && !CONFIG_NAMES.has(s.name))
    .map((s) => parseUnit(s, referenceInfo));

  return {
    name: r.name,
    system: r.gameSystemName,
    catalogue: force.catalogueName,
    catalogueRevision: force.catalogueRevision,
    generatedBy: r.generatedBy,
    pointsLimit: (r.costLimits ?? []).find((c) => c.name === "pts")?.value ?? null,
    pointsTotal: (r.costs ?? []).find((c) => c.name === "pts")?.value ?? null,
    ...config,
    units,
  };
}

export { parseDice, parseSkill, parseKeywords, parseInvuln };
