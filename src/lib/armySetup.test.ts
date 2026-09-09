import { describe, expect, it } from "vitest";
import { assignArmy, canStart, type ArmySelection } from "./armySetup";

const empty: ArmySelection = { a: null, b: null };

describe("assignArmy", () => {
  it("assigns an army to the requested side", () => {
    expect(assignArmy(empty, "a", "grey-knights")).toEqual({ a: "grey-knights", b: null });
    expect(assignArmy(empty, "b", "custodes")).toEqual({ a: null, b: "custodes" });
  });

  it("replaces whatever was on that side and leaves the other side alone", () => {
    const filled: ArmySelection = { a: "grey-knights", b: "custodes" };
    expect(assignArmy(filled, "a", "chaos")).toEqual({ a: "chaos", b: "custodes" });
  });

  it("clears the side when the same army is assigned to it again (toggle off)", () => {
    const filled: ArmySelection = { a: "grey-knights", b: "custodes" };
    expect(assignArmy(filled, "a", "grey-knights")).toEqual({ a: null, b: "custodes" });
  });

  it("allows the same army on both sides (mirror match)", () => {
    const afterA = assignArmy(empty, "a", "grey-knights");
    expect(assignArmy(afterA, "b", "grey-knights")).toEqual({
      a: "grey-knights",
      b: "grey-knights",
    });
  });
});

describe("canStart", () => {
  it("is false when neither slot is filled", () => {
    expect(canStart(empty)).toBe(false);
  });

  it("is false when only one slot is filled", () => {
    expect(canStart({ a: "grey-knights", b: null })).toBe(false);
  });

  it("is true once both slots are filled", () => {
    expect(canStart({ a: "grey-knights", b: "custodes" })).toBe(true);
  });
});
