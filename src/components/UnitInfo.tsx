import { useState, type ReactNode } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { useTranslate } from "../lib/i18n";
import { usePhaseFilter } from "../lib/phaseFilter";
import { matchesPhase } from "../lib/phases";
import { CollapsibleSection } from "./Collapsible";
import { InlineMarkup } from "./InlineMarkup";
import { PhaseFold, PhaseTag } from "./PhaseFilterBar";

interface UnitInfoProps {
  unit: ParsedUnit;
}

/** INFO: the unit's abilities, grouped by ability section when there is
 * more than one (e.g. Abilities, Marks of Chaos). On the battle screen the
 * ones naming the current phase come first, tagged, and the rest are folded
 * under "Other" (see PhaseFilterBar). */
export function UnitInfo({ unit }: UnitInfoProps) {
  const [open, setOpen] = useState(true);
  const t = useTranslate();
  const { filter } = usePhaseFilter();

  if (unit.abilities.length === 0) return null;

  type Ability = (typeof unit.abilities)[number];
  const sectionsOf = (keep: (a: Ability) => boolean) =>
    unit.abilitySections
      .map((section) => ({ ...section, items: section.items.filter(keep) }))
      .filter((section) => section.items.length > 0);

  function renderSections(sections: ReturnType<typeof sectionsOf>, tagged: boolean) {
    return sections.map((section) => (
      <div key={section.type} className="flex flex-col gap-[12px]">
        {unit.abilitySections.length > 1 && <div className="caption">{section.type}</div>}
        {section.items.map((ability) => (
          <RuleItem
            key={ability.name}
            name={ability.name}
            text={t(ability.text)}
            tag={tagged && filter ? <PhaseTag phase={filter} /> : undefined}
          />
        ))}
      </div>
    ));
  }

  const matching = filter ? sectionsOf((a) => matchesPhase(a, filter)) : null;
  const other = filter ? sectionsOf((a) => !matchesPhase(a, filter)) : null;
  const otherCount = other ? other.reduce((n, s) => n + s.items.length, 0) : 0;

  return (
    <CollapsibleSection
      label="Info"
      count={unit.abilities.length}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="px-[14px] pb-[14px] flex flex-col gap-[14px]">
        {matching && other ? (
          <>
            {renderSections(matching, true)}
            {otherCount > 0 && <PhaseFold count={otherCount}>{renderSections(other, false)}</PhaseFold>}
          </>
        ) : (
          renderSections(sectionsOf(() => true), false)
        )}
      </div>
    </CollapsibleSection>
  );
}

/** A named rule with its prose paragraphs, as used in INFO and RULES. */
export function RuleItem({
  name,
  text,
  source,
  tag,
}: {
  name: string;
  text: string | null;
  /** Small caption after the name, e.g. FACTION or CORE. */
  source?: string;
  /** Marker after the name, e.g. the phase it applies to. */
  tag?: ReactNode;
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
        {tag}
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
