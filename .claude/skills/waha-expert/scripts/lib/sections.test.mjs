import { describe, expect, it } from "vitest";
import { splitPages, splitByReference, splitByPage, toMarkdown } from "./sections.mjs";
import { runPdftotext } from "./pdf.mjs";

describe("splitPages", () => {
  it("splits on form feed and drops the empty tail", () => {
    expect(splitPages("a\fb\f")).toEqual(["a", "b"]);
  });
});

describe("splitByReference", () => {
  const pages = [
    "intro line\nFALL-BACK MOVE 09.07\nMAXIMUM DISTANCE: M\n",
    "1. HIT ROLLS 05.01\nRoll a D6\nHEROIC INTERVENTION 15.11\nfirst\nHEROIC INTERVENTION 15.11\nsecond\nSee also\nFlying Models 21.03",
  ];
  const sections = splitByReference(pages);

  it("finds each printed reference, including ones with a numbered prefix", () => {
    expect(sections.map((s) => s.id)).toEqual(["front", "09.07", "05.01", "15.11", "15.11-2"]);
    expect(sections[2].title).toBe("1. HIT ROLLS");
  });

  it("keeps body text and records the page", () => {
    expect(sections[0].body).toBe("intro line");
    expect(sections[1]).toMatchObject({ title: "FALL-BACK MOVE", page: 1, body: "MAXIMUM DISTANCE: M" });
    expect(sections[2].page).toBe(2);
  });

  it("does not treat mixed-case cross references as headings", () => {
    expect(sections[4].body).toBe("second\nSee also\nFlying Models 21.03");
  });

  it("treats bracketed weapon-ability headings as their own sections", () => {
    const abilities = splitByReference([
      "SUPER-HEAVY WALKER 24.35\nwalker text\n[SUSTAINED HITS] 24.36\nThis ability always takes the form X.\n[TORRENT] 24.37\nAutomatically hits.",
    ]);
    expect(abilities.map((s) => s.id)).toEqual(["24.35", "24.36", "24.37"]);
    expect(abilities[1]).toMatchObject({ title: "[SUSTAINED HITS]", body: "This ability always takes the form X." });
    expect(abilities[0].body).toBe("walker text");
  });

  it("keeps a two-reference cross-reference label in the body, not as a heading", () => {
    const attached = splitByReference(["ATTACHED UNITS 19.01\ntext\nLEADER 24.22 / SUPPORT 24.34\nmore"]);
    expect(attached.map((s) => s.id)).toEqual(["19.01"]);
    expect(attached[0].body).toContain("LEADER 24.22 / SUPPORT 24.34");
  });

  it("returns no front section when the text starts with a heading", () => {
    expect(splitByReference(["DICE 01.05\nroll"]).map((s) => s.id)).toEqual(["01.05"]);
  });
});

describe("splitByPage", () => {
  it("makes one section per page and collapses blank runs", () => {
    expect(splitByPage(["x   \n\n\n\ny ", "z"])).toEqual([
      { id: "p1", title: "Page 1", page: 1, body: "x\n\ny" },
      { id: "p2", title: "Page 2", page: 2, body: "z" },
    ]);
  });
});

describe("toMarkdown", () => {
  const ref = { edition: "11e", doc: "core-rules", source: "11th.pdf", mode: "ref" };
  const sections = [{ id: "09.07", title: "FALL-BACK MOVE", page: 33, body: "text" }];

  it("labels reference sections with their printed number", () => {
    const md = toMarkdown({ ...ref, sections });
    expect(md).toContain("## FALL-BACK MOVE (§09.07)");
    expect(md).toContain("<!-- id: 09.07, pdf page 33 -->");
  });

  it("labels page sections by page", () => {
    const md = toMarkdown({ edition: "10e", doc: "core-rules", source: "10th.pdf", mode: "page", sections: [{ id: "p20", title: "Page 20", page: 20, body: "b" }] });
    expect(md).toContain("## Page 20");
    expect(md).toContain("Cite as `p.<page>`");
  });

  it("is deterministic so re-runs produce identical files", () => {
    expect(toMarkdown({ ...ref, sections })).toBe(toMarkdown({ ...ref, sections }));
  });
});

describe("runPdftotext", () => {
  it("explains a missing binary instead of throwing a raw spawn error", () => {
    expect(() => runPdftotext("x.pdf", "no-such-binary-xyz")).toThrow(/pdftotext not found/);
  });
});
