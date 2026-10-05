import { describe, expect, it } from "vitest";
import { formatRoute, parseRoute, type RouteState } from "./route";

const base: RouteState = {
  screen: "list",
  configArmyId: null,
  a: null,
  b: null,
  ua: null,
  ub: null,
  phase: "shooting",
  side: "a",
};

describe("parseRoute", () => {
  it("treats an empty or bare hash as the army list", () => {
    expect(parseRoute("")).toEqual(base);
    expect(parseRoute("#")).toEqual(base);
    expect(parseRoute("#/")).toEqual(base);
  });

  it("reads side assignments on the list screen", () => {
    expect(parseRoute("#/?a=Orks&b=Ultramar")).toEqual({ ...base, a: "Orks", b: "Ultramar" });
  });

  it("reads the config screen with its army, decoding the id", () => {
    expect(parseRoute("#/config/Custody%E2%80%99s?a=Orks")).toEqual({
      ...base,
      screen: "config",
      configArmyId: "Custody’s",
      a: "Orks",
    });
  });

  it("reads a full battle route", () => {
    expect(parseRoute("#/battle?a=Orks&b=Ultramar&ua=oll0fu&ub=x1&p=fight&side=b")).toEqual({
      screen: "battle",
      configArmyId: null,
      a: "Orks",
      b: "Ultramar",
      ua: "oll0fu",
      ub: "x1",
      phase: "fight",
      side: "b",
    });
  });

  it("falls back to the list when a battle route lacks a side, keeping what it has", () => {
    expect(parseRoute("#/battle?a=Orks")).toEqual({ ...base, a: "Orks" });
  });

  it("falls back to the list for an unknown screen or a config route without an army", () => {
    expect(parseRoute("#/nope?a=Orks")).toEqual({ ...base, a: "Orks" });
    expect(parseRoute("#/config")).toEqual(base);
  });

  it("ignores an invalid side value", () => {
    expect(parseRoute("#/battle?a=Orks&b=Ultramar&side=c").side).toBe("a");
  });

  it("defaults to the Shooting phase, ignoring unknown values and the old calc flag", () => {
    expect(parseRoute("#/battle?a=Orks&b=Ultramar&p=psychic").phase).toBe("shooting");
    expect(parseRoute("#/battle?a=Orks&b=Ultramar&w=psychic").phase).toBe("shooting");
    expect(parseRoute("#/battle?a=Orks&b=Ultramar&calc=1")).toEqual({
      ...base,
      screen: "battle",
      a: "Orks",
      b: "Ultramar",
    });
  });

  it("reads every phase, and the older w=melee as Fight", () => {
    for (const phase of ["command", "movement", "shooting", "charge", "fight"]) {
      expect(parseRoute(`#/battle?a=Orks&b=Ultramar&p=${phase}`).phase).toBe(phase);
    }
    expect(parseRoute("#/battle?a=Orks&b=Ultramar&w=melee").phase).toBe("fight");
    expect(parseRoute("#/battle?a=Orks&b=Ultramar&w=ranged").phase).toBe("shooting");
    expect(parseRoute("#/battle?a=Orks&b=Ultramar&p=charge&w=melee").phase).toBe("charge");
  });
});

describe("formatRoute", () => {
  it("writes the list screen without a query when nothing is set", () => {
    expect(formatRoute(base)).toBe("#/");
  });

  it("keeps side assignments on the list and config screens", () => {
    expect(formatRoute({ ...base, a: "Orks", b: "Ultramar" })).toBe("#/?a=Orks&b=Ultramar");
    expect(formatRoute({ ...base, screen: "config", configArmyId: "Custody’s", a: "Orks" })).toBe(
      "#/config/Custody%E2%80%99s?a=Orks",
    );
  });

  it("writes only the battle fields that are set", () => {
    expect(
      formatRoute({ ...base, screen: "battle", a: "Orks", b: "Ultramar", ua: "oll0fu", phase: "fight" }),
    ).toBe("#/battle?a=Orks&b=Ultramar&ua=oll0fu&p=fight");
    expect(formatRoute({ ...base, screen: "battle", a: "Orks", b: "Ultramar", phase: "shooting" })).toBe(
      "#/battle?a=Orks&b=Ultramar",
    );
    expect(formatRoute({ ...base, screen: "battle", a: "Orks", b: "Ultramar", side: "b" })).toBe(
      "#/battle?a=Orks&b=Ultramar&side=b",
    );
  });

  it("round-trips through parseRoute", () => {
    const route: RouteState = {
      screen: "battle",
      configArmyId: null,
      a: "Custody’s",
      b: "Grey",
      ua: "abc",
      ub: null,
      phase: "fight",
      side: "b",
    };
    expect(parseRoute(formatRoute(route))).toEqual(route);
  });
});
