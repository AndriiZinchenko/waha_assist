import type { DirectionModifiers } from "../lib/combat";
import { useUi } from "../lib/uiStrings";
import { Stepper } from "./Stepper";

interface ModifierControlsProps {
  modifiers: DirectionModifiers;
  onChange: (next: DirectionModifiers) => void;
  /** Deselect both units so another pair can be compared. The calculator
   * itself stays open; the modifiers are not saved and reset with it. */
  onClose: () => void;
}

const MINUS = "−";

function formatMod(mod: number): string {
  if (mod === 0) return "±0";
  return mod > 0 ? `+${mod}` : `${MINUS}${-mod}`;
}

function CheckToggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="h-[46px] px-[12px] flex items-center gap-[10px] rounded-[var(--r-control)] whitespace-nowrap text-[15px] font-semibold"
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
      {label}
    </button>
  );
}

export function ModifierControls({
  modifiers,
  onChange,
  onClose,
}: ModifierControlsProps) {
  const ui = useUi();
  const stepperStyle = { flex: "1 1 130px" };

  return (
    <div className="px-[12px] py-[10px] flex flex-wrap gap-[8px]">
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
        label={ui("calc.apWorsened")}
        checked={modifiers.apWorsened}
        onToggle={() => onChange({ ...modifiers, apWorsened: !modifiers.apWorsened })}
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
      <button
        type="button"
        onClick={onClose}
        aria-label="Close both units"
        className="w-[46px] h-[46px] shrink-0 flex items-center justify-center rounded-[var(--r-control)] text-[20px]"
        style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
      >
        ✕
      </button>
    </div>
  );
}
