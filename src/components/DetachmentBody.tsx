import type { DetachmentData, Stratagem } from "../data/detachments";
import { coreStratagems } from "../data/core-stratagems";
import { useTranslate } from "../lib/i18n";
import { InlineMarkup } from "./InlineMarkup";
import { StratagemMeta, StratagemText } from "./StratagemText";

function StratagemList({ stratagems }: { stratagems: Stratagem[] }) {
  const t = useTranslate();
  return (
    <>
      {stratagems.map((strat) => (
        <div key={strat.name}>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="text-[12.5px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {strat.name}
            </span>
            <span className="mono text-[11px] text-[var(--ink-soft)] shrink-0">
              {strat.cost}CP
            </span>
          </div>
          <StratagemMeta type={strat.type} phase={t(strat.phase ?? null)} />
          <div className="text-[12.5px] text-[var(--ink-soft)] leading-[1.6]">
            <StratagemText text={t(strat.text) ?? ""} />
          </div>
        </div>
      ))}
    </>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <div
      className="text-[10.5px] font-semibold uppercase tracking-[0.06em]"
      style={{ color: "var(--accent-heading)" }}
    >
      {children}
    </div>
  );
}

interface DetachmentBodyProps {
  data: DetachmentData;
  /** Append the Core Stratagems, which every detachment shares. On when
   * one detachment is shown alone, off in a list of them. */
  showCore?: boolean;
}

/** A detachment's rules and stratagems, as shown in the battle screen's
 * modal and in each row of the configuration tab. */
export function DetachmentBody({ data, showCore = false }: DetachmentBodyProps) {
  const t = useTranslate();
  return (
    <>
      <div className="flex flex-col gap-3">
        {data.rules.map((rule) => (
          <div key={rule.name}>
            <div
              className="text-[12.5px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {rule.name}
            </div>
            <div className="text-[12.5px] text-[var(--ink-soft)] leading-[1.6] whitespace-pre-line">
              <InlineMarkup text={t(rule.text)} />
            </div>
          </div>
        ))}
      </div>

      {data.stratagems.length > 0 && (
        <div
          className="flex flex-col gap-3 border-t pt-3"
          style={{ borderColor: "var(--rule)" }}
        >
          <SectionHeading>Stratagems</SectionHeading>
          <StratagemList stratagems={data.stratagems} />
        </div>
      )}

      {showCore && (
        <div
          className="flex flex-col gap-3 border-t pt-3"
          style={{ borderColor: "var(--rule)" }}
        >
          <SectionHeading>Core Stratagems</SectionHeading>
          <StratagemList stratagems={coreStratagems} />
        </div>
      )}
    </>
  );
}
