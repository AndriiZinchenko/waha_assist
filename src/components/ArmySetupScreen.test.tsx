import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ArmyEntry } from "../lib/armies";
import type { Edition } from "../lib/edition";
import { ArmySetupScreen } from "./ArmySetupScreen";

function army(id: string, edition: Edition): ArmyEntry {
  return {
    id,
    fileName: `/armies/${id}.json`,
    edition,
    parsed: { catalogue: `Cat ${id}`, name: id, pointsTotal: 1000, units: [], detachment: null },
  } as unknown as ArmyEntry;
}

function render(edition: Edition, shown: ArmyEntry[], counts: Record<Edition, number>) {
  return renderToStaticMarkup(
    <ArmySetupScreen
      armies={shown}
      edition={edition}
      editionCounts={counts}
      onChangeEdition={() => {}}
      selection={{ a: null, b: null }}
      detachmentOverrides={{}}
      onAssign={() => {}}
      onStart={() => {}}
      onConfigure={() => {}}
    />,
  );
}

describe("ArmySetupScreen: edition toggle", () => {
  const ten = [army("Orks", 10), army("Grey", 10)];

  it("offers 10th and 11th with their army counts, the current one pressed", () => {
    const html = render(10, ten, { 10: 2, 11: 0 });
    const buttons = html.split("<button").filter((b) => /aria-label="(10th|11th) edition"/.test(b));
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain('aria-pressed="true"');
    expect(buttons[0]).toContain("2");
    expect(buttons[1]).toContain('aria-pressed="false"');
    expect(buttons[1]).toContain("0");
  });

  it("lists the armies it is given", () => {
    const html = render(10, ten, { 10: 2, 11: 0 });
    expect(html).toContain("Cat Orks");
    expect(html).toContain("Cat Grey");
  });

  it("explains an edition with no armies, keeping the toggle", () => {
    const html = render(11, [], { 10: 2, 11: 0 });
    expect(html).toContain("No 11th edition armies yet");
    expect(html).toContain("npm run sync:armies");
    expect(html).toContain('aria-label="10th edition"');
    expect(html).not.toContain("Cat Orks");
  });

  it("keeps the original empty state, without a toggle, when there are no armies at all", () => {
    const html = render(10, [], { 10: 0, 11: 0 });
    expect(html).toContain("No rosters found yet");
    expect(html).not.toContain("edition");
  });
});
