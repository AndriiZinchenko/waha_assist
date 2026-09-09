import type { DirectionModifiers } from "../lib/combat";

export type WeaponFilter = "ranged" | "melee";

interface ModifierControlsProps {
  modifiers: DirectionModifiers;
  onChange: (next: DirectionModifiers) => void;
  weaponFilter: WeaponFilter;
  onWeaponFilterChange: (next: WeaponFilter) => void;
  /** Deselect both units so another pair can be compared. The calculator
   * itself stays open; the modifiers are not saved and reset with it. */
  onClose: () => void;
}

function WeaponFilterSwitch({
  value,
  onChange,
}: {
  value: WeaponFilter;
  onChange: (next: WeaponFilter) => void;
}) {
  const options: WeaponFilter[] = ["ranged", "melee"];
  return (
    <span
      className="flex rounded-[7px] p-[3px]"
      style={{ background: "var(--panel)" }}
    >
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="px-3 py-1.5 rounded-[5px] capitalize font-semibold"
            style={{
              color: isActive ? "var(--ink)" : "var(--ink-soft)",
              background: isActive ? "var(--paper-sunk)" : undefined,
            }}
          >
            {option}
          </button>
        );
      })}
    </span>
  );
}

function formatMod(mod: number): string {
  return mod > 0 ? `+${mod}` : String(mod);
}

function StepperControl({
  label,
  display,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
}: {
  label: string;
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled: boolean;
  incrementDisabled: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <button
        type="button"
        disabled={decrementDisabled}
        onClick={onDecrement}
        className="w-[24px] h-[24px] rounded-[6px] disabled:opacity-40"
        style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
      >
        −
      </button>
      <span className="mono inline-block w-[2.5em] text-center">{display}</span>
      <button
        type="button"
        disabled={incrementDisabled}
        onClick={onIncrement}
        className="w-[24px] h-[24px] rounded-[6px] disabled:opacity-40"
        style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
      >
        +
      </button>
    </span>
  );
}

export function ModifierControls({
  modifiers,
  onChange,
  weaponFilter,
  onWeaponFilterChange,
  onClose,
}: ModifierControlsProps) {
  return (
    <div className="px-4 py-2 flex items-start justify-between gap-4 text-[13.5px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <WeaponFilterSwitch value={weaponFilter} onChange={onWeaponFilterChange} />
        <StepperControl
          label="Hit"
          display={formatMod(modifiers.hitMod)}
          decrementDisabled={modifiers.hitMod <= -1}
          incrementDisabled={modifiers.hitMod >= 1}
          onDecrement={() =>
            onChange({ ...modifiers, hitMod: (modifiers.hitMod - 1) as -1 | 0 | 1 })
          }
          onIncrement={() =>
            onChange({ ...modifiers, hitMod: (modifiers.hitMod + 1) as -1 | 0 | 1 })
          }
        />
        <StepperControl
          label="Wound"
          display={formatMod(modifiers.woundMod)}
          decrementDisabled={modifiers.woundMod <= -1}
          incrementDisabled={modifiers.woundMod >= 1}
          onDecrement={() =>
            onChange({ ...modifiers, woundMod: (modifiers.woundMod - 1) as -1 | 0 | 1 })
          }
          onIncrement={() =>
            onChange({ ...modifiers, woundMod: (modifiers.woundMod + 1) as -1 | 0 | 1 })
          }
        />
        <StepperControl
          label="Invuln"
          display={
            modifiers.invulnOverride === null ? "None" : `${modifiers.invulnOverride}+`
          }
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
        <button
          type="button"
          onClick={() => onChange({ ...modifiers, apWorsened: !modifiers.apWorsened })}
          className="px-3 py-1.5 rounded-[7px]"
          style={{
            border: `1px solid ${modifiers.apWorsened ? "var(--side-a)" : "var(--rule)"}`,
            color: modifiers.apWorsened ? "var(--side-a-heading)" : "var(--ink-soft)",
            background: modifiers.apWorsened ? "var(--paper-sunk)" : "var(--panel)",
          }}
        >
          AP worsened by 1
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...modifiers, halfRange: !modifiers.halfRange })}
          className="px-3 py-1.5 rounded-[7px]"
          style={{
            border: `1px solid ${modifiers.halfRange ? "var(--side-a)" : "var(--rule)"}`,
            color: modifiers.halfRange ? "var(--side-a-heading)" : "var(--ink-soft)",
            background: modifiers.halfRange ? "var(--paper-sunk)" : "var(--panel)",
          }}
        >
          Half range (Melta/Rapid Fire)
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 px-3 py-1.5 rounded-[7px]"
        style={{ border: "1px solid var(--rule)", color: "var(--ink-soft)" }}
      >
        Close
      </button>
    </div>
  );
}
