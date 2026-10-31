import { useState, type ReactNode } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { ArmyEntry } from "../lib/armies";
import {
  HONOURS,
  SCARS,
  SCARS_TO_WRITE_OFF,
  addHonour,
  addScar,
  addUnit,
  availableHonours,
  availableScars,
  missionEnemy,
  forcePoints,
  freeRosterUnits,
  hasCharacter,
  isWrittenOff,
  nextMission,
  rankFor,
  rankHonours,
  removeHonour,
  removeScar,
  removeUnit,
  resolveRosterUnits,
  setXp,
  toggleEnemyUnit,
  unitPoints,
  unitsOf,
  updateMission,
  updateUnit,
  weaponProfiles,
  xpToNextRank,
  type CrusadeMission,
  type CrusadePlayer,
  type CrusadeState,
  type CrusadeUnit,
  type HonourId,
  type MissionResult,
  type ScarId,
} from "../lib/crusade";
import { BOOK_ENEMIES } from "../data/crusade-seed";
import { CRUSADE_ALLIES_ID, crusadeEnemyId, missionEnemyPoints } from "../lib/crusadeBattle";
import { Chevron } from "./Collapsible";
import { Stepper } from "./Stepper";

interface CrusadeScreenProps {
  crusade: CrusadeState | null;
  /** The 10th edition armies, whose rosters the campaign units come from. */
  armies: ArmyEntry[];
  onChange: (next: CrusadeState) => void;
  /** Start the campaign from its state after mission 2. */
  onStart: () => void;
  /** Open the calculator with the campaign units on one side and that
   * mission's enemy on the other. */
  onStartBattle: (missionNumber: number) => void;
  /** Campaign battle sides that have units (see crusadeBattle.ts). */
  battleArmyIds: string[];
}

const inputClass =
  "min-h-[44px] w-full px-[10px] rounded-[var(--r-control)] text-[16px] font-medium";
const inputStyle = {
  background: "var(--paper-sunk)",
  border: "1px solid var(--rule)",
  color: "var(--ink)",
};
const buttonClass =
  "min-h-[44px] px-[12px] rounded-[var(--r-control)] text-[15px] font-semibold whitespace-nowrap";
const buttonStyle = { border: "1px solid var(--rule)", color: "var(--ink)" };

const FACTION_NAMES_UK: Record<string, string> = {
  "Grey Knights": "Сірі Лицарі",
  Ultramarines: "Ультрамарини",
  "Adeptus Custodes": "Адептус Кустодес",
  "Chaos Space Marines": "Космодесант Хаосу",
  Orks: "Орки",
};

/** "Imperium - Grey Knights" -> "Сірі Лицарі" (or the English name when
 * there is no Ukrainian one). */
function shortName(catalogue: string): string {
  const parts = catalogue.split(" - ");
  const name = parts[parts.length - 1];
  return FACTION_NAMES_UK[name] ?? name;
}

export function CrusadeScreen({
  crusade,
  armies,
  onChange,
  onStart,
  onStartBattle,
  battleArmyIds,
}: CrusadeScreenProps) {
  if (!crusade) {
    return (
      <div className="p-[16px] max-w-[920px] w-full mx-auto">
        <div
          className="p-[20px] rounded-[var(--r-control)] flex flex-col gap-[12px]"
          style={{ background: "var(--panel)", border: "1px dashed var(--rule)" }}
        >
          <div className="display font-bold text-[20px]">Кампанія ще не почата</div>
          <p className="prose m-0">
            Кампанія «Попіл Армагеддону» після місії 2: Андрій (Сірі Лицарі) і Сашко
            (Ультрамарини), 9 загонів із досвідом і нагородами, журнал двох перемог.
          </p>
          <button
            type="button"
            onClick={onStart}
            className="chamfer display h-[52px] w-full text-[18px] font-extrabold tracking-[0.08em]"
            style={{ background: "var(--selected-bg)", color: "var(--selected-fg)" }}
          >
            ПОЧАТИ КАМПАНІЮ
          </button>
        </div>
      </div>
    );
  }

  const next = nextMission(crusade);
  const canFight = (missionNumber: number) =>
    battleArmyIds.includes(CRUSADE_ALLIES_ID) &&
    battleArmyIds.includes(crusadeEnemyId(missionNumber));
  const canFightNext = next !== null && canFight(next.number);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="max-w-[920px] w-full mx-auto pb-[calc(24px+env(safe-area-inset-bottom))]">
        <div className="px-[16px] pt-[14px] pb-[10px]">
          <div className="caption">Кооперативна Crusade-кампанія</div>
          <h1 className="display m-0 mt-[2px] text-[24px] font-extrabold leading-[1.1]">
            {crusade.name}
          </h1>
          <p className="m-0 mt-[6px] text-[15px] font-medium" style={{ color: "var(--ink-2)" }}>
            {next
              ? `Наступна: місія ${next.number} «${next.name}», ліміт ${next.pointsLimit} очок на кожного`
              : "Усі місії зіграно"}
          </p>
          {next && (
            <button
              type="button"
              disabled={!canFightNext}
              onClick={() => onStartBattle(next.number)}
              className="chamfer display mt-[12px] h-[52px] w-full text-[18px] font-extrabold tracking-[0.12em]"
              style={{
                background: canFightNext ? "var(--selected-bg)" : "var(--paper-sunk)",
                color: canFightNext ? "var(--selected-fg)" : "var(--ink-off)",
              }}
            >
              ДО БОЮ · МІСІЯ {next.number}
            </button>
          )}
          {next && !canFightNext && (
            <p className="hint m-0 mt-[6px]">
              Для бою потрібні загони кампанії й ворог місії: оберіть його в журналі місій.
            </p>
          )}
        </div>
        {crusade.players.map((player) => (
          <PlayerSection
            key={player.id}
            player={player}
            army={armies.find((a) => a.id === player.armyId) ?? null}
            crusade={crusade}
            limit={next?.pointsLimit ?? null}
            onChange={onChange}
          />
        ))}
        <MissionLog
          crusade={crusade}
          armies={armies}
          canFight={canFight}
          onStartBattle={onStartBattle}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function SectionHeader({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div
      className="px-[16px] min-h-[48px] flex items-center gap-[10px]"
      style={{ borderTop: "1px solid var(--rule)", background: "var(--panel)" }}
    >
      <span className="section-label min-w-0 flex-1">{children}</span>
      {aside}
    </div>
  );
}

function PlayerSection({
  player,
  army,
  crusade,
  limit,
  onChange,
}: {
  player: CrusadePlayer;
  army: ArmyEntry | null;
  crusade: CrusadeState;
  limit: number | null;
  onChange: (next: CrusadeState) => void;
}) {
  const rosterUnits = army?.parsed.units ?? [];
  const points = forcePoints(crusade, player.id, rosterUnits);
  const over = limit !== null && points > limit;

  return (
    <section className="mt-[12px]">
      <SectionHeader
        aside={
          <span
            className="mono text-[15px] font-bold"
            style={{ color: over ? "var(--negative)" : "var(--ink)" }}
            title="Очки загонів, які йдуть на наступну місію"
          >
            {points}
            {limit !== null && <span style={{ color: "var(--ink-soft)" }}> / {limit}</span>}
          </span>
        }
      >
        {player.name} — {army ? shortName(army.parsed.catalogue) : `ростер «${player.armyId}» не знайдено`}
      </SectionHeader>
      {over && (
        <p className="m-0 px-[16px] py-[6px] text-[14px] font-medium" style={{ color: "var(--negative)" }}>
          Склад перевищує ліміт на {points - (limit ?? 0)} очок: позначте, хто пропускає місію.
        </p>
      )}
      <ul className="m-0 p-0 list-none">
        {unitsOf(crusade, player.id).map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            rosterUnits={rosterUnits}
            onChange={(change) => onChange(updateUnit(crusade, unit.id, change))}
            onRemove={() => onChange(removeUnit(crusade, unit.id))}
          />
        ))}
      </ul>
      {army && (
        <AddUnit
          freeUnits={freeRosterUnits(crusade, rosterUnits)}
          onAdd={(name, ids) => onChange(addUnit(crusade, player.id, name, ids))}
        />
      )}
    </section>
  );
}

function Tag({ children, tone }: { children: ReactNode; tone?: "positive" | "negative" }) {
  return (
    <span
      className="mono inline-flex items-center px-[6px] h-[22px] rounded-[var(--r-tag)] text-[12px] font-bold whitespace-nowrap"
      style={{
        background: tone ? `var(--${tone}-fill)` : "var(--paper-sunk)",
        color: tone ? `var(--${tone})` : "var(--ink-2)",
      }}
    >
      {children}
    </span>
  );
}

function UnitCard({
  unit,
  rosterUnits,
  onChange,
  onRemove,
}: {
  unit: CrusadeUnit;
  rosterUnits: ParsedUnit[];
  onChange: (change: (unit: CrusadeUnit) => CrusadeUnit) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rank = rankFor(unit.xp);
  const writtenOff = isWrittenOff(unit);
  const { found, missing } = resolveRosterUnits(unit, rosterUnits);
  const points = unitPoints(unit, rosterUnits);

  return (
    <li style={{ borderTop: "1px solid var(--rule-soft)", opacity: writtenOff ? 0.7 : undefined }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full min-h-[64px] px-[16px] py-[8px] flex items-center gap-[10px] text-left"
      >
        <Chevron open={open} />
        <span className="min-w-0 flex-1">
          <span className="display block font-bold text-[18px] leading-[1.15]">{unit.name || "Без назви"}</span>
          <span className="mt-[4px] flex flex-wrap gap-[6px]">
            <Tag>{rank.name} · {unit.xp} XP</Tag>
            {unit.honours.length > 0 && <Tag tone="positive">Нагороди {unit.honours.length}</Tag>}
            {unit.scars.length > 0 && (
              <Tag tone="negative">
                Шрами {unit.scars.length}/{SCARS_TO_WRITE_OFF}
              </Tag>
            )}
            {writtenOff && <Tag tone="negative">Списано</Tag>}
            {unit.skipsMission && !writtenOff && <Tag tone="negative">Пропускає місію</Tag>}
            {missing.length > 0 && <Tag tone="negative">Немає в ростері</Tag>}
          </span>
        </span>
        <span className="mono text-[14px] font-semibold shrink-0" style={{ color: "var(--ink-soft)" }}>
          {points} оч.
        </span>
      </button>
      {open && (
        <div className="px-[16px] pb-[16px] flex flex-col gap-[16px]">
          <Field label="Назва або мітка">
            <input
              className={inputClass}
              style={inputStyle}
              value={unit.name}
              placeholder="наприклад, золоті наплічники"
              onChange={(e) => onChange((u) => ({ ...u, name: e.target.value }))}
            />
          </Field>
          <XpField unit={unit} hasCharacter={hasCharacter(unit, rosterUnits)} onChange={onChange} />
          <HonoursField unit={unit} rosterUnits={rosterUnits} onChange={onChange} />
          <ScarsField unit={unit} onChange={onChange} />
          <Toggle
            label="Пропускає наступну місію"
            hint="Не рахується в очки складу. Пропущена місія знімає один шрам."
            checked={unit.skipsMission}
            onToggle={() => onChange((u) => ({ ...u, skipsMission: !u.skipsMission }))}
          />
          <Field label="Склад з ростера">
            <ul className="m-0 p-0 list-none flex flex-col gap-[4px] text-[15px]">
              {found.map((r) => (
                <li key={r.id} className="flex justify-between gap-[10px]">
                  <span>{r.name}</span>
                  <span className="mono" style={{ color: "var(--ink-soft)" }}>
                    {r.totalPoints}
                  </span>
                </li>
              ))}
              {missing.map((id) => (
                <li key={id} style={{ color: "var(--negative)" }}>
                  Загону {id} більше немає в ростері: його перезібрали в New Recruit.
                </li>
              ))}
            </ul>
          </Field>
          <RemoveButton onRemove={onRemove} />
        </div>
      )}
    </li>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="caption">{label}</span>
      {children}
    </div>
  );
}

function XpField({
  unit,
  hasCharacter: character,
  onChange,
}: {
  unit: CrusadeUnit;
  hasCharacter: boolean;
  onChange: (change: (unit: CrusadeUnit) => CrusadeUnit) => void;
}) {
  const rank = rankFor(unit.xp);
  const toNext = xpToNextRank(unit.xp);
  const earned = rankHonours(unit.xp, character);
  return (
    <Field label="Досвід">
      <div className="flex flex-wrap items-center gap-[12px]">
        <Stepper
          value={unit.xp}
          onDecrement={() => onChange((u) => setXp(u, u.xp - 1))}
          onIncrement={() => onChange((u) => setXp(u, u.xp + 1))}
          decrementDisabled={unit.xp <= 0}
          incrementDisabled={false}
          decrementLabel="Менше досвіду"
          incrementLabel="Більше досвіду"
          valueWidth={64}
        />
        <span className="text-[15px] font-medium" style={{ color: "var(--ink-2)" }}>
          <span className="font-bold" style={{ color: "var(--ink)" }}>
            {rank.name}
          </span>
          {toNext !== null ? ` · до наступного рангу ${toNext}` : ""}
          {` · нагород за ранги: ${earned}`}
        </span>
      </div>
      {rank.minXp >= 10 && !character && (
        <p className="hint m-0">
          Нагорода за ранг «Герой» — лише для персонажів та елітних загонів.
        </p>
      )}
    </Field>
  );
}

function HonoursField({
  unit,
  rosterUnits,
  onChange,
}: {
  unit: CrusadeUnit;
  rosterUnits: ParsedUnit[];
  onChange: (change: (unit: CrusadeUnit) => CrusadeUnit) => void;
}) {
  const choices = availableHonours(unit);
  return (
    <Field label="Бойові нагороди">
      <ul className="m-0 p-0 list-none flex flex-col gap-[8px]">
        {unit.honours.map((h) => {
          const info = HONOURS[h.id];
          const profiles = info.weaponType ? weaponProfiles(unit, rosterUnits, info.weaponType) : [];
          return (
            <li
              key={h.id}
              className="p-[10px] rounded-[var(--r-control)] flex flex-col gap-[6px]"
              style={{ background: "var(--paper-sunk)" }}
            >
              <div className="flex items-start gap-[10px]">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[16px]" style={{ color: "var(--positive)" }}>
                    {info.name}
                  </span>
                  <span className="block text-[14px]" style={{ color: "var(--ink-2)" }}>
                    {info.effect}
                  </span>
                </span>
                <RemoveChip label={`Прибрати нагороду ${info.name}`} onClick={() => onChange((u) => removeHonour(u, h.id))} />
              </div>
              {info.weaponType && (
                <select
                  className={inputClass}
                  style={inputStyle}
                  aria-label={`Профіль зброї для ${info.name}`}
                  value={h.weapon ?? ""}
                  onChange={(e) =>
                    onChange((u) => ({
                      ...u,
                      honours: u.honours.map((x) =>
                        x.id === h.id ? { ...x, weapon: e.target.value || null } : x,
                      ),
                    }))
                  }
                >
                  <option value="">Профіль зброї не вибрано</option>
                  {[...new Set([...profiles, ...(h.weapon ? [h.weapon] : [])])].map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>
      {choices.length > 0 && (
        <AddSelect
          label="Додати нагороду"
          options={choices.map((id) => ({ value: id, label: HONOURS[id].name }))}
          onPick={(id) => onChange((u) => addHonour(u, id as HonourId, null))}
        />
      )}
    </Field>
  );
}

function ScarsField({
  unit,
  onChange,
}: {
  unit: CrusadeUnit;
  onChange: (change: (unit: CrusadeUnit) => CrusadeUnit) => void;
}) {
  const choices = availableScars(unit);
  return (
    <Field label={`Бойові шрами · ${SCARS_TO_WRITE_OFF} шрами — загін списано`}>
      {unit.scars.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-[8px]">
          {unit.scars.map((id) => (
            <li
              key={id}
              className="p-[10px] rounded-[var(--r-control)] flex items-start gap-[10px]"
              style={{ background: "var(--paper-sunk)" }}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-[16px]" style={{ color: "var(--negative)" }}>
                  {SCARS[id].name}
                </span>
                <span className="block text-[14px]" style={{ color: "var(--ink-2)" }}>
                  {SCARS[id].effect}
                </span>
              </span>
              <RemoveChip label={`Зняти шрам ${SCARS[id].name}`} onClick={() => onChange((u) => removeScar(u, id))} />
            </li>
          ))}
        </ul>
      )}
      {choices.length > 0 && !isWrittenOff(unit) && (
        <AddSelect
          label="Додати шрам"
          options={choices.map((id) => ({ value: id, label: SCARS[id].name }))}
          onPick={(id) => onChange((u) => addScar(u, id as ScarId))}
        />
      )}
    </Field>
  );
}

function RemoveChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-[36px] h-[36px] shrink-0 flex items-center justify-center rounded-[var(--r-control)] text-[16px]"
      style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
    >
      ✕
    </button>
  );
}

/** A select that acts as an "add" menu: picking an option adds it. */
function AddSelect({
  label,
  options,
  onPick,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  onPick: (value: string) => void;
}) {
  return (
    <select
      className={inputClass}
      style={inputStyle}
      aria-label={label}
      value=""
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value);
      }}
    >
      <option value="">+ {label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="min-h-[46px] px-[12px] py-[8px] flex items-center gap-[10px] rounded-[var(--r-control)] text-left"
      style={{
        border: `1px solid ${checked ? "var(--ink)" : "var(--rule)"}`,
        background: checked ? "var(--checked-wash)" : undefined,
      }}
    >
      <span
        aria-hidden="true"
        className="w-[18px] h-[18px] shrink-0 flex items-center justify-center rounded-[var(--r-tag)] text-[13px] font-bold"
        style={{
          border: `1.5px solid ${checked ? "var(--ink)" : "var(--ink-2)"}`,
          background: checked ? "var(--ink)" : undefined,
          color: "var(--paper)",
        }}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && (
          <span className="block text-[13px]" style={{ color: "var(--ink-soft)" }}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`${buttonClass} self-start`}
        style={{ ...buttonStyle, color: "var(--ink-2)" }}
      >
        Прибрати загін з кампанії
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      <span className="text-[15px] font-medium" style={{ color: "var(--negative)" }}>
        Досвід, нагороди й шрами загону буде втрачено.
      </span>
      <button
        type="button"
        onClick={onRemove}
        className={buttonClass}
        style={{ background: "var(--negative-fill)", border: "1px solid var(--negative)", color: "var(--ink)" }}
      >
        Прибрати
      </button>
      <button type="button" onClick={() => setConfirming(false)} className={buttonClass} style={buttonStyle}>
        Скасувати
      </button>
    </div>
  );
}

function AddUnit({
  freeUnits,
  onAdd,
}: {
  freeUnits: ParsedUnit[];
  onAdd: (name: string, rosterUnitIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");

  function reset() {
    setOpen(false);
    setPicked([]);
    setName("");
  }

  if (!open) {
    return (
      <div className="px-[16px] py-[10px]" style={{ borderTop: "1px solid var(--rule-soft)" }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={freeUnits.length === 0}
          className={buttonClass}
          style={{ ...buttonStyle, color: freeUnits.length ? "var(--ink)" : "var(--ink-off)" }}
        >
          + Додати загін з ростера
        </button>
      </div>
    );
  }

  const defaultName = freeUnits
    .filter((r) => picked.includes(r.id))
    .map((r) => r.name)
    .join(" + ");

  return (
    <div
      className="mx-[16px] my-[10px] p-[12px] rounded-[var(--r-control)] flex flex-col gap-[10px]"
      style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
    >
      <span className="caption">Загони з ростера (лідер і його загін — разом)</span>
      <ul className="m-0 p-0 list-none flex flex-col gap-[6px]">
        {freeUnits.map((r) => (
          <li key={r.id}>
            <Toggle
              label={`${r.name} · ${r.totalPoints} оч.`}
              checked={picked.includes(r.id)}
              onToggle={() =>
                setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))
              }
            />
          </li>
        ))}
      </ul>
      <Field label="Назва або мітка">
        <input
          className={inputClass}
          style={inputStyle}
          value={name}
          placeholder={defaultName || "наприклад, золоті наплічники"}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <div className="flex gap-[8px]">
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={() => {
            onAdd(name.trim() || defaultName, picked);
            reset();
          }}
          className={buttonClass}
          style={{
            background: picked.length ? "var(--selected-bg)" : "var(--paper-sunk)",
            color: picked.length ? "var(--selected-fg)" : "var(--ink-off)",
          }}
        >
          Додати
        </button>
        <button type="button" onClick={reset} className={buttonClass} style={buttonStyle}>
          Скасувати
        </button>
      </div>
    </div>
  );
}

/** A mission's enemy: what the book (or an edit) puts there, and a picker
 * over every non-player roster to change it. */
function MissionEnemy({
  crusade,
  mission,
  armies,
  onChange,
}: {
  crusade: CrusadeState;
  mission: CrusadeMission;
  armies: ArmyEntry[];
  onChange: (change: Partial<Omit<CrusadeMission, "number">>) => void;
}) {
  const [open, setOpen] = useState(false);
  const enemy = missionEnemy(crusade, mission, BOOK_ENEMIES);
  const fromBook = mission.enemy === undefined && enemy !== null;
  const hasBook = BOOK_ENEMIES[crusade.name]?.[mission.number] !== undefined;
  const playerArmies = new Set(crusade.players.map((p) => p.armyId));
  const rosters = armies.filter((a) => !playerArmies.has(a.id));
  const picked = new Set((enemy?.units ?? []).map((u) => `${u.armyId}/${u.unitId}`));
  const points = missionEnemyPoints(crusade, mission, armies, BOOK_ENEMIES);
  const factions = [
    ...new Set(
      (enemy?.units ?? [])
        .map((u) => armies.find((a) => a.id === u.armyId))
        .filter((a): a is ArmyEntry => !!a)
        .map((a) => shortName(a.parsed.catalogue)),
    ),
  ];

  function leadsLabel(army: ArmyEntry, unitId: string): string {
    const target = enemy?.leaders[unitId];
    if (!target) return "";
    return ` · веде ${army.parsed.units.find((t) => t.id === target)?.name ?? "загін"}`;
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="min-h-[44px] flex items-center gap-[10px] text-left text-[15px] font-semibold"
      >
        <Chevron open={open} />
        <span className="min-w-0 flex-1">
          {enemy && enemy.units.length > 0
            ? `Ворог: ${factions.join(" + ")} — загонів ${enemy.units.length}, ${points} оч.`
            : "Ворог не вибраний"}
          {fromBook && (
            <span className="ml-[8px]">
              <Tag>з книги кампанії</Tag>
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-[10px] pl-[22px]">
          {enemy?.detachment !== undefined && (
            <p className="hint m-0">
              {enemy.detachment
                ? `Детачмент: ${enemy.detachment}`
                : "Без детачмента: лише правило армії й базові стратагеми"}
            </p>
          )}
          {rosters.map((army) => (
            <div key={army.id} className="flex flex-col gap-[6px]">
              <span className="caption">
                {shortName(army.parsed.catalogue)} ({army.id})
              </span>
              <ul className="m-0 p-0 list-none flex flex-col gap-[6px]">
                {army.parsed.units.map((u) => (
                  <li key={u.id}>
                    <Toggle
                      label={`${u.name} · ${u.modelCount} мод. · ${u.totalPoints} оч.${leadsLabel(army, u.id)}`}
                      checked={picked.has(`${army.id}/${u.id}`)}
                      onToggle={() => onChange({ enemy: toggleEnemyUnit(enemy, army.id, u.id) })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {hasBook && mission.enemy !== undefined && (
            <button
              type="button"
              onClick={() => onChange({ enemy: undefined })}
              className={`${buttonClass} self-start`}
              style={buttonStyle}
            >
              Повернути склад із книги кампанії
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const RESULTS: Array<{ value: MissionResult | null; label: string }> = [
  { value: null, label: "Не зіграна" },
  { value: "win", label: "Перемога" },
  { value: "loss", label: "Поразка" },
];

function MissionLog({
  crusade,
  armies,
  canFight,
  onStartBattle,
  onChange,
}: {
  crusade: CrusadeState;
  armies: ArmyEntry[];
  canFight: (missionNumber: number) => boolean;
  onStartBattle: (missionNumber: number) => void;
  onChange: (next: CrusadeState) => void;
}) {
  const next = nextMission(crusade);
  return (
    <section className="mt-[12px]">
      <SectionHeader>Журнал місій</SectionHeader>
      <ol className="m-0 p-0 list-none">
        {crusade.missions.map((m) => (
          <MissionRow
            key={m.number}
            crusade={crusade}
            mission={m}
            armies={armies}
            isNext={next?.number === m.number}
            canFight={canFight(m.number)}
            onStartBattle={() => onStartBattle(m.number)}
            onChange={(change) => onChange(updateMission(crusade, m.number, change))}
          />
        ))}
      </ol>
    </section>
  );
}

function MissionRow({
  crusade,
  mission,
  armies,
  isNext,
  canFight,
  onStartBattle,
  onChange,
}: {
  crusade: CrusadeState;
  mission: CrusadeMission;
  armies: ArmyEntry[];
  isNext: boolean;
  canFight: boolean;
  onStartBattle: () => void;
  onChange: (change: Partial<Omit<CrusadeMission, "number">>) => void;
}) {
  return (
    <li
      className="px-[16px] py-[12px] flex flex-col gap-[10px]"
      style={{
        borderTop: "1px solid var(--rule-soft)",
        boxShadow: isNext ? "inset 4px 0 0 var(--ink)" : undefined,
      }}
    >
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="display font-extrabold text-[20px] w-[28px]">{mission.number}</span>
        <input
          className={`${inputClass} flex-1 min-w-[160px] w-auto`}
          style={inputStyle}
          aria-label={`Назва місії ${mission.number}`}
          value={mission.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <label className="flex items-center gap-[6px] text-[14px] font-medium" style={{ color: "var(--ink-2)" }}>
          Ліміт
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={50}
            className={`${inputClass} w-[96px] mono`}
            style={inputStyle}
            aria-label={`Ліміт очок місії ${mission.number}`}
            value={mission.pointsLimit}
            onChange={(e) => onChange({ pointsLimit: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          />
        </label>
        {isNext && <Tag>Наступна</Tag>}
      </div>
      <div className="flex flex-wrap items-start gap-[10px]">
        <div className="min-w-0 flex-1">
          <MissionEnemy crusade={crusade} mission={mission} armies={armies} onChange={onChange} />
        </div>
        <button
          type="button"
          disabled={!canFight}
          onClick={onStartBattle}
          className={buttonClass}
          style={{
            background: canFight ? "var(--selected-bg)" : "var(--paper-sunk)",
            color: canFight ? "var(--selected-fg)" : "var(--ink-off)",
          }}
        >
          До бою ›
        </button>
      </div>
      <div
        role="radiogroup"
        aria-label={`Результат місії ${mission.number}`}
        className="flex rounded-[var(--r-control)] overflow-hidden self-start"
        style={{ outline: "1px solid var(--rule)", outlineOffset: -1 }}
      >
        {RESULTS.map((r) => {
          const active = mission.result === r.value;
          const tone = r.value === "win" ? "positive" : r.value === "loss" ? "negative" : null;
          return (
            <button
              key={r.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ result: r.value })}
              className="min-h-[44px] px-[14px] text-[15px] font-semibold"
              style={{
                background: active ? (tone ? `var(--${tone}-fill)` : "var(--checked-wash)") : undefined,
                color: active ? (tone ? `var(--${tone})` : "var(--ink)") : "var(--ink-2)",
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <textarea
        className="w-full min-h-[64px] p-[10px] rounded-[var(--r-control)] text-[15px]"
        style={inputStyle}
        aria-label={`Нотатки до місії ${mission.number}`}
        placeholder="Нотатки: що сталося, сюжетні наслідки"
        value={mission.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    </li>
  );
}
