import { describe, expect, it } from "vitest";
import { editionFromSystemName, rosterEdition } from "../../rosterEdition.mjs";
import {
  armiesForEdition,
  dropOtherEdition,
  loadEdition,
  saveEdition,
  type Edition,
} from "./edition";

describe("editionFromSystemName", () => {
  it("reads 10th and 11th edition 40k systems", () => {
    expect(editionFromSystemName("Warhammer 40,000 10th Edition")).toBe(10);
    expect(editionFromSystemName("Warhammer 40,000 11th Edition")).toBe(11);
    expect(editionFromSystemName("  warhammer 40,000 11th edition ")).toBe(11);
  });

  it("is null for other editions, other games and nothing", () => {
    expect(editionFromSystemName("Warhammer 40,000 9th Edition")).toBeNull();
    expect(editionFromSystemName("Warhammer 40,000 12th Edition")).toBeNull();
    expect(editionFromSystemName("Horus Heresy 3rd Edition")).toBeNull();
    expect(editionFromSystemName(undefined)).toBeNull();
    expect(editionFromSystemName("")).toBeNull();
  });
});

describe("rosterEdition", () => {
  const roster = (gameSystemName?: string) => ({ roster: { gameSystemName } });

  it("reads it from the export", () => {
    expect(rosterEdition(roster("Warhammer 40,000 11th Edition"))).toBe(11);
    expect(rosterEdition(roster("Warhammer 40,000 10th Edition"))).toBe(10);
  });

  it("takes an export that names no system as 10th, and an unreadable one as null", () => {
    expect(rosterEdition(roster(undefined))).toBe(10);
    expect(rosterEdition({})).toBe(10);
    expect(rosterEdition(roster("Horus Heresy 3rd Edition"))).toBeNull();
  });
});

const entry = (id: string, edition: Edition) => ({ id, edition });

describe("armiesForEdition", () => {
  const all = [entry("Orks", 10), entry("New", 11), entry("Grey", 10)];

  it("keeps only the armies of that edition, in order", () => {
    expect(armiesForEdition(all, 10).map((a) => a.id)).toEqual(["Orks", "Grey"]);
    expect(armiesForEdition(all, 11).map((a) => a.id)).toEqual(["New"]);
  });
});

describe("dropOtherEdition", () => {
  const all = [entry("Orks", 10), entry("New", 11)];

  it("clears a side whose army is of the other edition, and keeps the rest", () => {
    expect(dropOtherEdition({ a: "Orks", b: "New" }, all, 10)).toEqual({ a: "Orks", b: null });
    expect(dropOtherEdition({ a: "Orks", b: "New" }, all, 11)).toEqual({ a: null, b: "New" });
    expect(dropOtherEdition({ a: "Orks", b: null }, all, 10)).toEqual({ a: "Orks", b: null });
  });

  it("clears a side whose army is not known at all", () => {
    expect(dropOtherEdition({ a: "Gone", b: "Orks" }, all, 10)).toEqual({ a: null, b: "Orks" });
  });
});

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("the remembered edition", () => {
  it("defaults to 10th and returns what was saved", () => {
    const storage = fakeStorage();
    expect(loadEdition(storage)).toBe(10);
    saveEdition(11, storage);
    expect(loadEdition(storage)).toBe(11);
  });

  it("falls back to 10th for anything unreadable, or no storage at all", () => {
    expect(loadEdition(fakeStorage({ "waha.edition": "12" }))).toBe(10);
    expect(loadEdition(fakeStorage({ "waha.edition": "banana" }))).toBe(10);
    expect(loadEdition(null)).toBe(10);
    expect(() => saveEdition(11, null)).not.toThrow();
  });
});
