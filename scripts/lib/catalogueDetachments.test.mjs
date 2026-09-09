import { describe, expect, it } from "vitest";
import {
  detachmentEntries,
  detachmentsForCatalogue,
  inferFactionId,
  isAvailableTo,
  resolveRules,
  stratagemsForDetachment,
} from "./catalogueDetachments.mjs";

const OWN = "4029-9237-e8db-af55";
const OTHER = "470a-6daa-9014-12df";

function hiddenUnless(childId, scope = "primary-catalogue") {
  return {
    type: "set",
    field: "hidden",
    value: true,
    conditions: [{ type: "notInstanceOf", field: "selections", scope, childId, value: 1 }],
  };
}

function hiddenIf(childId) {
  return {
    type: "set",
    field: "hidden",
    value: true,
    conditions: [{ type: "instanceOf", field: "selections", scope: "force", childId, value: 1 }],
  };
}

describe("detachmentEntries", () => {
  it("finds a group named Detachment nested under a shared entry", () => {
    const catalogue = {
      sharedSelectionEntries: [
        {
          name: "Imperium - Adeptus Custodes",
          selectionEntryGroups: [
            { name: "Detachment", selectionEntries: [{ name: "Shield Host", rules: [] }] },
          ],
        },
      ],
    };
    expect(detachmentEntries(catalogue).map((e) => e.name)).toEqual(["Shield Host"]);
  });

  it("finds a top-level group named Detachments", () => {
    const catalogue = {
      sharedSelectionEntryGroups: [
        { name: "Detachments", selectionEntries: [{ name: "Warpbane Task Force" }] },
      ],
    };
    expect(detachmentEntries(catalogue).map((e) => e.name)).toEqual(["Warpbane Task Force"]);
  });

  it("ignores groups with other names", () => {
    const catalogue = {
      sharedSelectionEntryGroups: [{ name: "Enhancements", selectionEntries: [{ name: "Relic" }] }],
    };
    expect(detachmentEntries(catalogue)).toEqual([]);
  });
});

describe("isAvailableTo", () => {
  it("keeps a plain entry", () => {
    expect(isAvailableTo({ name: "Gladius Task Force" }, OWN)).toBe(true);
  });

  it("drops an entry the catalogue marks hidden", () => {
    expect(isAvailableTo({ name: "Old", hidden: true }, OWN)).toBe(false);
  });

  it("keeps a chapter detachment gated to this catalogue", () => {
    expect(isAvailableTo({ name: "Blade of Ultramar", modifiers: [hiddenUnless(OWN)] }, OWN)).toBe(
      true,
    );
  });

  it("drops a chapter detachment gated to another catalogue", () => {
    expect(
      isAvailableTo({ name: "Unforgiven Task Force", modifiers: [hiddenUnless(OTHER)] }, OWN),
    ).toBe(false);
  });

  // Boarding Actions detachments only appear once a boarding selection is
  // in the force; the app is for ordinary games, so they stay out.
  it("drops an entry hidden unless some force selection is present", () => {
    expect(
      isAvailableTo({ name: "Void Purge Force", modifiers: [hiddenUnless("1d6e", "force")] }, OWN),
    ).toBe(false);
  });

  it("keeps an entry that is only hidden when some force selection is present", () => {
    expect(isAvailableTo({ name: "Warpbane Task Force", modifiers: [hiddenIf("1d6e")] }, OWN)).toBe(
      true,
    );
  });

  it("ignores modifiers that do not touch hidden", () => {
    const modifiers = [{ type: "increment", value: 2, field: "e703", scope: "force" }];
    expect(isAvailableTo({ name: "Solar Spearhead", modifiers }, OWN)).toBe(true);
  });

  it("drops a Legends entry", () => {
    expect(isAvailableTo({ name: "Old Guard [Legends]" }, OWN)).toBe(false);
  });
});

describe("resolveRules", () => {
  const NBSP = String.fromCharCode(160);
  const sharedRules = new Map([
    ["fc8a", { name: "Assault", description: "Weapons with **[ASSAULT]** can shoot." }],
  ]);

  it("returns the entry's own rules with cleaned text", () => {
    const entry = {
      rules: [{ name: "Eager For The Fight", description: `Add${NBSP}1 to Advance rolls. ` }],
    };
    expect(resolveRules(entry, sharedRules)).toEqual([
      { name: "Eager For The Fight", text: "Add 1 to Advance rolls." },
    ]);
  });

  it("appends rules reached through info links", () => {
    const entry = {
      rules: [{ name: "Eager For The Fight", description: "Add 1." }],
      infoLinks: [{ name: "Assault", type: "rule", targetId: "fc8a" }],
    };
    expect(resolveRules(entry, sharedRules).map((r) => r.name)).toEqual([
      "Eager For The Fight",
      "Assault",
    ]);
  });

  it("skips info links that are not rules or cannot be resolved", () => {
    const entry = {
      rules: [],
      infoLinks: [
        { name: "Profile", type: "profile", targetId: "fc8a" },
        { name: "Missing", type: "rule", targetId: "nope" },
      ],
    };
    expect(resolveRules(entry, sharedRules)).toEqual([]);
  });
});

describe("detachmentsForCatalogue", () => {
  const core = {
    sharedRules: [{ id: "fc8a", name: "Assault", description: "Assault text." }],
  };
  const library = {
    id: "lib",
    sharedSelectionEntryGroups: [
      {
        name: "Detachment",
        selectionEntries: [
          { name: "Gladius Task Force", rules: [{ name: "Combat Doctrines", description: "D." }] },
          {
            name: "Blade of Ultramar",
            rules: [{ name: "Mastered Doctrines", description: "M." }],
            modifiers: [hiddenUnless(OWN)],
          },
          {
            name: "Unforgiven Task Force",
            rules: [{ name: "Grim Resolve", description: "G." }],
            modifiers: [hiddenUnless(OTHER)],
          },
        ],
      },
    ],
  };
  const chapter = {
    id: OWN,
    sharedSelectionEntries: [],
    sharedSelectionEntryGroups: [
      {
        name: "Detachment",
        selectionEntries: [
          {
            name: "Wardens Host",
            rules: [{ name: "Own Rule", description: "O." }],
            infoLinks: [{ name: "Assault", type: "rule", targetId: "fc8a" }],
          },
        ],
      },
    ],
  };

  it("collects available detachments from the catalogue and everything it links", () => {
    const result = detachmentsForCatalogue({ catalogue: chapter, linked: [library, core] });
    expect(result).toEqual([
      {
        name: "Wardens Host",
        rules: [
          { name: "Own Rule", text: "O." },
          { name: "Assault", text: "Assault text." },
        ],
      },
      { name: "Gladius Task Force", rules: [{ name: "Combat Doctrines", text: "D." }] },
      { name: "Blade of Ultramar", rules: [{ name: "Mastered Doctrines", text: "M." }] },
    ]);
  });

  it("keeps the first of two entries with the same name", () => {
    const twice = {
      id: OWN,
      sharedSelectionEntryGroups: [
        {
          name: "Detachment",
          selectionEntries: [
            { name: "Same", rules: [{ name: "A", description: "a" }] },
            { name: "Same", rules: [{ name: "B", description: "b" }] },
          ],
        },
      ],
    };
    expect(detachmentsForCatalogue({ catalogue: twice, linked: [] })).toEqual([
      { name: "Same", rules: [{ name: "A", text: "a" }] },
    ]);
  });
});

describe("matching stratagems to a faction", () => {
  const stratagems = [
    { name: "A", faction_id: "GC", detachment: "Infestation Swarm" },
    { name: "B", faction_id: "TYR", detachment: "Infestation Swarm" },
    { name: "C", faction_id: "TYR", detachment: "Invasion Fleet" },
    { name: "D", faction_id: "TYR", detachment: "Invasion Fleet" },
    { name: "E", faction_id: "", detachment: "" },
  ];

  it("infers the faction code most of the catalogue's detachments use", () => {
    expect(inferFactionId(stratagems, ["Invasion Fleet", "Infestation Swarm"])).toBe("TYR");
  });

  it("returns null when nothing matches", () => {
    expect(inferFactionId(stratagems, ["Nope"])).toBeNull();
  });

  it("picks only the faction's stratagems when a name is shared", () => {
    expect(stratagemsForDetachment(stratagems, "Infestation Swarm", "TYR").map((s) => s.name)).toEqual([
      "B",
    ]);
  });

  it("matches detachment names regardless of capitalisation", () => {
    const book = [{ name: "X", faction_id: "AC", detachment: "Talons Of The Emperor" }];
    expect(inferFactionId(book, ["Talons of the Emperor"])).toBe("AC");
    expect(stratagemsForDetachment(book, "Talons of the Emperor", "AC")).toHaveLength(1);
  });

  it("falls back to a name match when no faction is known", () => {
    expect(stratagemsForDetachment(stratagems, "Invasion Fleet", null).map((s) => s.name)).toEqual([
      "C",
      "D",
    ]);
  });
});
