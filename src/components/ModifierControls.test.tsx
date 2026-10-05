import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyModifiers } from "../lib/combat";
import { ModifierControls } from "./ModifierControls";

function render(engaged: boolean, showEngaged: boolean) {
  return renderToStaticMarkup(
    <ModifierControls
      modifiers={{ ...emptyModifiers(), engaged }}
      onChange={() => {}}
      onClose={() => {}}
      showEngaged={showEngaged}
    />,
  );
}

describe("ModifierControls: Engaged toggle", () => {
  it("is offered once when asked for, and absent otherwise", () => {
    const html = render(false, true);
    expect(html.match(/>Engaged</g)).toHaveLength(1);
    expect(html).toContain("Engagement Range");
    expect(render(false, false)).not.toContain("Engaged");
  });

  it("shows as checked or not from the modifiers", () => {
    const toggle = (html: string) => html.split("<button").find((b) => b.includes("Engaged"))!;
    expect(toggle(render(true, true))).toContain('aria-checked="true"');
    expect(toggle(render(false, true))).toContain('aria-checked="false"');
  });
});
