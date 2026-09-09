import { describe, expect, it } from "vitest";
import { KEYWORD_GLOSSARY, keywordDefinition } from "./keyword-glossary";

describe("keywordDefinition", () => {
  it("finds a definition regardless of the keyword's casing in the roster", () => {
    expect(keywordDefinition("Infantry")).toBe(KEYWORD_GLOSSARY.Infantry);
    expect(keywordDefinition("INFANTRY")).toBe(KEYWORD_GLOSSARY.Infantry);
    expect(keywordDefinition("battleline")).toBe(KEYWORD_GLOSSARY.Battleline);
  });

  it("returns null for datasheet and faction-specific keywords with no core rule", () => {
    expect(keywordDefinition("Warboss")).toBeNull();
    expect(keywordDefinition("Rhino")).toBeNull();
    expect(keywordDefinition("Strike Squad")).toBeNull();
  });

  it("covers the general keywords stratagem conditions refer to", () => {
    for (const kw of ["Infantry", "Character", "Vehicle", "Monster", "Walker", "Battleline", "Transport", "Psyker", "Grenades", "Fly", "Terminator", "Titanic"]) {
      expect(keywordDefinition(kw), kw).toBeTruthy();
    }
  });

  it("has no empty definitions", () => {
    for (const [kw, text] of Object.entries(KEYWORD_GLOSSARY)) {
      expect(text.trim().length, kw).toBeGreaterThan(20);
    }
  });
});
