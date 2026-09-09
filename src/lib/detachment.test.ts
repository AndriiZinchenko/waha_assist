import { describe, expect, it } from "vitest";
import { effectiveDetachment } from "./detachment";

const army = { id: "Orks", parsed: { detachment: "Blitz Brigade" } };

describe("effectiveDetachment", () => {
  it("uses the roster's own detachment when nothing is chosen", () => {
    expect(effectiveDetachment(army, {})).toBe("Blitz Brigade");
  });

  it("prefers the chosen detachment for that army", () => {
    expect(effectiveDetachment(army, { Orks: "Green Tide" })).toBe("Green Tide");
  });

  it("ignores choices made for other armies", () => {
    expect(effectiveDetachment(army, { Grey: "Hallowed Conclave" })).toBe("Blitz Brigade");
  });

  it("returns null when the roster has no detachment either", () => {
    expect(effectiveDetachment({ id: "x", parsed: { detachment: null } }, {})).toBeNull();
  });
});
