import { useState } from "react";
import type { RuleRef } from "../../parseRoster.mjs";
import type { AttackRow as AttackRowData } from "../lib/combat";
import { useTranslate } from "../lib/i18n";
import { matchRule } from "../lib/rules";
import { rangeLabel, rowTones, type StatTone } from "../lib/attackDisplay";
import { InlineMarkup } from "./InlineMarkup";

interface AttackRowProps {
  row: AttackRowData;
}

const MINUS = "−";

function formatAp(ap: number): string {
  if (ap === 0) return "0";
  return String(ap).replace("-", MINUS);
}

function formatMod(mod: number): string {
  return mod > 0 ? `+${mod}` : String(mod);
}

function formatHit(hitTarget: number | null): string {
  return hitTarget === null ? "auto" : `${hitTarget}+`;
}

function formatSave(row: AttackRowData): string {
  if (row.saveTarget === null) return "no save";
  return `${row.saveTarget}${row.isInvulnFallback ? "++" : "+"}`;
}

function formatSaveDetail(row: AttackRowData): string | null {
  if (row.isInvulnFallback) {
    return row.armorTarget !== null ? `was ${row.armorTarget}+` : null;
  }
  if (row.armorTarget !== null) {
    const sv = row.armorTarget + row.ap;
    return `${sv}+ / AP${formatAp(row.ap)}`;
  }
  return null;
}

function halfRangeLabel(kind: "melta" | "rapidFire"): string {
  return kind === "melta" ? "Melta" : "Rapid Fire";
}

type NoteKind = "positive" | "negative" | "neutral";

interface Note {
  text: string;
  kind: NoteKind;
}

function toneColor(tone: StatTone): string | undefined {
  if (tone === "boost") return "var(--boost)";
  if (tone === "warn") return "var(--warn)";
  return undefined;
}

function noteColor(kind: NoteKind): string | undefined {
  if (kind === "positive") return "var(--positive)";
  if (kind === "negative") return "var(--negative)";
  return undefined;
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <>
      <div
        className="px-2 py-1 text-[11.5px] uppercase tracking-[0.03em] text-[var(--ink-soft)]"
        style={{ background: "var(--panel)" }}
      >
        {label}
      </div>
      <div
        className="mono px-2 py-1.5 text-[15px]"
        style={{ background: "var(--inset)", color }}
      >
        {value}
      </div>
    </>
  );
}

/** A clickable pill naming a source ability (a weapon keyword's rule, a
 * leader-attachment weapon bonus, or a leader's auto hit penalty) — click
 * to expand its text in the box below. */
function SourcePill({
  label,
  color,
  isOpen,
  onClick,
}: {
  label: string;
  color?: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="underline decoration-dotted"
      style={{ color: isOpen ? "var(--accent)" : color }}
    >
      {label}
    </button>
  );
}

export function AttackRow({ row }: AttackRowProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const t = useTranslate();
  const saveDetail = formatSaveDetail(row);
  const showAttacksDice = /[Dd]/.test(row.attacksRaw);
  const tones = rowTones(row);
  const range = rangeLabel(row);
  const atkValue = showAttacksDice
    ? `${row.count}×${row.attacksRaw}`
    : String(row.totalAttacks);

  function expandedText(label: string): string | null {
    return (
      matchRule(label, row.rules)?.text ??
      row.leaderMods.find((m) => m.name === label)?.text ??
      row.autoHitPenaltySources.find((m) => m.name === label)?.text ??
      null
    );
  }

  const notes: Note[] = [
    saveDetail && { text: `Save ${saveDetail}`, kind: "neutral" },
    row.conditionalInvulnAvailable != null && {
      text: `Target has a conditional ${row.conditionalInvulnAvailable}+ invuln, not applied — set Invuln override if it applies here`,
      kind: "negative",
    },
    row.antiX && {
      text: `Anti-${row.antiX.keyword} ${row.antiX.threshold}+ applied`,
      kind: "positive",
    },
    row.appliedHitMod !== 0 && {
      text: `Hit ${formatMod(row.appliedHitMod)} applied`,
      kind: row.appliedHitMod > 0 ? "positive" : "negative",
    },
    row.appliedWoundMod !== 0 && {
      text: `Wound ${formatMod(row.appliedWoundMod)} applied`,
      kind: row.appliedWoundMod > 0 ? "positive" : "negative",
    },
    row.apWorsened && {
      text: "AP worsened by 1 (Armour of Contempt)",
      kind: "positive",
    },
    row.halfRangeApplied &&
      row.halfRangeBonus && {
        text: `${halfRangeLabel(row.halfRangeBonus.kind)} ${row.halfRangeBonus.value} applied (half range)`,
        kind: "positive",
      },
  ].filter((n): n is Note => Boolean(n));

  const sourcePills: Array<{ ref: RuleRef; color: string }> = [
    ...row.leaderMods.map((ref) => ({ ref, color: "var(--boost)" })),
    ...row.autoHitPenaltySources.map((ref) => ({ ref, color: "var(--warn)" })),
  ];

  return (
    <div
      className="px-3 py-2 rounded-[8px]"
      style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
    >
      <div className="text-[14.5px] mb-1.5">
        <span className="mono">{row.count}×</span> {row.name}
        {range && (
          <span className="mono ml-1" style={{ color: "var(--meta)" }}>
            ({range})
          </span>
        )}
      </div>
      <div
        className="grid grid-flow-col auto-cols-fr grid-rows-2 gap-px rounded-[6px] overflow-hidden"
        style={{ background: "var(--rule)" }}
      >
        <StatCell label="Atk" value={atkValue} color={toneColor(tones.attacks)} />
        <StatCell
          label="Hit"
          value={formatHit(row.hitTarget)}
          color={toneColor(tones.hit)}
        />
        <StatCell
          label="Wound"
          value={`${row.woundTarget}+`}
          color={toneColor(tones.wound)}
        />
        <StatCell label="Save" value={formatSave(row)} color={toneColor(tones.save)} />
        <StatCell label="D" value={row.damage.raw} color={toneColor(tones.damage)} />
      </div>
      {(notes.length > 0 || row.keywords.length > 0 || sourcePills.length > 0) && (
        <div className="text-[13px] text-[var(--ink-soft)] leading-[1.5] mt-1.5">
          {notes.map((note, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <span style={{ color: noteColor(note.kind) }}>{note.text}</span>
            </span>
          ))}
          {row.keywords.length > 0 && (
            <span>
              {notes.length > 0 && " · "}
              {row.keywords.map((kw, i) => {
                const rule = matchRule(kw, row.rules);
                return (
                  <span key={kw}>
                    {i > 0 && ", "}
                    {rule ? (
                      <SourcePill
                        label={kw}
                        isOpen={openLabel === kw}
                        onClick={() =>
                          setOpenLabel((v) => (v === kw ? null : kw))
                        }
                      />
                    ) : (
                      kw
                    )}
                  </span>
                );
              })}
            </span>
          )}
          {sourcePills.length > 0 && (
            <span>
              {(notes.length > 0 || row.keywords.length > 0) && " · "}
              {sourcePills.map(({ ref, color }, i) => (
                <span key={ref.name}>
                  {i > 0 && ", "}
                  <SourcePill
                    label={ref.name}
                    color={color}
                    isOpen={openLabel === ref.name}
                    onClick={() =>
                      setOpenLabel((v) => (v === ref.name ? null : ref.name))
                    }
                  />
                </span>
              ))}
            </span>
          )}
          {openLabel && expandedText(openLabel) && (
            <div
              className="rounded-[6px] p-2 mt-1"
              style={{ background: "var(--inset)", color: "var(--ink)" }}
            >
              <InlineMarkup text={t(expandedText(openLabel))} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
