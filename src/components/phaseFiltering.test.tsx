import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { PhaseFilterContext } from "../lib/phaseFilter";
import type { Phase } from "../lib/phases";
import { PhaseFilterBar } from "./PhaseFilterBar";
import { UnitInfo } from "./UnitInfo";
import { UnitRules } from "./UnitRules";
import { UnitStratagems } from "./UnitStratagems";

const abilities = [
  { name: "Blessing", text: "In your Command phase, heal one model.", type: "Abilities" },
  { name: "Stoic", text: "Ignore the first wound each turn.", type: "Abilities" },
  { name: "Oath", text: "At the start of the Fight phase, pick a target.", type: "Special" },
];

const unit = {
  id: "u", entryId: null, name: "Techmarine", kind: "unit", basePoints: 0, totalPoints: 0,
  modelCount: 1, models: [], profile: { M: '6"', T: 4, SV: 3, W: 4, LD: "6+", OC: 1 },
  invuln: null, keywords: [], faction: null, isWarlord: false, enhancements: [],
  weapons: [], loadouts: [],
  abilities,
  abilitySections: [
    { type: "Abilities", items: [abilities[0], abilities[1]] },
    { type: "Special", items: [abilities[2]] },
  ],
  rules: [
    { name: "Scouts", text: "At the start of the first battle round, move." },
    { name: "Fervour", text: "Each time in the Charge phase, add 1." },
  ],
} as unknown as ParsedUnit;

const detachment: DetachmentData = {
  name: "Test Force",
  faction: "x",
  rules: [],
  stratagems: [
    { name: "Gun Rush", cost: 1, phase: "Your Shooting phase", text: "TARGET: x" },
    { name: "Hold Fast", cost: 1, phase: "Your Movement phase", text: "TARGET: y" },
    { name: "Anytime", cost: 1, phase: "Any phase", text: "TARGET: z" },
  ],
};

function inPhase(phase: Phase | null, node: ReactNode, showAll = false): string {
  return renderToStaticMarkup(
    <PhaseFilterContext.Provider value={{ phase, showAll, setShowAll: () => {} }}>
      {node}
    </PhaseFilterContext.Provider>,
  );
}

describe("UnitInfo", () => {
  it("lists what names the phase first, tagged, and folds the rest under Other (N)", () => {
    const html = inPhase("command", <UnitInfo unit={unit} />);
    expect(html).toContain("Blessing");
    expect(html).not.toContain("Stoic");
    expect(html).not.toContain("Oath");
    expect(html).toContain("Other (2)");
    expect(html).toContain(">Command<");
  });

  it("shows everything, untagged, with no filter, and with Show all on", () => {
    for (const html of [
      inPhase(null, <UnitInfo unit={unit} />),
      inPhase("command", <UnitInfo unit={unit} />, true),
    ]) {
      expect(html).toContain("Blessing");
      expect(html).toContain("Stoic");
      expect(html).toContain("Oath");
      expect(html).not.toContain("Other (");
      expect(html).not.toContain(">Command<");
    }
  });
});

describe("UnitRules", () => {
  it("lists what names the phase first, tagged, and folds the rest", () => {
    const html = inPhase("charge", <UnitRules unit={unit} />);
    expect(html).toContain("Fervour");
    expect(html).not.toContain("Scouts");
    expect(html).toContain("Other (1)");
    expect(html).toContain(">Charge<");
  });

  it("shows every rule, untagged, with no filter", () => {
    const html = inPhase(null, <UnitRules unit={unit} />);
    expect(html).toContain("Fervour");
    expect(html).toContain("Scouts");
    expect(html).not.toContain("Other (");
  });
});

describe("UnitStratagems", () => {
  const strategems = (phase: Phase | null, showAll = false) =>
    inPhase(phase, <UnitStratagems unit={unit} detachmentData={detachment} />, showAll);

  it("keeps the stratagems whose timing names the phase, or any phase", () => {
    // Movement opens the section by itself.
    const html = strategems("movement");
    expect(html).toContain("Hold Fast");
    expect(html).toContain("Anytime");
    expect(html).not.toContain("Gun Rush");
  });

  it("opens by itself in Command, Movement and Charge, not in Shooting or Fight", () => {
    expect(strategems("charge")).toContain('aria-expanded="true"');
    expect(strategems("shooting")).toContain('aria-expanded="false"');
    expect(strategems("fight")).toContain('aria-expanded="false"');
  });

  it("counts only the stratagems that match", () => {
    expect(strategems("shooting")).toMatch(/Stratagems<\/span><span[^>]*>\d+</);
  });

  it("shows all of them with Show all on, or outside the battle screen", () => {
    for (const html of [strategems("movement", true), strategems(null)]) {
      expect(html).toContain("Gun Rush");
      expect(html).toContain("Hold Fast");
    }
  });
});

describe("PhaseFilterBar", () => {
  it("names the phase and offers Show all", () => {
    const html = inPhase("fight", <PhaseFilterBar />);
    expect(html).toContain("Filtered to Fight phase");
    expect(html).toContain("Show all");
  });

  it("says everything is shown, and offers the filter back, once Show all is on", () => {
    const html = inPhase("fight", <PhaseFilterBar />, true);
    expect(html).toContain("Showing everything");
    expect(html).toContain("Filter by phase");
  });

  it("is absent outside the battle screen", () => {
    expect(inPhase(null, <PhaseFilterBar />)).toBe("");
  });
});
