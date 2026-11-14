import type { ReactNode } from "react";
import type { DirectionModifiers } from "../lib/combat";
import { activeModifierChips } from "../lib/modifierPanel";
import { useUi } from "../lib/uiStrings";
import { Stepper } from "./Stepper";
import { SideMark } from "./SideMark";

export type Direction = "ab" | "ba";

export interface DirectionSwitch {
  value: Direction;
  onChange: (d: Direction) => void;
  /** Attacker and target names for each direction. */
  names: { a: string; b: string };
  /** The other direction's modifiers, for the collapsed summary. */
  otherModifiers: DirectionModifiers;
}

interface ModifierControlsProps {
  modifiers: DirectionModifiers;
  onChange: (next: DirectionModifiers) => void;
  /** Deselect both units so another pair can be compared. The calculator
   * itself stays open; the modifiers are not saved and reset with it. */
  onClose: () => void;
  /** Offer the Engaged toggle (Big Guns Never Tire): while shooting, when a
   * Monster or Vehicle is in the matchup. */
  showEngaged?: boolean;
  /** Offer the Waaagh! toggle: a unit with the Waaagh! ability is in the
   * matchup. */
  showWaaagh?: boolean;
  /** Offer the Cover toggle: ranged attacks are being compared. */
  showCover?: boolean;
  /** Offer the Charged toggle: a unit in the matchup has a Lance weapon. */
  showCharged?: boolean;
  /** Units in the matchup that have a Damaged profile, one toggle each. */
  damagedUnits?: Array<{ id: string; name: string }>;
  /** Which attack direction the steppers and toggles edit. Without it the
   * panel edits a single set of modifiers. */
  direction?: DirectionSwitch;
  /** Fold the panel to one line listing the active modifiers. Without
   * `onToggleCollapsed` the panel cannot be folded. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const MINUS = "−";

function formatMod(mod: number): string {
  if (mod === 0) return "±0";
  return mod > 0 ? `+${mod}` : `${MINUS}${-mod}`;
}

function CheckToggle({
  label,
  title,
  checked,
  onToggle,
}: {
  label: ReactNode;
  /** Full name, when the label is a short form. */
  title?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      title={title}
      aria-label={title}
      onClick={onToggle}
      className="h-[46px] min-w-0 px-[12px] flex items-center gap-[10px] rounded-[var(--r-control)] whitespace-nowrap text-[15px] font-semibold"
      style={{
        flex: "1 1 130px",
        border: `1px solid ${checked ? "var(--ink)" : "var(--rule)"}`,
        background: checked ? "var(--checked-wash)" : undefined,
        color: checked ? "var(--ink)" : "var(--ink-2)",
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
      <span className="min-w-0 flex items-center gap-[7px]">{label}</span>
    </button>
  );
}

export function ModifierControls({
  modifiers,
  onChange,
  onClose,
  showEngaged = false,
  showWaaagh = false,
  showCover = false,
  showCharged = false,
  damagedUnits = [],
  direction,
  collapsed = false,
  onToggleCollapsed,
}: ModifierControlsProps) {
  const ui = useUi();
  const stepperStyle = { flex: "1 1 130px" };

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close both units"
      className="w-[46px] h-[46px] shrink-0 flex items-center justify-center rounded-[var(--r-control)] text-[20px]"
      style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
    >
      ✕
    </button>
  );

  const chipLabels = {
    halfRange: ui("calc.halfRange"),
    stationary: ui("calc.stationary"),
    engaged: ui("calc.engagedShort"),
    waaagh: ui("calc.waaagh"),
    cover: ui("calc.cover"),
    charged: ui("calc.charged"),
    damaged: ui("calc.damaged"),
  };

  const directionSwitch = direction && (
    <div role="tablist" aria-label={ui("calc.direction")} className="w-full flex gap-[6px]">
      {(["ab", "ba"] as const).map((d) => {
        const from = d === "ab" ? "a" : "b";
        const to = d === "ab" ? "b" : "a";
        const selected = direction.value === d;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => direction.onChange(d)}
            className="flex-1 min-w-0 min-h-[40px] px-[10px] flex items-center gap-[6px] rounded-[var(--r-control)] text-[14px] font-semibold"
            style={{
              border: `1px solid ${selected ? "var(--ink)" : "var(--rule)"}`,
              background: selected ? "var(--checked-wash)" : undefined,
              color: selected ? "var(--ink)" : "var(--ink-2)",
            }}
          >
            <SideMark side={from} size={10} />
            <span className="min-w-0 truncate">{direction.names[from]}</span>
            <span aria-hidden="true" className="mono shrink-0">→</span>
            <SideMark side={to} size={10} />
            <span className="min-w-0 truncate">{direction.names[to]}</span>
          </button>
        );
      })}
    </div>
  );

  if (collapsed && onToggleCollapsed) {
    let chips = activeModifierChips(modifiers, chipLabels);
    if (direction) {
      const mark = (d: Direction) => (d === "ab" ? "■→◆" : "◆→■");
      const own = chips;
      const other = activeModifierChips(direction.otherModifiers, chipLabels);
      const byDir: Record<Direction, string[]> = {
        ab: direction.value === "ab" ? own : other,
        ba: direction.value === "ab" ? other : own,
      };
      chips = (["ab", "ba"] as const)
        .filter((d) => byDir[d].length > 0)
        .map((d) => `${mark(d)} ${byDir[d].join(", ")}`);
    }
    return (
      <div className="px-[12px] py-[6px] flex items-center gap-[8px]">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={false}
          aria-label={ui("calc.showModifiers")}
          className="flex-1 min-w-0 min-h-[46px] px-[12px] flex items-center gap-[10px] text-left rounded-[var(--r-control)]"
          style={{ border: "1px solid var(--rule)" }}
        >
          <span className="caption shrink-0">{ui("calc.modifiers")}</span>
          <span
            className="min-w-0 truncate text-[15px] font-semibold"
            style={{ color: chips.length ? "var(--ink)" : "var(--ink-soft)" }}
          >
            {chips.length ? chips.join(" · ") : ui("calc.noModifiers")}
          </span>
          <span aria-hidden="true" className="ml-auto text-[14px]" style={{ color: "var(--ink-soft)" }}>
            ▾
          </span>
        </button>
        {closeButton}
      </div>
    );
  }

  return (
    <div className="px-[12px] py-[10px] flex flex-wrap gap-[8px]">
      {directionSwitch}
      <Stepper
        caption="Hit"
        value={formatMod(modifiers.hitMod)}
        style={stepperStyle}
        decrementLabel="Hit modifier down"
        incrementLabel="Hit modifier up"
        decrementDisabled={modifiers.hitMod <= -1}
        incrementDisabled={modifiers.hitMod >= 1}
        onDecrement={() =>
          onChange({ ...modifiers, hitMod: (modifiers.hitMod - 1) as -1 | 0 | 1 })
        }
        onIncrement={() =>
          onChange({ ...modifiers, hitMod: (modifiers.hitMod + 1) as -1 | 0 | 1 })
        }
      />
      <Stepper
        caption="Wound"
        value={formatMod(modifiers.woundMod)}
        style={stepperStyle}
        decrementLabel="Wound modifier down"
        incrementLabel="Wound modifier up"
        decrementDisabled={modifiers.woundMod <= -1}
        incrementDisabled={modifiers.woundMod >= 1}
        onDecrement={() =>
          onChange({ ...modifiers, woundMod: (modifiers.woundMod - 1) as -1 | 0 | 1 })
        }
        onIncrement={() =>
          onChange({ ...modifiers, woundMod: (modifiers.woundMod + 1) as -1 | 0 | 1 })
        }
      />
      <Stepper
        caption="AP"
        value={formatMod(modifiers.apMod)}
        style={stepperStyle}
        decrementLabel="AP modifier down"
        incrementLabel="AP modifier up"
        decrementDisabled={modifiers.apMod <= -1}
        incrementDisabled={modifiers.apMod >= 1}
        onDecrement={() =>
          onChange({ ...modifiers, apMod: (modifiers.apMod - 1) as -1 | 0 | 1 })
        }
        onIncrement={() =>
          onChange({ ...modifiers, apMod: (modifiers.apMod + 1) as -1 | 0 | 1 })
        }
      />
      <Stepper
        caption="Damage"
        value={formatMod(modifiers.damageMod)}
        style={stepperStyle}
        decrementLabel="Damage modifier down"
        incrementLabel="Damage modifier up"
        decrementDisabled={modifiers.damageMod <= -1}
        incrementDisabled={modifiers.damageMod >= 1}
        onDecrement={() =>
          onChange({ ...modifiers, damageMod: (modifiers.damageMod - 1) as -1 | 0 | 1 })
        }
        onIncrement={() =>
          onChange({ ...modifiers, damageMod: (modifiers.damageMod + 1) as -1 | 0 | 1 })
        }
      />
      <Stepper
        caption="Invuln"
        value={modifiers.invulnOverride === null ? "None" : `${modifiers.invulnOverride}++`}
        style={stepperStyle}
        decrementLabel="Invulnerable save override down"
        incrementLabel="Invulnerable save override up"
        decrementDisabled={modifiers.invulnOverride === null}
        incrementDisabled={modifiers.invulnOverride === 6}
        onDecrement={() =>
          onChange({
            ...modifiers,
            invulnOverride:
              modifiers.invulnOverride === null || modifiers.invulnOverride <= 2
                ? null
                : modifiers.invulnOverride - 1,
          })
        }
        onIncrement={() =>
          onChange({
            ...modifiers,
            invulnOverride:
              modifiers.invulnOverride === null
                ? 2
                : Math.min(6, modifiers.invulnOverride + 1),
          })
        }
      />
      <CheckToggle
        label={ui("calc.halfRange")}
        checked={modifiers.halfRange}
        onToggle={() => onChange({ ...modifiers, halfRange: !modifiers.halfRange })}
      />
      <CheckToggle
        label={ui("calc.stationary")}
        checked={modifiers.stationary}
        onToggle={() => onChange({ ...modifiers, stationary: !modifiers.stationary })}
      />
      {showEngaged && (
        <CheckToggle
          title={ui("calc.engaged")}
          label={ui("calc.engagedShort")}
          checked={modifiers.engaged}
          onToggle={() => onChange({ ...modifiers, engaged: !modifiers.engaged })}
        />
      )}
      {showWaaagh && (
        <CheckToggle
          label={ui("calc.waaagh")}
          checked={modifiers.waaagh}
          onToggle={() => onChange({ ...modifiers, waaagh: !modifiers.waaagh })}
        />
      )}
      {showCover && (
        <CheckToggle
          title={ui("calc.coverTitle")}
          label={ui("calc.cover")}
          checked={modifiers.cover}
          onToggle={() => onChange({ ...modifiers, cover: !modifiers.cover })}
        />
      )}
      {showCharged && (
        <CheckToggle
          label={ui("calc.charged")}
          checked={modifiers.charged}
          onToggle={() => onChange({ ...modifiers, charged: !modifiers.charged })}
        />
      )}
      {damagedUnits.map((u) => {
        const on = modifiers.damaged.includes(u.id);
        return (
          <CheckToggle
            key={u.id}
            title={`${ui("calc.damaged")}: ${u.name}`}
            label={<span className="truncate">{`${ui("calc.damaged")}: ${u.name}`}</span>}
            checked={on}
            onToggle={() =>
              onChange({
                ...modifiers,
                damaged: on
                  ? modifiers.damaged.filter((id) => id !== u.id)
                  : [...modifiers.damaged, u.id],
              })
            }
          />
        );
      })}
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={true}
          aria-label={ui("calc.hideModifiers")}
          className="w-[46px] h-[46px] shrink-0 flex items-center justify-center rounded-[var(--r-control)] text-[14px]"
          style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
        >
          ▴
        </button>
      )}
      {closeButton}
    </div>
  );
}
