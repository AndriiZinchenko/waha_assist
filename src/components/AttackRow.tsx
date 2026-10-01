import { useState } from "react";
import type { RuleRef } from "../../parseRoster.mjs";
import type { AttackRow as AttackRowData } from "../lib/combat";
import { useTranslate } from "../lib/i18n";
import { matchRule } from "../lib/rules";
import { rangeLabel, rowTones, type StatTone } from "../lib/attackDisplay";
import { EditedTag } from "./EditedTag";
import { InlineMarkup } from "./InlineMarkup";

interface AttackRowProps {
  row: AttackRowData;
  /** The target's Toughness, for the "S4 vs T6" line. */
  targetToughness: number | null;
  /** The target's live model count, for the Blast note. */
  targetModels: number;
}

const MINUS = "−";

function formatAp(ap: number): string {
  if (ap === 0) return "0";
  return String(ap).replace("-", MINUS);
}

function formatMod(mod: number): string {
  return mod > 0 ? `+${mod}` : `${MINUS}${-mod}`;
}

function formatHit(hitTarget: number | null): string {
  return hitTarget === null ? "auto" : `${hitTarget}+`;
}

function formatSave(row: AttackRowData): string {
  if (row.saveTarget === null) return "none";
  return `${row.saveTarget}${row.isInvulnFallback ? "++" : "+"}`;
}

/** '12"' -> '6"': the distance within which a half-range bonus applies. */
function halfOf(range: string | null): string | null {
  const inches = range ? Number.parseFloat(range) : Number.NaN;
  return Number.isFinite(inches) ? `${inches / 2}"` : null;
}

type NoteKind = "positive" | "negative" | "neutral";

interface Note {
  text: string;
  kind: NoteKind;
}

const NOTE_STYLE: Record<NoteKind, { glyph: string; color: string }> = {
  neutral: { glyph: "·", color: "var(--ink-2)" },
  positive: { glyph: "+", color: "var(--positive)" },
  negative: { glyph: "!", color: "var(--negative)" },
};

const CELL_TONE: Record<"neutral" | "boost" | "warn", { bg: string; fg: string; caption: string }> = {
  neutral: { bg: "var(--paper-sunk)", fg: "var(--ink)", caption: "var(--ink-soft)" },
  boost: { bg: "var(--positive-fill)", fg: "var(--positive)", caption: "var(--positive)" },
  warn: { bg: "var(--negative-fill)", fg: "var(--negative)", caption: "var(--negative)" },
};

function ResultCell({ label, value, tone }: { label: string; value: string; tone: StatTone }) {
  const style = CELL_TONE[tone ?? "neutral"];
  return (
    <div
      className="h-[52px] min-w-0 flex flex-col items-center justify-center rounded-[var(--r-chip)]"
      style={{ background: style.bg }}
    >
      <span className="caption caption-sm leading-none" style={{ color: style.caption }}>
        {label}
      </span>
      <span
        className="mono font-bold text-[21px] leading-none tracking-[-0.03em] mt-[5px] max-w-full truncate px-[2px]"
        style={{ color: style.fg }}
      >
        {value}
      </span>
    </div>
  );
}

export function AttackRow({ row, targetToughness, targetModels }: AttackRowProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const t = useTranslate();
  const showAttacksDice = /[Dd]/.test(row.attacksRaw);
  const tones = rowTones(row);
  const range = rangeLabel(row);
  const atkValue = showAttacksDice
    ? row.count > 1
      ? `${row.count}×${row.attacksRaw}`
      : row.attacksRaw
    : String(row.totalAttacks);

  function expandedText(label: string): string | null {
    return (
      matchRule(label, row.rules)?.text ??
      row.leaderMods.find((m) => m.name === label)?.text ??
      row.autoHitPenaltySources.find((m) => m.name === label)?.text ??
      null
    );
  }

  const baseSave = row.armorTarget !== null ? row.armorTarget + row.ap : null;
  const matchup = [
    targetToughness != null ? `S${row.strength} vs T${targetToughness}` : `S${row.strength}`,
    baseSave !== null ? `Save ${baseSave}+ / AP${formatAp(row.ap)}` : `AP${formatAp(row.ap)}`,
    row.isInvulnFallback && row.saveTarget !== null ? `${row.saveTarget}++ invuln used` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const halfRangeHint =
    row.halfRangeBonus && !row.halfRangeApplied
      ? `${row.halfRangeBonus.kind === "melta" ? "Melta" : "Rapid Fire"} ${row.halfRangeBonus.value}: turn on Half range if within ${halfOf(row.range) ?? "half range"}`
      : null;

  const notes: Note[] = [
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
        text: `${row.halfRangeBonus.kind === "melta" ? "Melta" : "Rapid Fire"} ${row.halfRangeBonus.value} applied (half range)`,
        kind: "positive",
      },
    row.blastBonus > 0 && {
      text: `Blast +${row.blastBonus} attack${row.blastBonus === 1 ? "" : "s"} (${targetModels} model${targetModels === 1 ? "" : "s"})`,
      kind: "positive",
    },
    row.heavyApplied && { text: "Heavy +1 to hit (stationary)", kind: "positive" },
    halfRangeHint && { text: halfRangeHint, kind: "neutral" },
    row.twinLinked && { text: "Twin-linked: re-roll wound rolls", kind: "positive" },
    row.hazardous && {
      text: "Hazardous: after attacking, roll a D6 per model that used it; each 1 destroys a model (3 mortal wounds to a Character, Monster or Vehicle)",
      kind: "negative",
    },
    { text: matchup, kind: "neutral" },
  ].filter((n): n is Note => Boolean(n));

  const sourcePills: Array<{ ref: RuleRef; tone: "positive" | "negative" }> = [
    ...row.leaderMods.map((ref) => ({ ref, tone: "positive" as const })),
    ...row.autoHitPenaltySources.map((ref) => ({ ref, tone: "negative" as const })),
  ];
  const openText = openLabel ? expandedText(openLabel) : null;

  function toggle(label: string) {
    setOpenLabel((v) => (v === label ? null : label));
  }

  return (
    <div>
      <div className="mb-[8px] flex items-baseline gap-[6px] flex-wrap">
        <span className="mono text-[14px]" style={{ color: "var(--ink-soft)" }}>
          {row.count}×
        </span>
        <span className="text-[17px] font-semibold leading-[1.2]">{row.name}</span>
        {row.edited && <EditedTag className="self-center" />}
        {range && (
          <span className="mono text-[14px]" style={{ color: "var(--ink-soft)" }}>
            ({range})
          </span>
        )}
      </div>
      <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-[3px]">
        <ResultCell label="Atk" value={atkValue} tone={tones.attacks} />
        <ResultCell label="Hit" value={formatHit(row.hitTarget)} tone={tones.hit} />
        <ResultCell label="Wound" value={`${row.woundTarget}+`} tone={tones.wound} />
        <ResultCell label="Save" value={formatSave(row)} tone={tones.save} />
        <ResultCell label="D" value={row.damage.raw} tone={tones.damage} />
      </div>
      <ul className="m-0 mt-[8px] p-0 list-none flex flex-col gap-[3px]">
        {notes.map((note, i) => {
          const style = NOTE_STYLE[note.kind];
          return (
            <li
              key={i}
              className="grid grid-cols-[12px_1fr] gap-[6px] text-[14px] font-medium leading-[1.35]"
              style={{ color: style.color }}
            >
              <span className="mono text-center" aria-hidden="true">
                {style.glyph}
              </span>
              <span>{note.text}</span>
            </li>
          );
        })}
      </ul>
      {(row.keywords.length > 0 || sourcePills.length > 0) && (
        <div className="mt-[8px] flex flex-wrap gap-[6px]">
          {row.keywords.map((kw) => {
            const rule = matchRule(kw, row.rules);
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
          {sourcePills.map(({ ref, tone }) => (
            <button
              key={ref.name}
              type="button"
              aria-expanded={openLabel === ref.name}
              onClick={() => toggle(ref.name)}
              className="hit-44 min-h-[32px] px-[10px] flex items-center rounded-[15px] text-[13px] font-semibold"
              style={{
                background: tone === "positive" ? "var(--positive-fill)" : "var(--negative-fill)",
                color: tone === "positive" ? "var(--positive)" : "var(--negative)",
              }}
            >
              {tone === "positive" ? "▲" : "▼"} {ref.name}
            </button>
          ))}
        </div>
      )}
      {openLabel && openText && (
        <div
          className="mt-[8px] rounded-[var(--r-control)] px-[12px] py-[10px]"
          style={{ background: "var(--paper-sunk)", border: "1px solid var(--rule)" }}
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
