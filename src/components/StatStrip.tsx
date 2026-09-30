import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { parseInvuln } from "../../parseRoster.mjs";
import { keywordDefinition } from "../data/keyword-glossary";
import { useTranslate } from "../lib/i18n";
import { InlineMarkup } from "./InlineMarkup";

interface StatStripProps {
  unit: ParsedUnit;
}

/** The six-stat line (M T SV W LD OC) and the invulnerable save under it. */
export function StatStrip({ unit }: StatStripProps) {
  const [showInvulnNote, setShowInvulnNote] = useState(false);
  const t = useTranslate();
  const { profile, invuln } = unit;

  const cells: Array<{ label: string; value: string }> = [
    { label: "M", value: profile.M ?? "—" },
    { label: "T", value: profile.T != null ? String(profile.T) : "—" },
    { label: "SV", value: profile.SV != null ? `${profile.SV}+` : "—" },
    { label: "W", value: profile.W != null ? String(profile.W) : "—" },
    { label: "LD", value: profile.LD ?? "—" },
    { label: "OC", value: profile.OC != null ? String(profile.OC) : "—" },
  ];

  const invulnAbility = invuln
    ? unit.abilities.find((a) => parseInvuln(a.name))
    : null;

  return (
    <div>
      <div className="grid grid-cols-6">
        {cells.map((cell, i) => (
          <div
            key={cell.label}
            className="flex flex-col items-center py-[14px] min-w-0"
            style={{ borderLeft: i > 0 ? "1px solid var(--rule-soft)" : undefined }}
          >
            <span className="mono font-bold text-[26px] leading-none tracking-[-0.03em]">
              {cell.value}
            </span>
            <span className="caption mt-[7px]">{cell.label}</span>
          </div>
        ))}
      </div>
      {invuln && (
        <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
          <button
            type="button"
            disabled={!invuln.conditional}
            onClick={() => setShowInvulnNote((v) => !v)}
            className="w-full min-h-[44px] px-[14px] flex items-center text-left"
          >
            <span className="flex items-baseline gap-[8px]">
              <span className="mono font-bold text-[20px] leading-[1.2]">{invuln.value}++</span>
              <span className="caption">Invuln</span>
              {invuln.conditional && (
                <span
                  className="text-[13px] font-medium has-rule"
                  style={{ color: "var(--ink-soft)" }}
                >
                  conditional
                </span>
              )}
            </span>
          </button>
          {showInvulnNote && invulnAbility?.text && (
            <p className="prose m-0 px-[14px] pb-[12px]">
              <InlineMarkup text={t(invulnAbility.text)} />
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * KEYWORDS chip row. Keywords with a glossary entry are tappable and open
 * their definition in a box directly under the row; the faction keyword
 * goes last with a dashed border.
 */
export function UnitKeywords({ unit }: { unit: ParsedUnit }) {
  const [openKeyword, setOpenKeyword] = useState<string | null>(null);
  const t = useTranslate();
  const openDefinition = openKeyword ? keywordDefinition(openKeyword) : null;
  const faction =
    unit.faction && !unit.keywords.includes(unit.faction) ? unit.faction : null;

  if (unit.keywords.length === 0 && !faction) return null;

  return (
    <div className="px-[14px] pt-[12px] pb-[14px]" style={{ borderTop: "1px solid var(--rule-soft)" }}>
      <div className="caption mb-[8px]">Keywords</div>
      <div className="flex flex-wrap gap-[6px]">
        {unit.keywords.map((kw) => {
          const hasRule = keywordDefinition(kw) != null;
          const isOpen = openKeyword === kw;
          const chipClass =
            "min-h-[36px] px-[10px] flex items-center rounded-[var(--r-chip)] text-[14px] font-semibold";
          if (!hasRule) {
            return (
              <span key={kw} className={chipClass} style={{ background: "var(--paper-sunk)" }}>
                {kw}
              </span>
            );
          }
          return (
            <button
              key={kw}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenKeyword((v) => (v === kw ? null : kw))}
              className={`${chipClass} hit-44 ${isOpen ? "selected" : ""}`}
              style={{
                background: isOpen ? undefined : "var(--paper-sunk)",
                border: "1px solid var(--rule)",
              }}
            >
              <span className="has-rule">{kw}</span>
            </button>
          );
        })}
        {faction && (
          <span
            className="display min-h-[36px] px-[10px] flex items-center rounded-[var(--r-chip)] text-[13px] font-bold uppercase tracking-[0.08em]"
            style={{ border: "1px dashed var(--rule)", color: "var(--ink-2)" }}
          >
            {faction}
          </span>
        )}
      </div>
      {openKeyword && openDefinition && (
        <div
          className="mt-[8px] rounded-[var(--r-control)] px-[12px] py-[10px]"
          style={{ background: "var(--paper-sunk)", border: "1px solid var(--rule)" }}
        >
          <div className="caption mb-[4px]" style={{ color: "var(--ink)" }}>
            {openKeyword}
          </div>
          <p className="prose m-0">
            <InlineMarkup text={t(openDefinition)} />
          </p>
        </div>
      )}
    </div>
  );
}
