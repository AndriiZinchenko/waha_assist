import { describe, expect, it } from "vitest";
import { parseKeywords } from "../../parseRoster.mjs";

describe("parseKeywords", () => {
  it("splits a comma-separated list and drops the '-' placeholder", () => {
    expect(parseKeywords("Rapid Fire 2, Psychic")).toEqual(["Rapid Fire 2", "Psychic"]);
    expect(parseKeywords("-")).toEqual([]);
    expect(parseKeywords(undefined)).toEqual([]);
  });

  it("normalizes the Anti-X keyword to Title Case so it matches unit keywords", () => {
    // Different New Recruit exports disagree on casing: one army ships
    // "Anti-INFANTRY 4+", another "Anti-Infantry 2+". Unit keywords are
    // always title-cased ("Infantry"), so normalize to that form.
    expect(parseKeywords("Anti-INFANTRY 4+, Devastating Wounds, Rapid Fire 1")).toEqual([
      "Anti-Infantry 4+",
      "Devastating Wounds",
      "Rapid Fire 1",
    ]);
    expect(parseKeywords("Anti-VEHICLE 3+")).toEqual(["Anti-Vehicle 3+"]);
    expect(parseKeywords("Anti-PSYKER 2+")).toEqual(["Anti-Psyker 2+"]);
    expect(parseKeywords("Anti-Infantry 2+")).toEqual(["Anti-Infantry 2+"]);
    expect(parseKeywords("Anti-fly 4+")).toEqual(["Anti-Fly 4+"]);
    // multi-word keyword: every word is title-cased
    expect(parseKeywords("Anti-CHAOS UNDIVIDED 4+")).toEqual(["Anti-Chaos Undivided 4+"]);
  });

  it("leaves non-Anti keywords untouched", () => {
    expect(parseKeywords("Devastating Wounds, Twin-linked, Melta 4")).toEqual([
      "Devastating Wounds",
      "Twin-linked",
      "Melta 4",
    ]);
  });
});
