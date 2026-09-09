import { describe, expect, it } from "vitest";
import { parseInlineMarkup } from "./inlineMarkup";

describe("parseInlineMarkup", () => {
  it("returns plain text as a single segment", () => {
    expect(parseInlineMarkup("Add 1 to the Hit roll.")).toEqual([
      { text: "Add 1 to the Hit roll.", bold: false, keyword: false },
    ]);
  });

  it("marks bold runs", () => {
    expect(parseInlineMarkup("Select **one** unit.")).toEqual([
      { text: "Select ", bold: false, keyword: false },
      { text: "one", bold: true, keyword: false },
      { text: " unit.", bold: false, keyword: false },
    ]);
  });

  it("marks keyword runs", () => {
    expect(parseInlineMarkup("a ^^Boyz^^ unit")).toEqual([
      { text: "a ", bold: false, keyword: false },
      { text: "Boyz", bold: false, keyword: true },
      { text: " unit", bold: false, keyword: false },
    ]);
  });

  it("nests the two markers in either order", () => {
    expect(parseInlineMarkup("**^^Boyz^^** and ^^**Orks**^^")).toEqual([
      { text: "Boyz", bold: true, keyword: true },
      { text: " and ", bold: false, keyword: false },
      { text: "Orks", bold: true, keyword: true },
    ]);
  });

  it("keeps line breaks inside a segment", () => {
    expect(parseInlineMarkup("**DEVASTATOR DOCTRINE**\nShoot after Advancing.")).toEqual([
      { text: "DEVASTATOR DOCTRINE", bold: true, keyword: false },
      { text: "\nShoot after Advancing.", bold: false, keyword: false },
    ]);
  });

  // The export carries the odd typo such as "**^Anathema Psykana^^**"; a
  // marker with no partner is ordinary text rather than a lost run.
  it("leaves an unmatched marker as literal text", () => {
    expect(parseInlineMarkup("a **^Psykana^^** unit")).toEqual([
      { text: "a ", bold: false, keyword: false },
      { text: "^Psykana^^", bold: true, keyword: false },
      { text: " unit", bold: false, keyword: false },
    ]);
  });

  it("returns nothing for an empty string", () => {
    expect(parseInlineMarkup("")).toEqual([]);
  });
});
