import { describe, expect, it } from "vitest";
import {
  buildFactionOptions,
  collectRuleTexts,
  indexNodes,
  renderFactionFile,
  renderFactionsIndex,
  unitEntriesFromRoster,
  weaponOptionsForEntry,
} from "./unitOptions.mjs";

function profile(id, name, typeName, chars) {
  return {
    id,
    name,
    typeName,
    characteristics: Object.entries(chars).map(([k, v]) => ({ name: k, $text: v })),
  };
}

const spearMelee = profile("p-spear-m", "Guardian Spear", "Melee Weapons", {
  Range: "Melee", A: "5", WS: "2+", S: "7", AP: "-2", D: "2", Keywords: "-",
});
const spearRanged = profile("p-spear-r", "Guardian Spear", "Ranged Weapons", {
  Range: '24"', A: "2", BS: "2+", S: "4", AP: "-1", D: "2", Keywords: "Assault",
});
const bladeMelee = profile("p-blade-m", "Sentinel Blade", "Melee Weapons", {
  Range: "Melee", A: "5", WS: "2+", S: "6", AP: "-2", D: "1", Keywords: "-",
});

const core = {
  sharedRules: [
    { id: "r-assault", name: "Assault", description: "Assault rule text." },
    { id: "r-blast", name: "Blast", description: "Blast rule text." },
  ],
};

function catalogue(extraChildren = []) {
  return {
    sharedSelectionEntries: [
      {
        id: "sel-blade",
        name: "Sentinel blade",
        type: "upgrade",
        profiles: [bladeMelee],
      },
      {
        id: "unit-guard",
        name: "Custodian Guard",
        type: "unit",
        selectionEntryGroups: [
          {
            id: "grp",
            name: "Weapons",
            selectionEntries: [
              {
                id: "sel-spear",
                name: "Guardian Spear",
                type: "upgrade",
                profiles: [spearMelee, spearRanged],
                infoLinks: [{ id: "l1", name: "Assault", type: "rule", targetId: "r-assault" }],
              },
            ],
            entryLinks: [
              { id: "lnk-blade", name: "Sentinel blade", type: "selectionEntry", targetId: "sel-blade" },
            ],
          },
          ...extraChildren,
        ],
      },
    ],
  };
}

describe("indexNodes", () => {
  it("indexes nested nodes by id, first one winning", () => {
    const byId = indexNodes([catalogue()]);
    expect(byId.get("sel-spear").name).toBe("Guardian Spear");
    expect(byId.get("grp").name).toBe("Weapons");
  });
});

describe("weaponOptionsForEntry", () => {
  it("returns null for an unknown entry", () => {
    expect(weaponOptionsForEntry("nope", indexNodes([catalogue()]))).toBeNull();
  });

  it("lists weapon entries with every profile parsed and the rules they reference", () => {
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue(), core]));
    const spear = options.find((o) => o.name === "Guardian Spear");
    expect(spear.rules).toEqual(["Assault"]);
    expect(spear.profiles).toEqual([
      {
        id: "p-spear-m", name: "Guardian Spear", type: "melee", range: "Melee",
        attacks: "5", skill: "2+", strength: 7, ap: -2, damage: "2", keywords: "-",
      },
      {
        id: "p-spear-r", name: "Guardian Spear", type: "ranged", range: '24"',
        attacks: "2", skill: "2+", strength: 4, ap: -1, damage: "2", keywords: "Assault",
      },
    ]);
  });

  it("follows entry links and keeps the link's own name", () => {
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue()]));
    expect(options.map((o) => o.name)).toEqual(["Guardian Spear", "Sentinel blade"]);
  });

  it("skips Crusade content", () => {
    const crusade = {
      id: "crusade",
      name: "Crusade",
      selectionEntries: [
        { id: "x", name: "Weapon Modifications", profiles: [spearMelee] },
        { id: "y", name: "Relic blade", profiles: [bladeMelee] },
      ],
    };
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue([crusade])]));
    expect(options.map((o) => o.name)).toEqual(["Guardian Spear", "Sentinel blade"]);
  });

  it("de-duplicates options by name, first one winning", () => {
    const dup = {
      id: "grp2",
      name: "More weapons",
      selectionEntries: [
        { id: "sel-spear-2", name: "Guardian Spear", profiles: [bladeMelee] },
      ],
    };
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue([dup])]));
    expect(options.filter((o) => o.name === "Guardian Spear")).toHaveLength(1);
    expect(options.find((o) => o.name === "Guardian Spear").profiles[0].id).toBe("p-spear-m");
  });

  it("survives a link back to an ancestor", () => {
    const loop = {
      id: "loop",
      name: "Loop",
      entryLinks: [{ id: "back", name: "Custodian Guard", targetId: "unit-guard" }],
    };
    const options = weaponOptionsForEntry("unit-guard", indexNodes([catalogue([loop])]));
    expect(options.map((o) => o.name)).toEqual(["Guardian Spear", "Sentinel blade"]);
  });
});

describe("collectRuleTexts", () => {
  it("reads shared and inline rules, first one winning", () => {
    const roots = [
      core,
      { sharedRules: [{ id: "dup", name: "Assault", description: "Later text." }] },
      { selectionEntries: [{ id: "e", name: "E", rules: [{ id: "i", name: "Inline", description: " Inline text. " }] }] },
    ];
    expect(collectRuleTexts(roots)).toEqual({
      Assault: "Assault rule text.",
      Blast: "Blast rule text.",
      Inline: "Inline text.",
    });
  });
});

describe("unitEntriesFromRoster", () => {
  it("returns each unit's catalogue entry id and name, skipping config selections", () => {
    const json = {
      roster: {
        forces: [
          {
            selections: [
              { name: "Battle Size", type: "upgrade", entryId: "cat::bs" },
              { name: "Custodian Guard", type: "unit", entryId: "cat::unit-guard" },
              { name: "No id", type: "unit" },
            ],
          },
        ],
      },
    };
    expect(unitEntriesFromRoster(json)).toEqual([
      { entryId: "unit-guard", name: "Custodian Guard" },
    ]);
  });
});

describe("buildFactionOptions", () => {
  it("keeps only referenced rules, sorts them and reports entries it cannot find", () => {
    const { options, missing } = buildFactionOptions({
      catalogue: "Imperium - Adeptus Custodes",
      roots: [catalogue(), core],
      entries: [
        { entryId: "unit-guard", name: "Custodian Guard" },
        { entryId: "unit-guard", name: "Custodian Guard" },
        { entryId: "ghost", name: "Ghost Unit" },
      ],
    });
    expect(missing).toEqual(["Ghost Unit"]);
    expect(options.catalogue).toBe("Imperium - Adeptus Custodes");
    expect(options.rules).toEqual({ Assault: "Assault rule text." });
    expect(Object.keys(options.units)).toEqual(["unit-guard"]);
    expect(options.units["unit-guard"].name).toBe("Custodian Guard");
  });
});

describe("rendering", () => {
  const options = { catalogue: "Imperium - Adeptus Custodes", rules: {}, units: {} };

  it("renders a faction file as a typed constant", () => {
    const text = renderFactionFile("imperiumAdeptusCustodes", options);
    expect(text).toContain('import type { FactionUnitOptions } from "./types";');
    expect(text).toContain("export const imperiumAdeptusCustodes: FactionUnitOptions = {");
    expect(text).toContain('"catalogue": "Imperium - Adeptus Custodes"');
    expect(text).toContain("Generated by scripts/sync-unit-options.mjs");
  });

  it("renders the factions index", () => {
    const text = renderFactionsIndex([
      { constName: "chaosSpaceMarines", stem: "chaos-space-marines" },
      { constName: "xenosOrks", stem: "xenos-orks" },
    ]);
    expect(text).toContain('import { chaosSpaceMarines } from "./chaos-space-marines";');
    expect(text).toContain("export const factionOptions: FactionUnitOptions[] = [");
    expect(text).toContain("  xenosOrks,");
  });
});

describe("weaponOptionsForEntry: shared profiles", () => {
  const sharedBoltPistol = profile("p-bolt-pistol", "Bolt pistol", "Ranged Weapons", {
    Range: '12"', A: "1", BS: "3+", S: "4", AP: "0", D: "1", Keywords: "Pistol",
  });
  const sharedAbility = profile("p-ability", "Oath of Moment", "Abilities", { Description: "x" });

  function sharedCatalogue(infoLinks) {
    return {
      sharedProfiles: [sharedBoltPistol, sharedAbility],
      sharedSelectionEntries: [
        {
          id: "unit-legionaries",
          name: "Legionaries",
          type: "unit",
          selectionEntries: [{ id: "sel-bp", name: "Bolt pistol", type: "upgrade", infoLinks }],
        },
      ],
    };
  }

  it("reads a weapon whose profile is attached through a profile info link", () => {
    const cat = sharedCatalogue([
      { id: "il1", name: "Bolt pistol", type: "profile", targetId: "p-bolt-pistol" },
    ]);
    expect(weaponOptionsForEntry("unit-legionaries", indexNodes([cat]))).toEqual([
      {
        name: "Bolt pistol",
        rules: [],
        profiles: [
          {
            id: "p-bolt-pistol", name: "Bolt pistol", type: "ranged", range: '12"',
            attacks: "1", skill: "3+", strength: 4, ap: 0, damage: "1", keywords: "Pistol",
          },
        ],
      },
    ]);
  });

  it("ignores a profile link that is not a weapon, and one that points nowhere", () => {
    const cat = sharedCatalogue([
      { id: "il2", name: "Oath of Moment", type: "profile", targetId: "p-ability" },
      { id: "il3", name: "Ghost", type: "profile", targetId: "nope" },
    ]);
    expect(weaponOptionsForEntry("unit-legionaries", indexNodes([cat]))).toEqual([]);
  });
});

describe("core abilities", () => {
  it("picks the definition of each listed core ability and names the ones missing", async () => {
    const { pickCoreAbilities, CORE_ABILITY_NAMES } = await import("./unitOptions.mjs");
    const texts = Object.fromEntries(CORE_ABILITY_NAMES.map((n) => [n, `${n} text`]));
    delete texts.Hover;
    texts.Pistol = "not a unit ability";
    const { found, missing } = pickCoreAbilities(texts);
    expect(missing).toEqual(["Hover"]);
    expect(found["Lone Operative"]).toBe("Lone Operative text");
    expect(found.Pistol).toBeUndefined();
  });

  it("renders them as a typed constant", async () => {
    const { renderCoreAbilities } = await import("./unitOptions.mjs");
    const text = renderCoreAbilities({ Stealth: "Hidden." });
    expect(text).toContain("export const CORE_ABILITIES: Record<string, string> = {");
    expect(text).toContain('"Stealth": "Hidden."');
    expect(text).toContain("Generated by scripts/sync-unit-options.mjs");
  });
});
