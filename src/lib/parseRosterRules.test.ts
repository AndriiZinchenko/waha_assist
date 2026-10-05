import { describe, expect, it } from "vitest";
import { parseRoster } from "../../parseRoster.mjs";

type RosterJson = {
  roster: { forces: Array<{ selections: Array<Record<string, unknown>> }> };
};

// See parseRosterEntryId.test.ts for why the scaffold comes from armies/.
const files = import.meta.glob<{ default: unknown }>("/armies/*.json", { eager: true });

describe("parseRoster rules", () => {
  it("lists a rule once when New Recruit attaches it to the unit twice", () => {
    const first = Object.values(files)[0];
    if (!first) throw new Error("no roster in armies/ to use as a scaffold");
    const json = structuredClone(first.default) as RosterJson;
    const sel = json.roster.forces[0].selections.find(
      (s) => s.type === "unit" || s.type === "model",
    )!;
    const rule = { name: "Oath of Moment", description: "Same text." };
    sel.rules = [rule, { ...rule }, { name: "Deep Strike", description: "Other." }];

    const unit = parseRoster(json).units.find((u) => u.id === (sel.id as string))!;
    expect(unit.rules.map((r) => r.name)).toEqual(["Oath of Moment", "Deep Strike"]);
  });
});
