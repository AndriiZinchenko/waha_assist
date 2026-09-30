import type { Stratagem } from "../data/detachments";
import { useTranslate } from "../lib/i18n";
import { useUi } from "../lib/uiStrings";
import { InlineMarkup } from "./InlineMarkup";

interface StratagemTextProps {
  text: string;
  /** Rendered as a leading "WHEN:" paragraph — the stratagem's phase. */
  when?: string | null;
}

/**
 * Stratagem body text is a series of blank-line-separated paragraphs, each
 * usually starting with a short label (TARGET:, EFFECT:, RESTRICTIONS: in
 * English — ЦІЛЬ:, ЕФЕКТ:, ОБМЕЖЕННЯ: once translated). Split generically
 * on "label: rest" rather than matching the English words literally, so
 * this works the same regardless of language.
 */
export function StratagemText({ text, when }: StratagemTextProps) {
  const ui = useUi();
  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const match = paragraph.match(/^([^:\n]{2,24}):\s*([\s\S]*)$/);
      return match
        ? { label: match[1], body: match[2] }
        : { label: null, body: paragraph };
    });
  if (when) paragraphs.unshift({ label: ui("strat.when"), body: when });

  return (
    <div className="flex flex-col gap-[6px]">
      {paragraphs.map(({ label, body }, i) => (
        <p key={i} className="prose m-0">
          {label && (
            <span
              className="display font-bold text-[12px] uppercase tracking-[0.12em] mr-[6px]"
              style={{ color: "var(--ink)" }}
            >
              {label}:
            </span>
          )}
          <InlineMarkup text={body} />
        </p>
      ))}
    </div>
  );
}

/** The CP cost block at the right of a stratagem heading. */
export function CpBadge({ cost }: { cost: number }) {
  return (
    <span
      className="shrink-0 flex items-baseline gap-[3px] px-[7px] py-[3px] rounded-[var(--r-chip)]"
      style={{ border: "1px solid var(--ink)" }}
    >
      <span className="mono font-bold text-[18px] leading-none">{cost}</span>
      <span className="caption caption-sm leading-none" style={{ color: "var(--ink)" }}>
        CP
      </span>
    </span>
  );
}

/**
 * One stratagem as a card: name, type, CP cost, then the labelled
 * WHEN / TARGET / EFFECT / RESTRICTIONS paragraphs.
 */
export function StratagemCard({ strat }: { strat: Stratagem }) {
  const t = useTranslate();
  return (
    <div
      className="rounded-[var(--r-control)] pt-[11px] px-[12px] pb-[12px] flex flex-col gap-[8px]"
      style={{ background: "var(--paper-sunk)", border: "1px solid var(--raised)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="display font-bold text-[18px] leading-[1.15] uppercase">
            {strat.name}
          </div>
          {strat.type && (
            <div className="font-semibold text-[13px] mt-[2px]" style={{ color: "var(--ink-2)" }}>
              {strat.type}
            </div>
          )}
        </div>
        <CpBadge cost={strat.cost} />
      </div>
      <StratagemText text={t(strat.text) ?? ""} when={t(strat.phase ?? null)} />
    </div>
  );
}
