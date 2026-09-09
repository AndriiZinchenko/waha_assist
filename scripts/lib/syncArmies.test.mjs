import { describe, expect, it } from "vitest";
import { sanitizeFileName } from "./syncArmies.mjs";

describe("sanitizeFileName", () => {
  it("keeps an ordinary list name unchanged", () => {
    expect(sanitizeFileName("Chaos 2015")).toBe("Chaos 2015");
  });

  it("strips characters Windows rejects in file names", () => {
    expect(sanitizeFileName('Grey: "Knights" <v2>?')).toBe("Grey Knights v2");
  });

  it("collapses whitespace and trims the edges", () => {
    expect(sanitizeFileName("  Custody’s   1990 ")).toBe("Custody’s 1990");
  });

  it("falls back to a placeholder when nothing printable remains", () => {
    expect(sanitizeFileName("???")).toBe("list");
  });
});

import { planWrites } from "./syncArmies.mjs";

describe("planWrites", () => {
  it("maps every list to armies/<sanitized name>.json", () => {
    const plan = planWrites(
      [{ key: "k1", name: "Chaos 2015" }, { key: "k2", name: "Grey: Knights" }],
      [],
    );
    expect(plan.writes).toEqual([
      { key: "k1", name: "Chaos 2015", file: "Chaos 2015.json" },
      { key: "k2", name: "Grey: Knights", file: "Grey Knights.json" },
    ]);
  });

  it("suffixes the second list when two lists sanitize to the same file", () => {
    const plan = planWrites(
      [{ key: "k1", name: "Chaos" }, { key: "k2", name: "Chaos?" }],
      [],
    );
    expect(plan.writes.map((w) => w.file)).toEqual(["Chaos.json", "Chaos (k2).json"]);
  });

  it("reports existing files that no current list would write as orphans", () => {
    const plan = planWrites(
      [{ key: "k1", name: "Chaos" }],
      ["Chaos.json", "grey-knights.json", "notes.txt"],
    );
    expect(plan.orphans).toEqual(["grey-knights.json"]);
  });
});

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { validateRoster } from "./syncArmies.mjs";

describe("validateRoster", () => {
  it("accepts a real New Recruit export and reports its catalogue", () => {
    // armies/ is a synced mirror whose file names change; any real export will do.
    const file = readdirSync("armies").find((f) => f.endsWith(".json"));
    expect(file).toBeDefined();
    const json = JSON.parse(readFileSync(path.join("armies", file), "utf8"));
    const result = validateRoster(json);
    expect(result.ok).toBe(true);
    expect(result.catalogue).toEqual(expect.any(String));
  });

  it("rejects a payload without a roster and says why", () => {
    const result = validateRoster({ hello: "world" });
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error.length).toBeGreaterThan(0);
  });
});
