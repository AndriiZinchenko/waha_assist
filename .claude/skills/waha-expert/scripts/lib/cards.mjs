// Readable text cards built from Wahapedia tables. `t` maps table name -> row objects.

import { htmlToText } from "./wahapedia.mjs";

const plus = (v) => (/^\d+$/.test(v) ? `${v}+` : v);
// Case-insensitive, and apostrophes (straight or curly) are ignored so "'Ere We Go"
// finds ERE WE GO and "Emperor's Auspice" finds THE EMPEROR’S AUSPICE.
const norm = (s) => s.toLowerCase().replace(/['‘’`]/g, "");

export function findByName(rows, query, key = "name") {
  const q = norm(query);
  const exact = rows.filter((r) => norm(r[key]) === q);
  return exact.length ? exact : rows.filter((r) => norm(r[key]).includes(q));
}

// The 11th edition Wahapedia table still carries the 10th edition core stratagems
// (type "Core – <kind> Stratagem") beside the real 11th edition ones (type
// "Core Stratagem"). Drop the legacy rows so 10th wording is never served as 11th.
export function forEdition(t, edition) {
  if (edition !== "11e" || !t.Stratagems) return t;
  return { ...t, Stratagems: t.Stratagems.filter((s) => !s.type.startsWith("Core – ")) };
}

const factionName = (t, id) => t.Factions.find((f) => f.id === id)?.name ?? id;

export function unitCard(t, sheet) {
  const out = [`# ${sheet.name} — ${factionName(t, sheet.faction_id)}${sheet.role ? ` (${sheet.role})` : ""}`];

  const keywords = t.Datasheets_keywords.filter((k) => k.datasheet_id === sheet.id).map((k) => k.keyword);
  if (keywords.length) out.push(`Keywords: ${keywords.join(", ")}`);

  for (const m of t.Datasheets_models.filter((x) => x.datasheet_id === sheet.id)) {
    // The export writes "-" for no invulnerable save and "4*" for a conditional one.
    const hasInv = m.inv_sv && m.inv_sv !== "-";
    const note = m.inv_sv_descr ? ` (${htmlToText(m.inv_sv_descr)})` : "";
    const inv = hasInv ? `, invuln ${plus(m.inv_sv)}${note}` : "";
    out.push(`${m.name}: M ${m.M}, T ${m.T}, Sv ${m.Sv}${inv}, W ${m.W}, Ld ${m.Ld}, OC ${m.OC}`);
  }

  // Cost rows without a price are tier headings ("YOUR 4TH + UNIT COSTS"); priced rows belong to the last one.
  const tiers = [];
  for (const c of t.Datasheets_models_cost.filter((x) => x.datasheet_id === sheet.id)) {
    if (!c.cost) {
      tiers.push({ label: htmlToText(c.description), items: [] });
    } else {
      if (!tiers.length) tiers.push({ label: "", items: [] });
      tiers[tiers.length - 1].items.push(`${htmlToText(c.description)} ${c.cost}`);
    }
  }
  const priced = tiers.filter((tier) => tier.items.length);
  if (priced.length) {
    const label = (tier) => (priced.length > 1 && tier.label ? `${tier.label}: ` : "");
    out.push(`Points: ${priced.map((tier) => `${label(tier)}${tier.items.join(", ")}`).join("; ")}`);
  }

  const weapons = t.Datasheets_wargear.filter((w) => w.datasheet_id === sheet.id);
  for (const type of ["Ranged", "Melee"]) {
    const list = weapons.filter((w) => w.type === type);
    if (!list.length) continue;
    out.push("", `${type} weapons`);
    for (const w of list) {
      const range = type === "Ranged" ? ` ${w.range}"` : "";
      const kw = w.description ? ` [${htmlToText(w.description)}]` : "";
      const skill = type === "Ranged" ? "BS" : "WS";
      out.push(`- ${w.name}${range}: A ${w.A}, ${skill} ${plus(w.BS_WS)}, S ${w.S}, AP ${w.AP}, D ${w.D}${kw}`);
    }
  }

  const abilities = t.Datasheets_abilities.filter((a) => a.datasheet_id === sheet.id);
  if (abilities.length) {
    out.push("", "Abilities");
    for (const a of abilities) {
      const shared = a.ability_id ? t.Abilities.find((x) => x.id === a.ability_id) : null;
      const name = a.name || shared?.name || "(unnamed)";
      const text = htmlToText(a.description || shared?.description || "");
      const param = a.parameter ? ` ${a.parameter}` : "";
      out.push(`- ${a.type ? `${a.type}: ` : ""}${name}${param}${text ? ` — ${text}` : ""}`);
    }
  }

  const nameOf = (id) => t.Datasheets.find((d) => d.id === id)?.name ?? id;
  const leads = t.Datasheets_leader.filter((l) => l.leader_id === sheet.id).map((l) => nameOf(l.attached_id));
  const ledBy = t.Datasheets_leader.filter((l) => l.attached_id === sheet.id).map((l) => nameOf(l.leader_id));
  if (leads.length || ledBy.length) out.push("");
  if (leads.length) out.push(`Can lead: ${leads.join(", ")}`);
  if (ledBy.length) out.push(`Can be led by: ${ledBy.join(", ")}`);

  return out.join("\n");
}

export function stratagemCard(s) {
  const timing = [s.turn, s.phase].filter(Boolean).join(", ");
  const meta = [s.type, timing].filter(Boolean).join(" · ");
  return [`## ${s.name} — ${s.cp_cost}CP`, meta, htmlToText(s.description)].join("\n");
}

export function detachmentCard(t, d) {
  const extra = [d.dp && `${d.dp} DP`, d.force_disposition && `force disposition: ${d.force_disposition}`].filter(Boolean);
  const out = [`# ${d.name} — ${factionName(t, d.faction_id)}${extra.length ? ` (${extra.join(", ")})` : ""}`];
  if (d.legend) out.push(htmlToText(d.legend));

  const abilities = t.Detachment_abilities.filter((a) => a.detachment_id === d.id);
  if (abilities.length) {
    out.push("", "Detachment rules");
    for (const a of abilities) out.push(`### ${a.name}`, htmlToText(a.description));
  }
  const strats = t.Stratagems.filter((s) => s.detachment_id === d.id);
  if (strats.length) out.push("", "Stratagems", ...strats.map(stratagemCard));
  const enhancements = t.Enhancements.filter((e) => e.detachment_id === d.id);
  if (enhancements.length) {
    out.push("", "Enhancements", ...enhancements.map((e) => `- ${e.name} (${e.cost}pts): ${htmlToText(e.description)}`));
  }
  return out.join("\n");
}

export function lookup(t, kind, query, max = 6) {
  const table = { unit: t.Datasheets, stratagem: t.Stratagems, detachment: t.Detachments }[kind];
  const hits = findByName(table, query);
  if (hits.length === 0) return `No ${kind} matching "${query}" in the data.`;
  const card = { unit: (r) => unitCard(t, r), stratagem: stratagemCard, detachment: (r) => detachmentCard(t, r) }[kind];
  const shown = hits.slice(0, max).map(card).join("\n\n---\n\n");
  if (hits.length <= max) return shown;
  const rest = hits.slice(max, max + 10).map((h) => h.name);
  const tail = hits.length > max + 10 ? ", ..." : "";
  return `${shown}\n\n---\n\n(${hits.length - max} more matches: ${rest.join(", ")}${tail})`;
}
