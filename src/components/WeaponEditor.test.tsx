import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { UnitOptionsResult } from "../data/unit-options";
import type { UnitWeaponOverride } from "../lib/weaponOverrides";
import { WeaponEditor, WeaponPicker } from "./WeaponEditor";

const unit: ParsedUnit = {
  id: "guard", entryId: "e-guard", name: "Custodian Guard", kind: "unit",
  basePoints: 150, totalPoints: 150, modelCount: 5, models: [],
  profile: { M: '6"', T: 6, SV: 2, W: 3, LD: "6+", OC: 2 },
  invuln: null, keywords: [], faction: null, isWarlord: false, enhancements: [],
  weapons: [], loadouts: [], abilities: [], abilitySections: [], rules: [],
};

const override: UnitWeaponOverride = {
  groups: [{ key: "g1", modelCount: 5, weapons: [{ name: "Sentinel blade", perModel: 1 }] }],
  rosterSignature: "5xsentinel blade",
};

const options: UnitOptionsResult = {
  name: "Custodian Guard",
  rules: {},
  weapons: [
    {
      name: "Guardian Spear",
      rules: [],
      profiles: [
        { id: "sp-m", name: "Guardian Spear", type: "melee", range: "Melee", attacks: "5", skill: "2+", strength: 7, ap: -2, damage: "2", keywords: "-" },
      ],
    },
    {
      name: "Misericordia",
      rules: [],
      profiles: [
        { id: "mi", name: "Misericordia", type: "melee", range: "Melee", attacks: "4", skill: "2+", strength: 4, ap: -1, damage: "1", keywords: "-" },
      ],
    },
  ],
};

const noop = () => {};

describe("WeaponEditor without weapon options", () => {
  it("says so, and still lets an existing edit be reset", () => {
    const html = renderToStaticMarkup(
      <WeaponEditor unit={unit} override={override} options={null} onChange={noop} onClose={noop} />,
    );
    expect(html).toContain("No weapon options");
    expect(html).toContain("Reset to roster");
  });

  it("offers no reset when there is no edit to undo", () => {
    const html = renderToStaticMarkup(
      <WeaponEditor unit={unit} override={null} options={null} onChange={noop} onClose={noop} />,
    );
    expect(html).toContain("No weapon options");
    expect(html).not.toContain("Reset to roster");
  });
});

describe("WeaponPicker", () => {
  it("marks weapons the group already carries, case-insensitively, and only those", () => {
    const html = renderToStaticMarkup(
      <WeaponPicker
        title="Add a weapon"
        options={options}
        taken={["guardian SPEAR"]}
        onPick={noop}
        onCancel={noop}
      />,
    );
    expect(html.match(/In this group/g)).toHaveLength(1);
    const spearAt = html.indexOf("Guardian Spear");
    const miseAt = html.indexOf("Misericordia");
    const markAt = html.indexOf("In this group");
    expect(markAt).toBeGreaterThan(spearAt);
    expect(markAt).toBeLessThan(miseAt);
  });

  it("lists every option with its stat line", () => {
    const html = renderToStaticMarkup(
      <WeaponPicker title="Replace X" options={options} taken={[]} onPick={noop} onCancel={noop} />,
    );
    expect(html).toContain("Replace X");
    expect(html).toContain("Guardian Spear");
    expect(html).toContain("A5 WS2+ S7 AP-2 D2");
    expect(html).not.toContain("In this group");
  });
});
