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

describe("ModifierControls: AP and Waaagh!", () => {
  const html = (showWaaagh: boolean) =>
    renderToStaticMarkup(
      <ModifierControls
        modifiers={emptyModifiers()}
        onChange={() => {}}
        onClose={() => {}}
        showWaaagh={showWaaagh}
      />,
    );

  it("offers AP as a stepper, not as checkboxes", () => {
    expect(html(false)).toContain("AP modifier up");
    expect(html(false)).toContain("AP modifier down");
    expect(html(false)).not.toContain("AP worsened by 1");
  });

  it("offers Waaagh! only when asked for", () => {
    expect(html(true)).toContain("Waaagh!");
    expect(html(false)).not.toContain("Waaagh!");
  });
});

describe("ModifierControls: collapsing", () => {
  const html = (collapsed: boolean) =>
    renderToStaticMarkup(
      <ModifierControls
        modifiers={{ ...emptyModifiers(), apMod: 1 }}
        onChange={() => {}}
        onClose={() => {}}
        collapsed={collapsed}
        onToggleCollapsed={() => {}}
      />,
    );

  it("collapsed: hides the controls and shows the active modifiers", () => {
    const out = html(true);
    expect(out).not.toContain("AP modifier up");
    expect(out).toContain("AP +1");
    expect(out).toContain('aria-expanded="false"');
  });

  it("expanded: shows the controls with a collapse button", () => {
    const out = html(false);
    expect(out).toContain("AP modifier up");
    expect(out).toContain('aria-expanded="true"');
  });
});
