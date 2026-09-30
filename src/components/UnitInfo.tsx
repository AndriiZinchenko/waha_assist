import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { useTranslate } from "../lib/i18n";
import { CollapsibleSection } from "./Collapsible";
import { InlineMarkup } from "./InlineMarkup";

interface UnitInfoProps {
  unit: ParsedUnit;
}

/** INFO: the unit's abilities, grouped by ability section when there is
 * more than one (e.g. Abilities, Marks of Chaos). */
export function UnitInfo({ unit }: UnitInfoProps) {
  const [open, setOpen] = useState(true);
  const t = useTranslate();

  if (unit.abilities.length === 0) return null;

  return (
    <CollapsibleSection
      label="Info"
      count={unit.abilities.length}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="px-[14px] pb-[14px] flex flex-col gap-[14px]">
        {unit.abilitySections.map((section) => (
          <div key={section.type} className="flex flex-col gap-[12px]">
            {unit.abilitySections.length > 1 && (
              <div className="caption">{section.type}</div>
            )}
            {section.items.map((ability) => (
              <RuleItem key={ability.name} name={ability.name} text={t(ability.text)} />
            ))}
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

/** A named rule with its prose paragraphs, as used in INFO and RULES. */
export function RuleItem({
  name,
  text,
  source,
}: {
  name: string;
  text: string | null;
  /** Small caption after the name, e.g. FACTION or CORE. */
  source?: string;
}) {
  const paragraphs = (text ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div>
      <div className="flex items-baseline gap-[8px]">
        <span className="text-[17px] font-semibold leading-[1.2]">{name}</span>
        {source && <span className="caption caption-sm">{source}</span>}
      </div>
      {paragraphs.length > 0 && (
        <div className="mt-[4px] flex flex-col gap-[6px]">
          {paragraphs.map((p, i) => (
            <p key={i} className="prose m-0 whitespace-pre-line">
              <InlineMarkup text={p} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
