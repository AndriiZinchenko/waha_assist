import { describe, expect, it, vi } from "vitest";
import { armies, buildArmyEntries } from "./armies";

describe("armies", () => {
  it("discovers every JSON file in armies/", () => {
    expect(armies.length).toBeGreaterThan(0);
  });

  it("ids never carry a file extension", () => {
    for (const army of armies) {
      expect(army.id.endsWith(".json")).toBe(false);
    }
  });

  // armies/ is synced from New Recruit and its contents change, so don't pin
  // a particular file: every discovered army must parse into a full ParsedArmy.
  it("parses every discovered file into a full ParsedArmy", () => {
    for (const entry of armies) {
      expect(entry.parsed.catalogue, entry.id).toEqual(expect.any(String));
      expect(entry.parsed.units.length, entry.id).toBeGreaterThan(0);
    }
  });
});

describe("buildArmyEntries", () => {
  it("skips a file that fails to parse and logs why, keeping the rest", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const validRoster = {
      roster: {
        name: "Test Army",
        gameSystemName: "Warhammer 40,000 10th Edition",
        generatedBy: "test",
        costs: [],
        costLimits: [],
        forces: [
          {
            name: "Army Roster",
            catalogueName: "Test Catalogue",
            catalogueRevision: 1,
            selections: [],
          },
        ],
      },
    };

    const files = {
      "/armies/broken.json": { default: { roster: null } },
      "/armies/valid.json": { default: validRoster },
    };

    const entries = buildArmyEntries(files);

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("valid");
    expect(entries[0].parsed.catalogue).toBe("Test Catalogue");
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
