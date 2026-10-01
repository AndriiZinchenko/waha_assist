import { describe, expect, it } from "vitest";
import { parseRoster } from "../../parseRoster.mjs";

type RosterJson = {
  roster: { forces: Array<{ selections: Array<Record<string, unknown>> }> };
};

// armies/ is a synced mirror whose file names change; any real export will do
// as a scaffold. The test edits a copy of the first unit selection and parses
// again. Loaded the way src/lib/armies.ts loads them: src tests are compiled
// for the browser, so they cannot import node:fs.
const files = import.meta.glob<{ default: unknown }>("/armies/*.json", { eager: true });

function firstRoster(): RosterJson {
  const first = Object.values(files)[0];
  if (!first) throw new Error("no roster in armies/ to use as a scaffold");
  return structuredClone(first.default) as RosterJson;
}

function firstUnitSelection(json: RosterJson): Record<string, unknown> {
  const sel = json.roster.forces[0].selections.find(
    (s) => s.type === "unit" || s.type === "model",
  );
  if (!sel) throw new Error("scaffold roster has no unit");
  return sel;
}

describe("parseRoster entryId", () => {
  it("takes the last '::' segment of the selection's entryId", () => {
    const json = firstRoster();
    firstUnitSelection(json).entryId = "catalogue-1::entry-9";
    expect(parseRoster(json).units[0].entryId).toBe("entry-9");
  });

  it("keeps an entryId that has no '::' as it is", () => {
    const json = firstRoster();
    firstUnitSelection(json).entryId = "entry-9";
    expect(parseRoster(json).units[0].entryId).toBe("entry-9");
  });

  it("is null when the export carries no entryId", () => {
    const json = firstRoster();
    delete firstUnitSelection(json).entryId;
    expect(parseRoster(json).units[0].entryId).toBeNull();
  });
});
