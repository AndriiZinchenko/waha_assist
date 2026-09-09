import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("translate", () => {
  it("returns the original text unchanged for English", () => {
    expect(translate("Deep Strike", "en")).toBe("Deep Strike");
  });

  it("returns null unchanged regardless of language", () => {
    expect(translate(null, "en")).toBeNull();
    expect(translate(null, "uk")).toBeNull();
  });

  it("translates the sentence structure but keeps core rules terms in English", () => {
    const result = translate(
      "Weapons with **[RAPID FIRE X]** in their profile are known as Rapid Fire weapons. Each time such a weapon targets a unit within half that weapon’s range, the Attacks characteristic of that weapon is increased by the amount denoted by ‘x’.",
      "uk",
    );
    // Ukrainian scaffolding around the sentence...
    expect(result).toContain("Зброя");
    expect(result).toContain("характеристика");
    // ...but the specific rules term ("Attacks") and the bracketed keyword
    // tag stay in English, per the "keep core terms in English" convention.
    expect(result).toContain("**[RAPID FIRE X]**");
    expect(result).toContain("характеристика Attacks");
    expect(result).not.toBe(
      "Weapons with **[RAPID FIRE X]** in their profile are known as Rapid Fire weapons. Each time such a weapon targets a unit within half that weapon’s range, the Attacks characteristic of that weapon is increased by the amount denoted by ‘x’.",
    );
  });

  it("falls back to English for a string not yet in the Ukrainian dictionary", () => {
    expect(translate("Some brand-new army's ability text", "uk")).toBe(
      "Some brand-new army's ability text",
    );
  });

  it("matches a dictionary entry even when the source text has a stray non-breaking space", () => {
    // Some roster exports (likely copy-pasted from a PDF) carry U+00A0
    // instead of a plain space inside ability/rule text — invisible in the
    // UI but fatal to an exact-string lookup unless normalized. Built with
    // fromCharCode + join rather than a literal character so the
    // non-breaking space survives this file's own encoding round-trip
    // intact instead of silently becoming a plain space.
    const nbsp = String.fromCharCode(160);
    const words = [
      "While",
      "this",
      "model",
      "has",
      "1-4",
      "wounds",
      "remaining,",
      "each",
      "time",
      "this",
      "model",
      "makes",
      "an",
      "attack,",
      "subtract",
      "1",
      "from",
      "the",
      "Hit",
      "roll.",
    ];
    const withNbsp = words.join(nbsp);
    expect(withNbsp).not.toBe(words.join(" ")); // sanity: the NBSP took effect

    const result = translate(withNbsp, "uk");
    expect(result).not.toBe(withNbsp);
    expect(result).toContain("Hit roll");
  });

  it("never translates a raw weapon keyword badge, by convention (never looked up)", () => {
    // Keyword badges like "Rapid Fire 2" are simply never passed through
    // translate() at all — the UI renders weapon.keywords verbatim. This
    // documents that even if one were passed in, an untranslated exact
    // match still falls back to the original English string.
    expect(translate("Rapid Fire 2", "uk")).toBe("Rapid Fire 2");
  });
});
