import { describe, expect, it } from "vitest";
import { emptyModifiers } from "./combat";
import {
  activeModifierChips,
  loadModifiersCollapsed,
  saveModifiersCollapsed,
} from "./modifierPanel";

const labels = {
  halfRange: "Half range",
  stationary: "Stationary",
  engaged: "Engaged",
  waaagh: "Waaagh!",
};

describe("activeModifierChips", () => {
  it("is empty when nothing is switched on", () => {
    expect(activeModifierChips(emptyModifiers(), labels)).toEqual([]);
  });

  it("lists every active modifier in panel order", () => {
    const chips = activeModifierChips(
      {
        ...emptyModifiers(),
        hitMod: 1,
        woundMod: -1,
        apMod: 1,
        damageMod: -1,
        invulnOverride: 4,
        halfRange: true,
        waaagh: true,
      },
      labels,
    );
    expect(chips).toEqual(["Hit +1", "Wound −1", "AP +1", "D −1", "4++", "Half range", "Waaagh!"]);
  });
});

describe("modifiers collapsed preference", () => {
  function memoryStorage() {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  }

  it("defaults to expanded and remembers the last choice", () => {
    const storage = memoryStorage();
    expect(loadModifiersCollapsed(storage)).toBe(false);
    saveModifiersCollapsed(true, storage);
    expect(loadModifiersCollapsed(storage)).toBe(true);
    saveModifiersCollapsed(false, storage);
    expect(loadModifiersCollapsed(storage)).toBe(false);
  });

  it("falls back to expanded when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadModifiersCollapsed(broken)).toBe(false);
    expect(() => saveModifiersCollapsed(true, broken)).not.toThrow();
  });
});
