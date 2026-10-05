import { describe, expect, it } from "vitest";
import { parseCsv, htmlToText, validateTable } from "./wahapedia.mjs";

describe("parseCsv", () => {
  it("strips the BOM and the trailing pipe, keying rows by header", () => {
    const { headers, rows, bad } = parseCsv("﻿id|name|\n1|Synapse|\n2|Other|\n");
    expect(headers).toEqual(["id", "name"]);
    expect(rows).toEqual([{ id: "1", name: "Synapse" }, { id: "2", name: "Other" }]);
    expect(bad).toEqual([]);
  });

  it("joins a record that wraps onto the next line", () => {
    const { rows } = parseCsv("id|text|\n1|line one\nline two|\n");
    expect(rows).toEqual([{ id: "1", text: "line one\nline two" }]);
  });

  it("reports lines with too many fields instead of misaligning them", () => {
    const { rows, bad } = parseCsv("id|text|\n1|ok|\n2|a|b|c|\n");
    expect(rows).toHaveLength(1);
    expect(bad).toEqual([3]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a|b|c|\n1||3|\n").rows[0]).toEqual({ a: "1", b: "", c: "3" });
  });
});

describe("htmlToText", () => {
  it("turns breaks and lists into text and decodes entities", () => {
    expect(htmlToText('If <span class="kwb">TYRANIDS</span> &amp; more<br>next')).toBe("If TYRANIDS & more\nnext");
    expect(htmlToText("<b>WHEN:</b> x<br><br><b>EFFECT:</b> y<ul><li>one</li><li>two</li></ul>")).toBe(
      "WHEN: x\n\nEFFECT: y\n- one\n- two",
    );
  });
});

describe("validateTable", () => {
  it("accepts a normal table", () => {
    expect(validateTable("Datasheets", "id|name|\n1|a|\n")).toBeNull();
  });

  it("rejects an HTML error page served with HTTP 200", () => {
    expect(validateTable("Datasheets", "<!DOCTYPE html><html>Not found</html>")).toMatch(/HTML page/);
  });

  it("rejects an empty file and a header-only file", () => {
    expect(validateTable("Datasheets", "")).toMatch(/no header row/);
    expect(validateTable("Datasheets", "id|name|\n")).toMatch(/no data rows/);
  });

  it("rejects a table where more than 0.5% of lines are malformed", () => {
    const rows = Array.from({ length: 50 }, (_, i) => `${i}|ok|`).join("\n");
    expect(validateTable("T", `id|t|\n${rows}\n99|a|b|c|\n`)).toMatch(/malformed/);
  });

  it("tolerates a single malformed line in a large table", () => {
    const rows = Array.from({ length: 400 }, (_, i) => `${i}|ok|`).join("\n");
    expect(validateTable("T", `id|t|\n${rows}\n99|a|b|c|\n`)).toBeNull();
  });
});
