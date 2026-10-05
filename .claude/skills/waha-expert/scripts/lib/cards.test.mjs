import { describe, expect, it } from "vitest";
import { findByName, unitCard, stratagemCard, detachmentCard, lookup } from "./cards.mjs";

const t = {
  Factions: [{ id: "AC", name: "Adeptus Custodes" }],
  Datasheets: [
    { id: "1", name: "Custodian Guard", faction_id: "AC", role: "Battleline", leader_head: "" },
    { id: "3", name: "Captain-General", faction_id: "AC", role: "Characters", leader_head: "" },
    { id: "9", name: "Bare Unit", faction_id: "AC", role: "", leader_head: "" },
  ],
  Datasheets_models: [
    { datasheet_id: "1", name: "Custodian Guard", M: '6"', T: "6", Sv: "2+", inv_sv: "4+", W: "3", Ld: "6+", OC: "2" },
  ],
  Datasheets_wargear: [
    { datasheet_id: "1", name: "Guardian spear", description: "assault, <b>anti-vehicle</b> 4+", range: "24", type: "Ranged", A: "2", BS_WS: "2", S: "4", AP: "-1", D: "2" },
    { datasheet_id: "1", name: "Guardian spear", description: "", range: "Melee", type: "Melee", A: "5", BS_WS: "2", S: "7", AP: "-2", D: "2" },
  ],
  Datasheets_abilities: [
    { datasheet_id: "1", ability_id: "10", name: "", description: "", type: "Core", parameter: "" },
    { datasheet_id: "1", ability_id: "", name: "Stand Vigil", description: "Each time...<br>second", type: "Datasheet", parameter: "" },
  ],
  Abilities: [{ id: "10", name: "Deep Strike", description: "Can be set up in reserve." }],
  Datasheets_keywords: [
    { datasheet_id: "1", keyword: "Infantry", model: "", is_faction_keyword: "false" },
    { datasheet_id: "1", keyword: "Adeptus Custodes", model: "", is_faction_keyword: "true" },
  ],
  Datasheets_leader: [{ leader_id: "3", attached_id: "1" }],
  Datasheets_models_cost: [
    { datasheet_id: "1", line: "1", description: "YOUR UNIT COSTS", cost: "" },
    { datasheet_id: "1", line: "2", description: "4 models", cost: "170" },
  ],
  Stratagems: [
    { id: "s1", name: "HEROIC INTERVENTION", type: "Core – Strategic Ploy Stratagem", cp_cost: "1", turn: "Opponent's turn", phase: "Charge phase", detachment: "", detachment_id: "", description: "<b>WHEN:</b> x<br><br><b>EFFECT:</b> y" },
    { id: "s2", name: "SHIELD WALL", type: "Shield Host – Battle Tactic Stratagem", cp_cost: "1", turn: "Either player's turn", phase: "Any phase", detachment: "Shield Host", detachment_id: "d1", description: "<b>WHEN:</b> z" },
  ],
  Detachments: [{ id: "d1", faction_id: "AC", name: "Shield Host", legend: "", dp: "2", force_disposition: "Purge the Foe" }],
  Detachment_abilities: [{ id: "a1", faction_id: "AC", name: "Martial Mastery", legend: "", description: "At the start of the battle round, pick one.", detachment: "Shield Host", detachment_id: "d1" }],
  Enhancements: [{ faction_id: "AC", id: "e1", name: "Panoptispex", cost: "25", detachment: "Shield Host", detachment_id: "d1", description: "<b>Bearer</b> can see." }],
};

describe("findByName", () => {
  it("prefers an exact match over substring matches", () => {
    const rows = [{ name: "Guard" }, { name: "Custodian Guard" }];
    expect(findByName(rows, "guard")).toEqual([{ name: "Guard" }]);
    expect(findByName(rows, "custodian").map((r) => r.name)).toEqual(["Custodian Guard"]);
  });
});

describe("unitCard", () => {
  const card = unitCard(t, t.Datasheets[0]);

  it("shows the header, keywords, profile and points", () => {
    expect(card).toContain("# Custodian Guard — Adeptus Custodes (Battleline)");
    expect(card).toContain("Keywords: Infantry, Adeptus Custodes");
    expect(card).toContain('Custodian Guard: M 6", T 6, Sv 2+, invuln 4+, W 3, Ld 6+, OC 2');
    expect(card).toContain("Points: 4 models 170");
  });

  it("shows ranged and melee weapons with their keywords", () => {
    expect(card).toContain('- Guardian spear 24": A 2, BS 2+, S 4, AP -1, D 2 [assault, anti-vehicle 4+]');
    expect(card).toContain("- Guardian spear: A 5, WS 2+, S 7, AP -2, D 2");
  });

  it("resolves shared abilities and keeps datasheet ones", () => {
    expect(card).toContain("- Core: Deep Strike — Can be set up in reserve.");
    expect(card).toContain("- Datasheet: Stand Vigil — Each time...\nsecond");
  });

  it("names the leaders that can attach", () => {
    expect(card).toContain("Can be led by: Captain-General");
  });

  it("lists what a leader can lead", () => {
    expect(unitCard(t, t.Datasheets[1])).toContain("Can lead: Custodian Guard");
  });

  it("leaves out sections a unit has no data for", () => {
    const bare = unitCard(t, t.Datasheets[2]);
    expect(bare).toBe("# Bare Unit — Adeptus Custodes");
    expect(bare).not.toMatch(/undefined|Abilities|Keywords|Points|weapons/);
  });
});

describe("unitCard with the shapes the real export uses", () => {
  const sheet = t.Datasheets[0];
  const model = { datasheet_id: "1", name: "Guard", M: '6"', T: "6", Sv: "2+", W: "3", Ld: "6+", OC: "2" };
  const withModels = (models) => unitCard({ ...t, Datasheets_models: models }, sheet);
  const withCosts = (rows) =>
    unitCard({ ...t, Datasheets_models_cost: rows.map(([description, cost]) => ({ datasheet_id: "1", description, cost })) }, sheet);

  it("adds the + to a bare invulnerable save value", () => {
    expect(withModels([{ ...model, inv_sv: "4", inv_sv_descr: "" }])).toContain("invuln 4+");
  });

  it("omits the invulnerable save when the data uses a dash", () => {
    expect(withModels([{ ...model, inv_sv: "-", inv_sv_descr: "" }])).not.toContain("invuln");
  });

  it("keeps a conditional invulnerable save with its explanation", () => {
    const card = withModels([{ ...model, inv_sv: "4*", inv_sv_descr: "*Only against ranged attacks" }]);
    expect(card).toContain("invuln 4* (*Only against ranged attacks)");
  });

  it("groups tiered points under their headings", () => {
    const card = withCosts([["YOUR 1ST TO 3RD UNITS COST", ""], ["4 models", "170"], ["YOUR 4TH + UNIT COSTS", ""], ["4 models", "180"]]);
    expect(card).toContain("Points: YOUR 1ST TO 3RD UNITS COST: 4 models 170; YOUR 4TH + UNIT COSTS: 4 models 180");
  });

  it("lists several model counts in one tier together", () => {
    expect(withCosts([["4 models", "160"], ["5 models", "200"]])).toContain("Points: 4 models 160, 5 models 200");
  });
});

describe("stratagemCard", () => {
  it("shows cost, timing and cleaned text", () => {
    expect(stratagemCard(t.Stratagems[0])).toBe(
      "## HEROIC INTERVENTION — 1CP\nCore – Strategic Ploy Stratagem · Opponent's turn, Charge phase\nWHEN: x\n\nEFFECT: y",
    );
  });
});

describe("detachmentCard", () => {
  const card = detachmentCard(t, t.Detachments[0]);

  it("shows the detachment, its ability, stratagems and enhancements", () => {
    expect(card).toContain("# Shield Host — Adeptus Custodes (2 DP, force disposition: Purge the Foe)");
    expect(card).toContain("Martial Mastery");
    expect(card).toContain("At the start of the battle round, pick one.");
    expect(card).toContain("## SHIELD WALL — 1CP");
    expect(card).not.toContain("HEROIC INTERVENTION");
    expect(card).toContain("- Panoptispex (25pts): Bearer can see.");
  });
});

describe("lookup", () => {
  it("says so when nothing matches", () => {
    expect(lookup(t, "unit", "Zzz")).toBe('No unit matching "Zzz" in the data.');
  });

  it("caps the cards and lists the remaining matches", () => {
    const many = { ...t, Datasheets: Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, name: `Unit ${i + 1}`, faction_id: "AC", role: "", leader_head: "" })) };
    const out = lookup(many, "unit", "Unit", 6);
    expect(out.split("\n\n---\n\n")).toHaveLength(7); // six cards plus the "more matches" line
    expect(out).toContain("(2 more matches: Unit 7, Unit 8)");
  });

  it("finds a stratagem by name", () => {
    expect(lookup(t, "stratagem", "heroic")).toContain("HEROIC INTERVENTION — 1CP");
  });
});
