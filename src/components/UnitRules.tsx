import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { useTranslate } from "../lib/i18n";
import { CollapsibleSection } from "./Collapsible";
import { RuleItem } from "./UnitInfo";

interface UnitRulesProps {
  unit: ParsedUnit;
}

/** RULES: faction and core rules that apply to the unit. */
export function UnitRules({ unit }: UnitRulesProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslate();

  if (unit.rules.length === 0) return null;

  return (
    <CollapsibleSection
      label="Rules"
      count={unit.rules.length}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="px-[14px] pb-[14px] flex flex-col gap-[12px]">
        {unit.rules.map((rule) => (
          <RuleItem key={rule.name} name={rule.name} text={t(rule.text)} />
        ))}
      </div>
    </CollapsibleSection>
  );
}
