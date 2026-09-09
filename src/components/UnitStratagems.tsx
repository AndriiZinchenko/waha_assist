import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData, Stratagem } from "../data/detachments";
import { coreStratagems } from "../data/core-stratagems";
import { useTranslate } from "../lib/i18n";
import { StratagemMeta, StratagemText } from "./StratagemText";

interface StratagemGroup {
  label: string;
  stratagems: Stratagem[];
}

function StratagemRow({ strat }: { strat: Stratagem }) {
  const [open, setOpen] = useState(false);
  const t = useTranslate();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className="inline-block transition-transform duration-150 shrink-0"
            style={{
              color: "var(--ink-soft)",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ›
          </span>
          <span
            className="text-[13.5px] font-semibold truncate text-left"
            style={{ color: "var(--accent-heading)" }}
          >
            {strat.name}
          </span>
        </span>
        <span className="mono text-[12px] text-[var(--ink-soft)] shrink-0">
          {strat.cost}CP
        </span>
      </button>
      <div className="expand-body" data-open={open}>
        <div>
          <div className="pt-1 pl-[19px] pb-1">
            <StratagemMeta type={strat.type} phase={t(strat.phase ?? null)} />
            <div className="text-[13px] text-[var(--ink-soft)] leading-[1.5]">
              <StratagemText text={t(strat.text) ?? ""} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UnitStratagemsProps {
  unit: ParsedUnit;
  detachmentData: DetachmentData | null;
}

export function UnitStratagems({ unit, detachmentData }: UnitStratagemsProps) {
  const [open, setOpen] = useState(false);

  // Allied Units (e.g. Armiger/War Dog knights) can only use Core
  // Stratagems — they're not part of the detachment, so its
  // detachment-specific Stratagems don't apply to them.
  const isAllied = unit.keywords.includes("Allied Units");
  const groups: StratagemGroup[] = isAllied
    ? [{ label: "Core", stratagems: coreStratagems }]
    : [
        { label: "Detachment", stratagems: detachmentData?.stratagems ?? [] },
        { label: "Core", stratagems: coreStratagems },
      ].filter((g) => g.stratagems.length > 0);

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
        Stratagems
      </button>
      <div className="expand-body" data-open={open}>
        <div>
          <div className="pt-2 flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1.5">
                {groups.length > 1 && (
                  <div
                    className="text-[9.5px] font-semibold uppercase tracking-[0.06em]"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {group.label}
                  </div>
                )}
                {group.stratagems.map((strat) => (
                  <StratagemRow key={strat.name} strat={strat} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
