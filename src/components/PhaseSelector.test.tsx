import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhaseSelector } from "./PhaseSelector";

describe("PhaseSelector", () => {
  const html = renderToStaticMarkup(<PhaseSelector phase="charge" onChange={() => {}} />);

  it("has one button per phase, named for screen readers and tooltips, with no visible words", () => {
    for (const name of ["Command", "Movement", "Shooting", "Charge", "Fight"]) {
      expect(html).toContain(`aria-label="${name} phase"`);
      expect(html).toContain(`title="${name} phase"`);
    }
    expect(html.match(/<button/g)).toHaveLength(5);
    // The only text in the markup is inside attributes.
    expect(html.replace(/<[^>]+>/g, "")).toBe("");
  });

  it("marks only the current phase as pressed", () => {
    const pressed = html.split("<button").slice(1).filter((b) => b.includes('aria-pressed="true"'));
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toContain('aria-label="Charge phase"');
  });
});
