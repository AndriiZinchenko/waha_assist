import { describe, expect, it } from "vitest";
import { parseInvuln, parseInvulnStat, parseRoster } from "../../parseRoster.mjs";

type RosterJson = {
  roster: { forces: Array<{ selections: Array<Record<string, unknown>> }> };
};

const files = import.meta.glob<{ default: unknown }>("/armies/*.json", { eager: true });

/** A one-unit roster with the given Unit profile characteristics. */
function rosterWith(characteristics: Array<[string, string | null]>): RosterJson {
  const first = Object.values(files)[0];
  if (!first) throw new Error("no roster in armies/ to use as a scaffold");
  const json = structuredClone(first.default) as RosterJson;
  json.roster.forces = [
    {
      ...json.roster.forces[0],
      selections: [
        {
          id: "u1",
          name: "Test unit",
          type: "model",
          number: 1,
          profiles: [
            {
              name: "Test unit",
              typeName: "Unit",
              characteristics: characteristics.map(([name, $text]) => ({ name, $text })),
            },
          ],
        },
      ],
    },
  ];
  return json;
}

describe("unit profile across editions", () => {
  it("reads the 11th edition Sv and InSv characteristics", () => {
    const unit = parseRoster(
      rosterWith([["M", '5"'], ["T", "5"], ["Sv", "3+"], ["W", "1"], ["LD", "7+"], ["OC", "2"], ["InSv", "5+*"]]),
    ).units[0];
    expect(unit.profile.SV).toBe(3);
    expect(unit.invuln).toEqual({ value: 5, conditional: true });
  });

  it("still reads the 10th edition SV", () => {
    const unit = parseRoster(rosterWith([["T", "4"], ["SV", "2+"]])).units[0];
    expect(unit.profile.SV).toBe(2);
    expect(unit.invuln).toBeNull();
  });

  it("parses InSv values", () => {
    expect(parseInvulnStat("4+")).toEqual({ value: 4, conditional: false });
    expect(parseInvulnStat("5+*")).toEqual({ value: 5, conditional: true });
    expect(parseInvulnStat(null)).toBeNull();
    expect(parseInvulnStat("-")).toBeNull();
  });
});

describe("parseInvuln", () => {
  it("reads a bare value and marks 'against ranged attacks' as conditional", () => {
    expect(parseInvuln("Invulnerable Save", "4+")).toEqual({ value: 4, conditional: false });
    expect(
      parseInvuln("Invulnerable Save", "This model has a 5+ invulnerable save against ranged attacks."),
    ).toEqual({ value: 5, conditional: true });
    expect(parseInvuln("Invulnerable Save", "Models in this unit have a 4+ invulnerable save.")).toEqual({
      value: 4,
      conditional: false,
    });
  });
});
