import { describe, expect, it } from "vitest";
import {
  camelCase,
  cleanExportText,
  detachmentFromRoster,
  htmlToText,
  slugify,
  splitWhen,
  stratagemType,
  titleCaseName,
  toStratagem,
} from "./stratagems.mjs";

describe("htmlToText", () => {
  it("turns paragraph breaks into blank lines and drops tags", () => {
    expect(htmlToText("<b>WHEN:</b> Your Shooting phase.<br><br><b>TARGET:</b> One unit.")).toBe(
      "WHEN: Your Shooting phase.\n\nTARGET: One unit.",
    );
  });

  it("keeps a keyword's capitals and drops its span", () => {
    expect(
      htmlToText('One <span class="kwb">ADEPTUS</span> <span class="kwb">CUSTODES</span> unit'),
    ).toBe("One ADEPTUS CUSTODES unit");
  });

  it("decodes the entities the export uses", () => {
    expect(htmlToText("6&quot; away &amp; visible&nbsp;now &#39;so&#39; &lt;x&gt;")).toBe(
      "6\" away & visible now 'so' <x>",
    );
  });

  it("collapses a run of breaks into a single blank line", () => {
    expect(htmlToText("A<br><br><br><br>B")).toBe("A\n\nB");
  });
});

describe("splitWhen", () => {
  // The app shows the timing on its own meta line, so it never belongs in
  // the body as well.
  it("lifts the WHEN paragraph out as the phase", () => {
    expect(splitWhen("WHEN: Your Shooting phase.\n\nTARGET: One unit.\n\nEFFECT: Boom.")).toEqual({
      phase: "Your Shooting phase",
      body: "TARGET: One unit.\n\nEFFECT: Boom.",
    });
  });

  it("keeps a long timing phrase intact", () => {
    expect(
      splitWhen("WHEN: Battle-shock step of your Command phase, just before a test.\n\nTARGET: That unit."),
    ).toEqual({
      phase: "Battle-shock step of your Command phase, just before a test",
      body: "TARGET: That unit.",
    });
  });

  // One export separates WHEN, TARGET and EFFECT with single line breaks
  // instead of blank lines; the timing still ends where the next label starts.
  it("splits at the next label when the paragraph uses single line breaks", () => {
    expect(splitWhen("WHEN: Your Shooting phase.\nTARGET: One unit.\nEFFECT: Boom.")).toEqual({
      phase: "Your Shooting phase",
      body: "TARGET: One unit.\n\nEFFECT: Boom.",
    });
  });

  it("leaves text alone when there is no WHEN paragraph", () => {
    expect(splitWhen("TARGET: One unit.")).toEqual({ phase: null, body: "TARGET: One unit." });
  });
});

describe("titleCaseName", () => {
  it("converts an all-caps name", () => {
    expect(titleCaseName("ARCHEOTECH MUNITIONS")).toBe("Archeotech Munitions");
  });

  it("keeps an apostrophe inside a word", () => {
    expect(titleCaseName("MARTIAL KA'TAH")).toBe("Martial Ka'tah");
  });

  it("handles a single word", () => {
    expect(titleCaseName("MULTIPOTENTIALITY")).toBe("Multipotentiality");
  });
});

describe("stratagemType", () => {
  it("drops the detachment prefix and the trailing noun", () => {
    expect(stratagemType("Shield Host  – Wargear Stratagem")).toBe("Wargear");
  });

  it("handles a core stratagem's prefix", () => {
    expect(stratagemType("Boarding Actions – Battle Tactic Stratagem")).toBe("Battle Tactic");
  });

  it("copes with no prefix at all", () => {
    expect(stratagemType("Epic Deed Stratagem")).toBe("Epic Deed");
  });

  it("returns nothing for an empty type", () => {
    expect(stratagemType("")).toBeNull();
  });
});

describe("slugify and camelCase", () => {
  it("makes a file stem", () => {
    expect(slugify("Blade of Ultramar")).toBe("blade-of-ultramar");
    expect(slugify("Shield Host")).toBe("shield-host");
  });

  it("makes an export name", () => {
    expect(camelCase("Blade of Ultramar")).toBe("bladeOfUltramar");
    expect(camelCase("Blitz Brigade")).toBe("blitzBrigade");
  });

  it("keeps an export name a valid identifier when it starts with a digit", () => {
    expect(camelCase("1st Company Task Force")).toBe("_1stCompanyTaskForce");
  });
});

describe("toStratagem", () => {
  it("maps one export entry onto the app's shape", () => {
    const entry = {
      name: "ARCHEOTECH MUNITIONS",
      type: "Shield Host  – Wargear Stratagem",
      cp_cost: "1",
      turn: "Your turn",
      phase: "Shooting phase",
      detachment: "Shield Host",
      legend: "Flavour text that the app does not show.",
      description:
        '<b>WHEN:</b> Your Shooting phase.<br><br><b>TARGET:</b> One <span class="kwb">ADEPTUS</span> <span class="kwb">CUSTODES</span> unit.<br><br><b>EFFECT:</b> Something happens.',
    };
    expect(toStratagem(entry)).toEqual({
      name: "Archeotech Munitions",
      cost: 1,
      type: "Wargear",
      phase: "Your Shooting phase",
      text: "TARGET: One ADEPTUS CUSTODES unit.\n\nEFFECT: Something happens.",
    });
  });

  it("falls back to turn and phase when the body has no WHEN", () => {
    expect(
      toStratagem({
        name: "SOMETHING",
        type: "Epic Deed Stratagem",
        cp_cost: "2",
        turn: "Opponent's turn",
        phase: "Charge phase",
        description: "<b>TARGET:</b> One unit.",
      }).phase,
    ).toBe("Opponent's Charge phase");
  });
});

describe("detachmentFromRoster", () => {
  const roster = {
    roster: {
      forces: [
        {
          catalogueName: "Imperium - Adeptus Custodes",
          selections: [
            {
              name: "Detachment",
              selections: [
                {
                  name: "Shield Host",
                  group: "Detachments",
                  rules: [{ name: "Martial Mastery", description: "Pick a bullet." }],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  it("reads the detachment name, faction and rules", () => {
    expect(detachmentFromRoster(roster)).toEqual({
      name: "Shield Host",
      faction: "Imperium - Adeptus Custodes",
      rules: [{ name: "Martial Mastery", text: "Pick a bullet." }],
    });
  });

  it("returns null when the roster carries no detachment", () => {
    expect(detachmentFromRoster({ roster: { forces: [{ selections: [] }] } })).toBeNull();
  });
});

// Roster and stratagem text carries stray non-breaking spaces. They are
// invisible, lint rejects them, and they break exact-string dictionary
// lookups, so they are normalized at generation time.
const NBSP = String.fromCharCode(160);

describe("non-breaking spaces", () => {
  it("normalizes one inside stratagem body text", () => {
    expect(htmlToText(`One${NBSP}unit`)).toBe("One unit");
  });

  it("normalizes one inside a detachment rule", () => {
    const roster = {
      roster: {
        forces: [
          {
            catalogueName: "Xenos - Orks",
            selections: [
              {
                name: "Blitz Brigade",
                group: "Detachments",
                rules: [{ name: "Assault", description: `Eager${NBSP}for the fight.` }],
              },
            ],
          },
        ],
      },
    };
    expect(detachmentFromRoster(roster).rules[0].text).toBe("Eager for the fight.");
  });
});

describe("cleanExportText", () => {
  // New Recruit's text carries a handful of recurring typos that would
  // otherwise be frozen into the generated data files (and into the i18n
  // dictionary keys). They are corrected at the source, here.
  it("fixes the grammar slips the export ships with", () => {
    expect(cleanExportText("destroys a enemy unit")).toBe("destroys an enemy unit");
    expect(cleanExportText("add 1 to the Attacks. Strength and Damage")).toBe(
      "add 1 to the Attacks, Strength and Damage",
    );
    expect(cleanExportText("you can re roll the Hit roll")).toBe("you can re-roll the Hit roll");
  });

  it("collapses doubled spaces and restores the space before a parenthesis", () => {
    expect(cleanExportText("(excluding  DAMNED, DAEMON) that  CHARACTER model")).toBe(
      "(excluding DAMNED, DAEMON) that CHARACTER model",
    );
    expect(cleanExportText("from your army(excluding Anathema Psykana models)")).toBe(
      "from your army (excluding Anathema Psykana models)",
    );
  });

  it("drops a stray closing quote after the final full stop", () => {
    expect(cleanExportText("share the same keyword from the list above.’")).toBe(
      "share the same keyword from the list above.",
    );
  });

  it("leaves ordinary text untouched", () => {
    const text = "TARGET: One unit from your army.\n\nEFFECT: Your unit fights next.";
    expect(cleanExportText(text)).toBe(text);
  });
});
