import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { referencedCoreRules } from "../lib/coreRules";
import { useTranslate } from "../lib/i18n";
import { usePhaseFilter } from "../lib/phaseFilter";
import { partitionByPhase } from "../lib/phases";
import { CollapsibleSection } from "./Collapsible";
import { PhaseFold, PhaseTag } from "./PhaseFilterBar";
import { RuleItem } from "./UnitInfo";

interface UnitRulesProps {
  unit: ParsedUnit;
}

/** RULES: faction and core rules that apply to the unit, plus the core
 * abilities its abilities mention. On the battle screen the ones naming the
 * current phase come first, tagged, and the rest are folded under "Other". */
export function UnitRules({ unit }: UnitRulesProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslate();
  const { filter } = usePhaseFilter();

  const rules = [...unit.rules, ...referencedCoreRules(unit)];
  if (rules.length === 0) return null;

  const { matching, other } = filter
    ? partitionByPhase(rules, filter)
    : { matching: rules, other: [] };
  const item = (rule: (typeof rules)[number], tagged: boolean) => (
    <RuleItem
      key={rule.name}
      name={rule.name}
      text={t(rule.text)}
      tag={tagged && filter ? <PhaseTag phase={filter} /> : undefined}
    />
  );

  return (
    <CollapsibleSection
      label="Rules"
      count={rules.length}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="px-[14px] pb-[14px] flex flex-col gap-[12px]">
        {matching.map((rule) => item(rule, filter !== null))}
        {other.length > 0 && (
          <PhaseFold count={other.length}>
            <div className="flex flex-col gap-[12px]">{other.map((rule) => item(rule, false))}</div>
          </PhaseFold>
        )}
      </div>
    </CollapsibleSection>
  );
}
