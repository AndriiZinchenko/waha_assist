import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData, Stratagem } from "../data/detachments";
import { coreStratagems } from "../data/core-stratagems";
import { usePhaseFilter } from "../lib/phaseFilter";
import { stratagemInPhase, type Phase } from "../lib/phases";
import { useUi } from "../lib/uiStrings";
import { CollapsibleSection } from "./Collapsible";
import { StratagemCard } from "./StratagemText";

interface StratagemGroup {
  label: string;
  stratagems: Stratagem[];
}

interface UnitStratagemsProps {
  unit: ParsedUnit;
  detachmentData: DetachmentData | null;
}

/** Phases with no attack to calculate, where the stratagems are the point. */
const OPENS_BY_ITSELF: ReadonlySet<Phase> = new Set(["command", "movement", "charge"]);

/** STRATAGEMS: what this unit can use, detachment first, then core. On the
 * battle screen only those usable in the current phase, unless Show all is on. */
export function UnitStratagems({ unit, detachmentData }: UnitStratagemsProps) {
  // null: the user has not touched it, so it follows the phase.
  const [chosen, setChosen] = useState<boolean | null>(null);
  const { filter } = usePhaseFilter();
  const ui = useUi();

  // Allied Units (e.g. Armiger/War Dog knights) can only use Core
  // Stratagems — they're not part of the detachment, so its
  // detachment-specific Stratagems don't apply to them.
  const isAllied = unit.keywords.includes("Allied Units");
  const groups: StratagemGroup[] = (
    isAllied
      ? [{ label: "Core", stratagems: coreStratagems }]
      : [
          {
            label: detachmentData ? `Detachment · ${detachmentData.name}` : "Detachment",
            stratagems: detachmentData?.stratagems ?? [],
          },
          { label: "Core", stratagems: coreStratagems },
        ]
  )
    .map((g) => ({
      ...g,
      stratagems: filter ? g.stratagems.filter((s) => stratagemInPhase(s.phase, filter)) : g.stratagems,
    }))
    .filter((g) => g.stratagems.length > 0);
  const total = groups.reduce((n, g) => n + g.stratagems.length, 0);
  const open = chosen ?? (filter !== null && OPENS_BY_ITSELF.has(filter));

  return (
    <CollapsibleSection
      label="Stratagems"
      count={total}
      open={open}
      onToggle={() => setChosen(!open)}
    >
      <div className="flex flex-col gap-[12px] pb-[10px]">
        {total === 0 && (
          <p className="prose m-0 px-[14px]">{ui("phase.noStratagems")}</p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-[10px]">
            <div className="caption px-[14px]">{group.label}</div>
            {group.stratagems.map((strat) => (
              <div key={strat.name} className="mx-[10px]">
                <StratagemCard strat={strat} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
