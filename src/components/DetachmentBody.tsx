import { useState } from "react";
import type { DetachmentData, Stratagem } from "../data/detachments";
import { coreStratagems } from "../data/core-stratagems";
import { useTranslate } from "../lib/i18n";
import { Chevron } from "./Collapsible";
import { CpBadge, StratagemCard, StratagemText } from "./StratagemText";
import { RuleItem } from "./UnitInfo";

/** A one-line stratagem row that opens to its text — the compact form
 * used inside a list of detachments. */
function CompactStratagem({ strat }: { strat: Stratagem }) {
  const [open, setOpen] = useState(false);
  const t = useTranslate();
  return (
    <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-[48px] py-[6px] flex items-center gap-[10px] text-left"
      >
        <Chevron open={open} />
        <span className="flex-1 min-w-0">
          <span className="display block font-bold text-[16px] uppercase leading-[1.15]">{strat.name}</span>
          {strat.type && (
            <span className="block text-[13px] font-semibold" style={{ color: "var(--ink-2)" }}>
              {strat.type}
            </span>
          )}
        </span>
        <CpBadge cost={strat.cost} />
      </button>
      <div className="expand-body" data-open={open}>
        <div>
          <div className="pl-[22px] pb-[10px]">
            <StratagemText text={t(strat.text) ?? ""} when={t(strat.phase ?? null)} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface DetachmentBodyProps {
  data: DetachmentData;
  /** Append the Core Stratagems, which every detachment shares. On when
   * one detachment is shown alone, off in a list of them. */
  showCore?: boolean;
  /** Compact stratagem rows (configuration list) instead of full cards
   * (detachment sheet). */
  compact?: boolean;
}

/** A detachment's rules and stratagems, as shown in the battle screen's
 * sheet and in each row of the configuration tab. */
export function DetachmentBody({ data, showCore = false, compact = false }: DetachmentBodyProps) {
  const t = useTranslate();
  const Strat = compact ? CompactStratagem : StratagemCard;
  return (
    <>
      {data.rules.length > 0 && (
        <section className="flex flex-col gap-[10px]">
          <div className="caption">Rules</div>
          {data.rules.map((rule) => (
            <RuleItem key={rule.name} name={rule.name} text={t(rule.text)} />
          ))}
        </section>
      )}

      {data.stratagems.length > 0 && (
        <section className={`flex flex-col ${compact ? "" : "gap-[10px]"}`}>
          <div className={`caption ${compact ? "mb-[6px]" : ""}`}>
            Stratagems · {data.stratagems.length}
          </div>
          {data.stratagems.map((strat) => (
            <Strat key={strat.name} strat={strat} />
          ))}
        </section>
      )}

      {showCore && (
        <section className={`flex flex-col ${compact ? "" : "gap-[10px]"}`}>
          <div className="caption">Core stratagems · {coreStratagems.length}</div>
          {coreStratagems.map((strat) => (
            <Strat key={strat.name} strat={strat} />
          ))}
        </section>
      )}
    </>
  );
}
