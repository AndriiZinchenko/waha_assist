import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData, Stratagem } from "../data/detachments";
import { coreStratagems } from "../data/core-stratagems";
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

/** STRATAGEMS: what this unit can use, detachment first, then core. */
export function UnitStratagems({ unit, detachmentData }: UnitStratagemsProps) {
  const [open, setOpen] = useState(false);

  // Allied Units (e.g. Armiger/War Dog knights) can only use Core
  // Stratagems — they're not part of the detachment, so its
  // detachment-specific Stratagems don't apply to them.
  const isAllied = unit.keywords.includes("Allied Units");
  const groups: StratagemGroup[] = isAllied
    ? [{ label: "Core", stratagems: coreStratagems }]
    : [
        {
          label: detachmentData ? `Detachment · ${detachmentData.name}` : "Detachment",
          stratagems: detachmentData?.stratagems ?? [],
        },
        { label: "Core", stratagems: coreStratagems },
      ].filter((g) => g.stratagems.length > 0);
  const total = groups.reduce((n, g) => n + g.stratagems.length, 0);

  return (
    <CollapsibleSection
      label="Stratagems"
      count={total}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="flex flex-col gap-[12px] pb-[10px]">
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
