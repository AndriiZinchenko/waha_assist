import { useState } from "react";
import type { WeaponEntry } from "../../parseRoster.mjs";
import { useTranslate } from "../lib/i18n";
import { matchRule } from "../lib/rules";
import { InlineMarkup } from "./InlineMarkup";

interface WeaponRowProps {
  weapon: WeaponEntry;
  indent?: boolean;
  zebra?: boolean;
}

const MINUS = "−";

function formatAp(ap: number): string {
  if (ap === 0) return "0";
  return String(ap).replace("-", MINUS);
}

export function WeaponRow({
  weapon,
  indent = false,
  zebra = false,
}: WeaponRowProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const t = useTranslate();
  const skillLabel =
    weapon.skill === null ? (
      <span className="text-[var(--ink-soft)]">auto</span>
    ) : (
      `${weapon.skill}+`
    );

  const leaderMods = weapon.leaderMods ?? [];
  const attacksModified = leaderMods.length > 0;

  function expandedText(label: string): string | null {
    return (
      matchRule(label, weapon.rules)?.text ??
      leaderMods.find((m) => m.name === label)?.text ??
      null
    );
  }

  return (
    <div
      className="grid grid-cols-[2.5rem_1fr_3rem_2.5rem_2.5rem_2rem_2rem_2.5rem] gap-x-1 items-baseline px-3 py-1.5"
      style={{ background: zebra ? "var(--panel)" : undefined }}
    >
      <span className="mono text-[16.5px]">{weapon.count}×</span>
      <span className={indent ? "pl-3" : undefined}>{weapon.name}</span>
      <span className="mono text-[14.5px] text-[var(--ink-soft)]">
        {weapon.range ?? "—"}
      </span>
      <span
        className="mono text-[16.5px]"
        style={{ color: attacksModified ? "var(--boost)" : undefined }}
      >
        {weapon.attacks?.raw ?? "—"}
      </span>
      <span className="mono text-[16.5px]">{skillLabel}</span>
      <span className="mono text-[16.5px]">{weapon.strength}</span>
      <span className="mono text-[16.5px]">{formatAp(weapon.ap)}</span>
      <span className="mono text-[16.5px]">{weapon.damage?.raw ?? "—"}</span>
      {weapon.keywords.length > 0 && (
        <span className="col-span-8 text-[13.5px] text-[var(--ink-soft)]">
          {weapon.keywords.map((kw, i) => {
            const rule = matchRule(kw, weapon.rules);
            return (
              <span key={kw}>
                {i > 0 && ", "}
                {rule ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenLabel((v) => (v === kw ? null : kw))
                    }
                    className="underline decoration-dotted"
                    style={{
                      color: openLabel === kw ? "var(--accent)" : undefined,
                    }}
                  >
                    {kw}
                  </button>
                ) : (
                  kw
                )}
              </span>
            );
          })}
        </span>
      )}
      {attacksModified && (
        <span
          className="col-span-8 text-[13.5px]"
          style={{ color: "var(--boost)" }}
        >
          {leaderMods.map((mod, i) => (
            <span key={mod.name}>
              {i > 0 && ", "}
              <button
                type="button"
                onClick={() =>
                  setOpenLabel((v) => (v === mod.name ? null : mod.name))
                }
                className="underline decoration-dotted"
              >
                {mod.name}
              </button>
            </span>
          ))}
        </span>
      )}
      {openLabel && expandedText(openLabel) && (
        <div
          className="col-span-8 text-[13.5px] leading-[1.5] rounded-[6px] p-2 mt-1"
          style={{ background: "var(--inset)", color: "var(--ink)" }}
        >
          <InlineMarkup text={t(expandedText(openLabel))} />
        </div>
      )}
    </div>
  );
}
