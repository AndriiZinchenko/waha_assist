import { useState } from "react";
import type { WeaponEntry } from "../../parseRoster.mjs";
import { useTranslate } from "../lib/i18n";
import { matchRule } from "../lib/rules";
import { InlineMarkup } from "./InlineMarkup";

interface WeaponRowProps {
  weapon: WeaponEntry;
  /** A sub-profile listed under its parent weapon's name. */
  indent?: boolean;
}

/** Column template shared by the weapon header and every weapon row:
 * six equal value columns on phones, name + six 50px columns ≥900px. */
export const WEAPON_GRID =
  "grid grid-cols-6 min-[900px]:grid-cols-[minmax(0,1fr)_repeat(6,50px)] gap-x-[4px] items-baseline";

const MINUS = "−";

function formatAp(ap: number): string {
  if (ap === 0) return "0";
  return String(ap).replace("-", MINUS);
}

export function WeaponRow({ weapon, indent = false }: WeaponRowProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const t = useTranslate();

  const leaderMods = weapon.leaderMods ?? [];
  const attacksModified = leaderMods.length > 0;
  const range = weapon.type === "melee" || !weapon.range || weapon.range === "Melee"
    ? "—"
    : weapon.range;

  function expandedText(label: string): string | null {
    return (
      matchRule(label, weapon.rules)?.text ??
      leaderMods.find((m) => m.name === label)?.text ??
      null
    );
  }

  function toggle(label: string) {
    setOpenLabel((v) => (v === label ? null : label));
  }

  const values: Array<{ key: string; text: string; boosted?: boolean; soft?: boolean }> = [
    { key: "rng", text: range },
    { key: "a", text: weapon.attacks?.raw ?? "—", boosted: attacksModified },
    { key: "skill", text: weapon.skill === null ? "auto" : `${weapon.skill}+`, soft: weapon.skill === null },
    { key: "s", text: String(weapon.strength) },
    { key: "ap", text: formatAp(weapon.ap) },
    { key: "d", text: weapon.damage?.raw ?? "—" },
  ];

  const openText = openLabel ? expandedText(openLabel) : null;
  const hasChips = weapon.keywords.length > 0 || attacksModified;

  return (
    <div
      className={`${WEAPON_GRID} px-[14px] py-[10px] ${indent ? "min-[900px]:pl-[26px]" : ""}`}
      style={{ borderTop: indent ? undefined : "1px solid var(--rule-soft)" }}
    >
      <span className="col-span-6 min-[900px]:col-span-1 min-w-0 flex items-baseline gap-[6px] mb-[4px] min-[900px]:mb-0">
        <span className="mono text-[14px] shrink-0" style={{ color: "var(--ink-soft)" }}>
          {weapon.count}×
        </span>
        <span className="text-[17px] font-semibold leading-[1.2]">{weapon.name}</span>
      </span>
      {values.map((v) => (
        <span
          key={v.key}
          className="mono font-semibold text-[18px] leading-[1.2] min-w-0"
          style={{
            color: v.boosted ? "var(--positive)" : v.soft ? "var(--ink-2)" : "var(--ink)",
            textDecoration: v.boosted ? "underline" : undefined,
            textDecorationThickness: v.boosted ? 2 : undefined,
            textUnderlineOffset: v.boosted ? 4 : undefined,
          }}
        >
          {v.text}
        </span>
      ))}
      {hasChips && (
        <span className="col-span-6 min-[900px]:col-span-7 min-[900px]:pl-[25px] flex flex-wrap gap-[6px] mt-[8px]">
          {weapon.keywords.map((kw) => {
            const rule = matchRule(kw, weapon.rules);
            const chip =
              "display min-h-[32px] px-[8px] flex items-center rounded-[var(--r-chip)] text-[13px] font-semibold tracking-[0.08em]";
            if (!rule) {
              return (
                <span key={kw} className={chip} style={{ background: "var(--raised)" }}>
                  {kw}
                </span>
              );
            }
            const isOpen = openLabel === kw;
            return (
              <button
                key={kw}
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(kw)}
                className={`${chip} hit-44 ${isOpen ? "selected" : ""}`}
                style={{ background: isOpen ? undefined : "var(--raised)" }}
              >
                <span className="has-rule">{kw}</span>
              </button>
            );
          })}
          {leaderMods.map((mod) => (
            <button
              key={mod.name}
              type="button"
              aria-expanded={openLabel === mod.name}
              onClick={() => toggle(mod.name)}
              className="hit-44 min-h-[32px] px-[10px] flex items-center gap-[4px] rounded-[15px] text-[13px] font-semibold"
              style={{ background: "var(--positive-fill)", color: "var(--positive)" }}
            >
              ▲ {mod.name}
            </button>
          ))}
        </span>
      )}
      {openLabel && openText && (
        <div
          className="col-span-6 min-[900px]:col-span-7 mt-[8px] rounded-[var(--r-control)] px-[12px] py-[10px]"
          style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
        >
          <div className="caption mb-[4px]" style={{ color: "var(--ink)" }}>
            {openLabel}
          </div>
          <p className="prose m-0 whitespace-pre-line">
            <InlineMarkup text={t(openText)} />
          </p>
        </div>
      )}
    </div>
  );
}
