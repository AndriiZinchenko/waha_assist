import { readFileSync } from "node:fs";
import { parseRoster, parseDice, parseSkill, parseInvuln } from "./parseRoster.mjs";

// Fixture transcribed from the shape of the real Grey Knights export:
// a squad with mixed models, a character with an enhancement, and a
// multi-profile melee weapon.
const fixture = {
  roster: {
    name: "Grey all",
    gameSystemName: "Warhammer 40,000 10th Edition",
    generatedBy: "https://newrecruit.eu",
    costs: [{ name: "pts", value: 2000 }],
    costLimits: [{ name: "pts", value: 2000 }],
    forces: [
      {
        name: "Army Roster",
        catalogueName: "Imperium - Grey Knights",
        catalogueRevision: 107,
        selections: [
          {
            name: "Battle Size", type: "upgrade", number: 1,
            selections: [{ name: "Strike Force (2000 Point limit)", type: "upgrade", number: 1 }],
          },
          {
            name: "Detachment", type: "upgrade", number: 1,
            selections: [{
              name: "Warpbane Task Force", type: "upgrade", number: 1,
              rules: [{ name: "Hallowed Ground", description: "..." }],
            }],
          },
          { name: "Show/Hide Options", type: "upgrade", number: 1, selections: [] },
          {
            id: "0zodqb", name: "Castellan Crowe", type: "model", number: 1,
            costs: [{ name: "pts", value: 90 }],
            categories: [
              { name: "Faction: Grey Knights" }, { name: "Infantry" }, { name: "Character" },
            ],
            profiles: [
              { id: "u1", name: "Castellan Crowe", typeName: "Unit", characteristics: [
                { name: "M", $text: '6"' }, { name: "T", $text: "4" },
                { name: "SV", $text: "2+" }, { name: "W", $text: "5" },
                { name: "LD", $text: "6+" }, { name: "OC", $text: "1" },
              ]},
              { id: "a1", name: "Invulnerable Save (4+)", typeName: "Abilities",
                characteristics: [{ name: "Description", $text: "This model has a 4+ invulnerable save." }] },
            ],
            selections: [
              { id: "s1", name: "Purifying Flame", type: "upgrade", number: 1, profiles: [
                { id: "73f3-22f9-3831-441a", name: "Purifying Flame", typeName: "Ranged Weapons", characteristics: [
                  { name: "Range", $text: '18"' }, { name: "A", $text: "3" }, { name: "BS", $text: "2+" },
                  { name: "S", $text: "4" }, { name: "AP", $text: "-2" }, { name: "D", $text: "1" },
                  { name: "Keywords", $text: "Anti-Infantry 2+, Ignores Cover, Psychic" },
                ]},
              ]},
            ],
          },
          {
            id: "hx1q9z", name: "Brotherhood Terminator Squad", type: "unit", number: 1,
            costs: [{ name: "pts", value: 185 }],
            categories: [{ name: "Faction: Grey Knights" }, { name: "Terminator" }, { name: "Infantry" }],
            profiles: [
              { id: "u2", name: "Brotherhood Terminator Squad", typeName: "Unit", characteristics: [
                { name: "M", $text: '5"' }, { name: "T", $text: "5" }, { name: "SV", $text: "2+" },
                { name: "W", $text: "3" }, { name: "LD", $text: "6+" }, { name: "OC", $text: "2" },
              ]},
              { id: "a2", name: "Invulnerable Save (4+) [Brotherhood Terminator Squad]", typeName: "Abilities",
                characteristics: [{ name: "Description", $text: "Models in this unit have a 4+ invulnerable save." }] },
            ],
            selections: [
              { id: "m1", name: "Justicar", type: "model", number: 1, group: "Justicar", selections: [
                { id: "w1", name: "Storm bolter", type: "upgrade", number: 1, profiles: [
                  { id: "9756-e60b-776b-cf23", name: "Storm bolter", typeName: "Ranged Weapons", characteristics: [
                    { name: "Range", $text: '24"' }, { name: "A", $text: "2" }, { name: "BS", $text: "3+" },
                    { name: "S", $text: "4" }, { name: "AP", $text: "0" }, { name: "D", $text: "1" },
                    { name: "Keywords", $text: "Rapid Fire 2" },
                  ]},
                ]},
              ]},
              { id: "m2", name: "Terminator", type: "model", number: 3, group: "3-9 Terminators", selections: [
                { id: "w2", name: "Storm bolter", type: "upgrade", number: 3, profiles: [
                  { id: "9756-e60b-776b-cf23", name: "Storm bolter", typeName: "Ranged Weapons", characteristics: [
                    { name: "Range", $text: '24"' }, { name: "A", $text: "2" }, { name: "BS", $text: "3+" },
                    { name: "S", $text: "4" }, { name: "AP", $text: "0" }, { name: "D", $text: "1" },
                    { name: "Keywords", $text: "Rapid Fire 2" },
                  ]},
                ]},
              ]},
              { id: "m3", name: "Terminator with Narthecium", type: "model", number: 1, group: "3-9 Terminators",
                selections: [] },
            ],
          },
          {
            id: "jxndblf", name: "Grand Master in Nemesis Dreadknight", type: "model", number: 1,
            costs: [{ name: "pts", value: 225 }],
            categories: [{ name: "Faction: Grey Knights" }, { name: "Vehicle" }, { name: "Walker" }],
            profiles: [
              { id: "u3", name: "Grand Master in Nemesis Dreadknight", typeName: "Unit", characteristics: [
                { name: "M", $text: '8"' }, { name: "T", $text: "8" }, { name: "SV", $text: "2+" },
                { name: "W", $text: "13" }, { name: "LD", $text: "6+" }, { name: "OC", $text: "4" },
              ]},
            ],
            selections: [
              { id: "e1", name: "Mandulian Reliquary", type: "upgrade", number: 1,
                group: "Enhancements::Warpbane Task Force Enhancements",
                costs: [{ name: "pts", value: 20 }], profiles: [] },
              { id: "w3", name: "Nemesis greatsword", type: "upgrade", number: 1, profiles: [
                { id: "bfc1", name: "➤ Nemesis greatsword - strike", typeName: "Melee Weapons", characteristics: [
                  { name: "Range", $text: "Melee" }, { name: "A", $text: "5" }, { name: "WS", $text: "2+" },
                  { name: "S", $text: "10" }, { name: "AP", $text: "-2" }, { name: "D", $text: "D6" },
                  { name: "Keywords", $text: "Psychic" },
                ]},
                { id: "28af", name: "➤ Nemesis greatsword - sweep", typeName: "Melee Weapons", characteristics: [
                  { name: "Range", $text: "Melee" }, { name: "A", $text: "10" }, { name: "WS", $text: "2+" },
                  { name: "S", $text: "5" }, { name: "AP", $text: "-1" }, { name: "D", $text: "1" },
                  { name: "Keywords", $text: "Psychic" },
                ]},
              ]},
              { id: "w4", name: "Heavy incinerator", type: "upgrade", number: 1, profiles: [
                { id: "e53e", name: "Heavy incinerator", typeName: "Ranged Weapons", characteristics: [
                  { name: "Range", $text: '18"' }, { name: "A", $text: "2D6" }, { name: "BS", $text: "N/A" },
                  { name: "S", $text: "6" }, { name: "AP", $text: "-1" }, { name: "D", $text: "1" },
                  { name: "Keywords", $text: "Ignores Cover, Torrent" },
                ]},
              ]},
            ],
          },
        ],
      },
    ],
  },
};

// --- unit checks on the helpers -------------------------------------------
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`, ok ? "" : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};

eq("parseDice('2D6').avg", parseDice("2D6").avg, 7);
eq("parseDice('D3+1').avg", parseDice("D3+1").avg, 3);
eq("parseDice('D6').avg", parseDice("D6").avg, 3.5);
eq("parseDice('6').avg", parseDice("6").avg, 6);
eq("parseSkill('3+')", parseSkill("3+"), 3);
eq("parseSkill('N/A')", parseSkill("N/A"), null);
eq("parseInvuln 5+*", parseInvuln("Invulnerable Save (5+*)"), { value: 5, conditional: true });
eq(
  "parseInvuln falls back to Description text when the name has no value (Custodes export)",
  parseInvuln("Invulnerable Save", "This model has a 4+ invulnerable save."),
  { value: 4, conditional: false },
);
eq(
  "parseInvuln text fallback also matches the unit-wide phrasing",
  parseInvuln("Invulnerable Save", "Models in this unit have a 4+ invulnerable save."),
  { value: 4, conditional: false },
);
eq(
  "parseInvuln does not pattern-match unrelated ability text",
  parseInvuln("Some Other Ability", "This model has a 4+ invulnerable save."),
  null,
);
eq(
  "parseInvuln returns null when neither name nor text carries a value",
  parseInvuln("Invulnerable Save", null),
  null,
);

// --- full parse ------------------------------------------------------------
const army = parseRoster(fixture);

// --- loadouts: Terminator Squad merges Justicar + 3 Terminators (identical
// wargear) into one loadout, keeping the Narthecium model as a separate one,
// even though New Recruit's own `group` label lumps the latter two together.
const termSquad = army.units.find((u) => u.name === "Brotherhood Terminator Squad");
const termLoadouts = [...termSquad.loadouts].sort((a, b) => b.modelCount - a.modelCount);
eq("Terminator Squad has 2 distinct loadouts", termLoadouts.length, 2);
eq("Terminator Squad bolter loadout model count", termLoadouts[0].modelCount, 4);
eq("Terminator Squad narthecium loadout model count", termLoadouts[1].modelCount, 1);

// --- loadouts against the real Grey Knights export: Purifier Squad is the
// three-way split (bolter / incinerator / psycannon) with a named sergeant
// (Knight of the Flame) sharing the rank-and-file's exact loadout.
const realArmy = parseRoster(
  JSON.parse(readFileSync(new URL("./armies/grey-knights.json", import.meta.url))),
);
const purifiers = realArmy.units.find((u) => u.name === "Purifier Squad");
const purifierLoadouts = [...purifiers.loadouts].sort((a, b) => b.modelCount - a.modelCount);
eq("Purifier Squad has 3 distinct loadouts", purifierLoadouts.length, 3);
eq(
  "Purifier Squad loadout model counts",
  purifierLoadouts.map((l) => l.modelCount),
  [6, 2, 2],
);
eq(
  "Purifier Squad bolter loadout weapon names",
  purifierLoadouts[0].weapons.map((w) => w.name).sort(),
  ["Nemesis force weapon", "Purifying Flame", "Storm bolter"],
);

// --- loadouts against the real export again: non-weapon wargear (Narthecium,
// a banner) must distinguish a loadout on its own — it parses as an
// `Abilities` profile, not a weapon, so it's invisible to weapon-only
// grouping. A model whose only "extra" is a Narthecium must not collapse
// into the same loadout as models that share its weapons but lack it.
const realTerminators = realArmy.units.find((u) => u.name === "Brotherhood Terminator Squad");
const realTermLoadouts = [...realTerminators.loadouts].sort((a, b) => b.modelCount - a.modelCount);
eq("real Terminator Squad has 2 distinct loadouts", realTermLoadouts.length, 2);
eq(
  "real Terminator Squad bolter loadout has no wargear",
  realTermLoadouts[0].wargear,
  [],
);
eq(
  "real Terminator Squad narthecium loadout is distinguished by wargear",
  realTermLoadouts[1].wargear,
  ["Apothecary's narthecium"],
);

const paladins = realArmy.units.find((u) => u.name === "Paladin Squad");
const paladinLoadouts = [...paladins.loadouts].sort((a, b) => b.modelCount - a.modelCount);
eq("Paladin Squad has 3 distinct loadouts", paladinLoadouts.length, 3);
eq(
  "Paladin Squad loadout model counts",
  paladinLoadouts.map((l) => l.modelCount),
  [3, 1, 1],
);
const paladinWargearSets = paladinLoadouts.map((l) => [...l.wargear].sort());
eq("Paladin Squad wargear per loadout", paladinWargearSets, [
  [],
  ["Ancient's Banner"],
  ["Apothecary's narthecium"],
]);

// --- canonical weapon ids: New Recruit gave the Prosecutor Sister Superior's
// Boltgun and Close combat weapon a *different* profileId than the
// rank-and-file's, even though every stat is identical. Two loadouts with
// text-identical weapon-based labels ("Boltgun + Close combat weapon" on
// both) is what that split looks like from the label side; the actual fix
// is recognizing they're the same loadout, not just relabeling them.
const realCustodes = parseRoster(
  JSON.parse(readFileSync(new URL("./armies/Custody’s 1990.json", import.meta.url))),
);
const prosecutors = realCustodes.units.find((u) => u.name === "Prosecutors");
eq("Prosecutors (Sister Superior + rank-and-file) merge into 1 loadout", prosecutors.loadouts.length, 1);
eq("Prosecutors merged loadout has all 5 models", prosecutors.loadouts[0].modelCount, 5);
const prosecutorWeaponIds = new Set(prosecutors.weapons.map((w) => w.profileId));
eq(
  "Prosecutors' raw weapon list uses the same canonical id per weapon, not New Recruit's original 4",
  prosecutorWeaponIds.size,
  2,
);

// --- multi-mode weapons detected structurally, not by New Recruit's
// optional "-> Name - mode" naming convention: a Custodes Sentinel Blade
// carries a melee profile and a ranged profile under ONE weapon selection,
// both literally named "Sentinel Blade" with no "->" marker at all — the
// exact shape that a naming-only subProfile check misses.
const custodianGuard = realCustodes.units.find((u) => u.name === "Custodian Guard");
const bladeProfiles = custodianGuard.weapons.filter((w) => w.name === "Sentinel Blade");
eq("Custodian Guard has both Sentinel Blade profiles (melee + ranged)", bladeProfiles.length, 2);
eq(
  "both Sentinel Blade profiles are marked subProfile despite no ➤ marker",
  bladeProfiles.every((w) => w.subProfile === true),
  true,
);
eq(
  "Sentinel Blade profiles keep their distinct types",
  bladeProfiles.map((w) => w.type).sort(),
  ["melee", "ranged"],
);

// --- canonical weapon ids must stay scoped per unit: two same-named weapons
// with genuinely different stats (as documented in parser-summary.md) must
// never merge just because canonicalization exists.
const sameNameDifferentStats = {
  roster: {
    name: "sig test",
    gameSystemName: "x",
    generatedBy: "test",
    costs: [],
    costLimits: [],
    forces: [
      {
        name: "Army Roster",
        catalogueName: "Test",
        catalogueRevision: 1,
        selections: [
          {
            id: "u1",
            name: "Mixed Squad",
            type: "unit",
            number: 1,
            selections: [
              {
                id: "m1", name: "Model A", type: "model", number: 1,
                selections: [{
                  id: "w1", name: "Force weapon", type: "upgrade", number: 1,
                  profiles: [{ id: "p1", name: "Force weapon", typeName: "Melee Weapons", characteristics: [
                    { name: "Range", $text: "Melee" }, { name: "A", $text: "3" }, { name: "WS", $text: "2+" },
                    { name: "S", $text: "6" }, { name: "AP", $text: "-2" }, { name: "D", $text: "2" }, { name: "Keywords", $text: "-" },
                  ]}],
                }],
              },
              {
                id: "m2", name: "Model B", type: "model", number: 1,
                selections: [{
                  id: "w2", name: "Force weapon", type: "upgrade", number: 1,
                  profiles: [{ id: "p2", name: "Force weapon", typeName: "Melee Weapons", characteristics: [
                    { name: "Range", $text: "Melee" }, { name: "A", $text: "4" }, { name: "WS", $text: "3+" },
                    { name: "S", $text: "8" }, { name: "AP", $text: "-1" }, { name: "D", $text: "1" }, { name: "Keywords", $text: "-" },
                  ]}],
                }],
              },
            ],
          },
        ],
      },
    ],
  },
};
const sigArmy = parseRoster(sameNameDifferentStats);
const mixedSquad = sigArmy.units.find((u) => u.name === "Mixed Squad");
eq(
  "same-named weapons with different stats stay 2 distinct loadouts",
  mixedSquad.loadouts.length,
  2,
);

// --- loadouts for a single-model unit (no `type: "model"` children of its
// own): still gets exactly one implicit loadout, not zero.
const crowe = army.units.find((u) => u.name === "Castellan Crowe");
eq("Castellan Crowe has 1 implicit loadout", crowe.loadouts.length, 1);
eq("Castellan Crowe loadout model count", crowe.loadouts[0].modelCount, 1);
eq(
  "Castellan Crowe loadout weapon names",
  crowe.loadouts[0].weapons.map((w) => w.name),
  ["Purifying Flame"],
);

console.log("\n=== ARMY ===");
console.log(army.name, "|", army.catalogue, "|", army.battleSize, "|", army.detachment);
console.log("detachment rules:", army.detachmentRules);

for (const u of army.units) {
  console.log(`\n${u.name}  [${u.kind}]  ${u.totalPoints}pts  ${u.modelCount} model(s)`);
  console.log(`  T${u.profile.T} Sv${u.profile.SV}+ W${u.profile.W} OC${u.profile.OC}` +
    (u.invuln ? `  invuln ${u.invuln.value}+${u.invuln.conditional ? " (conditional)" : ""}` : ""));
  if (u.enhancements.length) console.log("  enhancements:", u.enhancements.map(e => `${e.name} (${e.points})`).join(", "));
  if (u.models.length) console.log("  models:", u.models.map(m => `${m.count}x ${m.name}`).join(", "));
  for (const w of u.weapons) {
    const skill = w.skill ? `${w.skill}+` : "auto";
    console.log(`    ${String(w.count).padStart(2)}x ${w.name.padEnd(34)} ` +
      `A ${String(w.attacks.raw).padEnd(4)} ${skill.padEnd(4)} S${String(w.strength).padEnd(2)} ` +
      `AP${String(w.ap).padEnd(2)} D${String(w.damage.raw).padEnd(3)} ${w.keywords.join(", ")}`);
  }
}
