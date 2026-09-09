import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import { parseInvuln } from "../../parseRoster.mjs";
import { keywordDefinition } from "../data/keyword-glossary";
import { useTranslate } from "../lib/i18n";
import { InlineMarkup } from "./InlineMarkup";

interface StatStripProps {
  unit: ParsedUnit;
}

export function StatStrip({ unit }: StatStripProps) {
  const [showInvulnNote, setShowInvulnNote] = useState(false);
  const [openKeyword, setOpenKeyword] = useState<string | null>(null);
  const t = useTranslate();
  const { profile, invuln } = unit;
  const openDefinition = openKeyword ? keywordDefinition(openKeyword) : null;

  const cells: Array<{ label: string; value: string }> = [
    { label: "M", value: profile.M ?? "—" },
    { label: "T", value: profile.T != null ? String(profile.T) : "—" },
    { label: "Sv", value: profile.SV != null ? `${profile.SV}+` : "—" },
    { label: "W", value: profile.W != null ? String(profile.W) : "—" },
    { label: "Ld", value: profile.LD ?? "—" },
    { label: "OC", value: profile.OC != null ? String(profile.OC) : "—" },
  ];

  const invulnAbility = invuln
    ? unit.abilities.find((a) => parseInvuln(a.name))
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-[7px] flex flex-col items-center py-2"
            style={{ background: "var(--inset)" }}
          >
            <span className="mono text-[18.5px] leading-[1.1]">{cell.value}</span>
            <span className="text-[11.5px] text-[var(--ink-soft)] uppercase mt-0.5">
              {cell.label}
            </span>
          </div>
        ))}
      </div>
      {invuln && (
        <button
          type="button"
          disabled={!invuln.conditional}
          onClick={() => setShowInvulnNote((v) => !v)}
          className="w-full rounded-[7px] flex items-center justify-center gap-2 py-1.5"
          style={{
            background: "var(--inset)",
            color: invuln.conditional ? "var(--warn)" : "var(--accent)",
          }}
        >
          <span className="mono text-[16.5px]">{invuln.value}++</span>
          <span className="text-[12.5px] text-[var(--ink-soft)] uppercase">
            Invuln
          </span>
        </button>
      )}
      {showInvulnNote && invulnAbility?.text && (
        <div className="text-[13.5px] text-[var(--ink-soft)]">
          {invulnAbility.text}
        </div>
      )}
      {unit.keywords.length > 0 && (
        <div className="text-[13px] text-[var(--ink-soft)] leading-[1.5]">
          {unit.keywords.map((kw, i) => {
            const isOpen = openKeyword === kw;
            return (
              <span key={kw}>
                {i > 0 && ", "}
                {keywordDefinition(kw) ? (
                  <button
                    type="button"
                    onClick={() => setOpenKeyword((v) => (v === kw ? null : kw))}
                    className="underline decoration-dotted"
                    style={{ color: isOpen ? "var(--accent)" : undefined }}
                  >
                    {kw}
                  </button>
                ) : (
                  kw
                )}
              </span>
            );
          })}
        </div>
      )}
      {openKeyword && openDefinition && (
        <div
          className="rounded-[7px] px-3 py-2 text-[13.5px] text-[var(--ink-soft)] leading-[1.5]"
          style={{ background: "var(--inset)" }}
        >
          <span className="font-semibold" style={{ color: "var(--accent-heading)" }}>
            {openKeyword}
          </span>
          {" — "}
          <InlineMarkup text={t(openDefinition)} />
        </div>
      )}
    </div>
  );
}
