import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { useTranslate } from "../lib/i18n";
import { InlineMarkup } from "./InlineMarkup";

interface UnitRulesProps {
  unit: ParsedUnit;
}

export function UnitRules({ unit }: UnitRulesProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslate();

  if (unit.rules.length === 0) return null;

  return (
    <div className="border-t pt-2.5" style={{ borderColor: "var(--rule)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: "var(--accent-heading)" }}
      >
        <span
          className="inline-block transition-transform duration-150 normal-case"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ›
        </span>
        Rules
      </button>
      <div className="expand-body" data-open={open}>
        <div className="pt-2 flex flex-col gap-2">
          {unit.rules.map((rule) => (
            <div key={rule.name}>
              <div
                className="text-[14.5px] font-semibold"
                style={{ color: "var(--accent-heading)" }}
              >
                {rule.name}
              </div>
              {rule.text && (
                <div className="text-[13.5px] text-[var(--ink-soft)] leading-[1.5]">
                  <InlineMarkup text={t(rule.text)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
