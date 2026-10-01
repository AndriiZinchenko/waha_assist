import { useState } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { UnitOptionsResult, WeaponOptionProfile } from "../data/unit-options";
import {
  addGroup,
  addWeapon,
  removeGroup,
  removeWeapon,
  resolveWeapon,
  rosterSignature,
  setGroupModelCount,
  setWeaponPerModel,
  startOverride,
  swapWeapon,
  type UnitWeaponOverride,
} from "../lib/weaponOverrides";
import { Stepper } from "./Stepper";

interface WeaponEditorProps {
  /** The roster unit, before any override. */
  unit: ParsedUnit;
  override: UnitWeaponOverride | null;
  options: UnitOptionsResult | null;
  /** The new override, or null to go back to the roster's weapons. */
  onChange: (next: UnitWeaponOverride | null) => void;
  onClose: () => void;
}

function summary(p: WeaponOptionProfile): string {
  const skill = p.type === "melee" ? "WS" : "BS";
  const range = p.type === "ranged" && p.range ? `${p.range} ` : "";
  return `${range}A${p.attacks} ${skill}${p.skill ?? "—"} S${p.strength} AP${p.ap} D${p.damage}`;
}

const buttonClass =
  "min-h-[44px] px-[12px] rounded-[var(--r-control)] text-[15px] font-semibold";

/**
 * Edits which weapons a unit's models carry. Replaces the weapon table on
 * the configuration screen. Nothing here is checked against the datasheet
 * and points never change; the warning says so and stays on screen.
 */
export function WeaponEditor({ unit, override, options, onChange, onClose }: WeaponEditorProps) {
  const [picker, setPicker] = useState<{ groupKey: string; replace: string | null } | null>(null);

  if (!options || options.weapons.length === 0) {
    return (
      <div className="px-[14px] py-[12px] flex flex-col gap-[10px]">
        <p className="prose m-0">
          No weapon options for this unit. Run <code>npm run sync:options</code>.
        </p>
        <button type="button" onClick={onClose} className={buttonClass} style={{ border: "1px solid var(--rule)" }}>
          Done
        </button>
      </div>
    );
  }

  const working = override ?? startOverride(unit, options);
  const rosterChanged = override !== null && override.rosterSignature !== rosterSignature(unit);

  function pick(optionName: string) {
    if (!picker) return;
    onChange(
      picker.replace === null
        ? addWeapon(working, picker.groupKey, optionName)
        : swapWeapon(working, picker.groupKey, picker.replace, optionName),
    );
    setPicker(null);
  }

  return (
    <div className="px-[14px] py-[12px] flex flex-col gap-[12px]">
      <div
        role="note"
        className="px-[12px] py-[10px] rounded-[var(--r-control)] text-[14px] font-medium"
        style={{ background: "var(--negative-fill)", color: "var(--negative)" }}
      >
        Not validated. The app does not check what this unit may take and does not change its
        points. Check the datasheet or New Recruit.
      </div>
      {rosterChanged && (
        <div
          role="note"
          className="px-[12px] py-[10px] rounded-[var(--r-control)] text-[14px] font-medium"
          style={{ background: "var(--negative-fill)", color: "var(--negative)" }}
        >
          The roster for this unit changed in New Recruit after this edit. Keep it, or reset to the
          roster.
        </div>
      )}

      {working.groups.map((group, index) => (
        <div
          key={group.key}
          className="rounded-[var(--r-control)] p-[12px] flex flex-col gap-[10px]"
          style={{ background: "var(--paper-sunk)", border: "1px solid var(--rule)" }}
        >
          <div className="flex items-center justify-between gap-[10px]">
            <span className="caption">Group {index + 1}</span>
            <div className="flex items-center gap-[10px]">
              <span className="text-[14px] font-medium" style={{ color: "var(--ink-2)" }}>
                Models
              </span>
              <Stepper
                value={group.modelCount}
                valueWidth={44}
                decrementLabel={`Fewer models in group ${index + 1}`}
                incrementLabel={`More models in group ${index + 1}`}
                decrementDisabled={group.modelCount <= 0}
                incrementDisabled={false}
                onDecrement={() => onChange(setGroupModelCount(working, group.key, group.modelCount - 1))}
                onIncrement={() => onChange(setGroupModelCount(working, group.key, group.modelCount + 1))}
              />
            </div>
          </div>

          {group.weapons.length === 0 && (
            <p className="m-0 text-[14px]" style={{ color: "var(--ink-soft)" }}>
              No weapons in this group.
            </p>
          )}
          {group.weapons.map((weapon) => {
            const known = resolveWeapon(weapon.name, options, unit) !== null;
            return (
              <div key={weapon.name} className="flex items-center gap-[8px]">
                {known ? (
                  <button
                    type="button"
                    onClick={() => setPicker({ groupKey: group.key, replace: weapon.name })}
                    className="flex-1 min-w-0 min-h-[44px] text-left text-[17px] font-semibold"
                    aria-label={`Swap ${weapon.name}`}
                  >
                    <span className="has-rule">{weapon.name}</span>
                  </button>
                ) : (
                  <span className="flex-1 min-w-0 text-[17px] font-semibold" style={{ color: "var(--negative)" }}>
                    {weapon.name}
                    <span className="block text-[13px] font-medium">not in catalogue</span>
                  </span>
                )}
                <Stepper
                  value={`${weapon.perModel}×`}
                  valueWidth={44}
                  decrementLabel={`Fewer ${weapon.name} per model`}
                  incrementLabel={`More ${weapon.name} per model`}
                  decrementDisabled={weapon.perModel <= 1}
                  incrementDisabled={false}
                  onDecrement={() => onChange(setWeaponPerModel(working, group.key, weapon.name, weapon.perModel - 1))}
                  onIncrement={() => onChange(setWeaponPerModel(working, group.key, weapon.name, weapon.perModel + 1))}
                />
                <button
                  type="button"
                  onClick={() => onChange(removeWeapon(working, group.key, weapon.name))}
                  aria-label={`Remove ${weapon.name}`}
                  className="w-[46px] h-[46px] shrink-0 flex items-center justify-center rounded-[var(--r-control)] text-[18px]"
                  style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
                >
                  ✕
                </button>
              </div>
            );
          })}

          {picker?.groupKey === group.key ? (
            <div
              className="rounded-[var(--r-control)] overflow-hidden"
              style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
            >
              <div className="caption px-[12px] pt-[10px] pb-[6px]">
                {picker.replace === null ? "Add a weapon" : `Replace ${picker.replace}`}
              </div>
              {options.weapons.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => pick(option.name)}
                  className="w-full min-h-[44px] px-[12px] py-[8px] text-left"
                  style={{ borderTop: "1px solid var(--rule-soft)" }}
                >
                  <span className="block text-[16px] font-semibold">{option.name}</span>
                  {option.profiles.map((p) => (
                    <span
                      key={p.id}
                      className="mono block text-[12px]"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {summary(p)}
                    </span>
                  ))}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="w-full min-h-[44px] px-[12px] text-left text-[15px] font-semibold"
                style={{ borderTop: "1px solid var(--rule-soft)", color: "var(--ink-2)" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-[8px] flex-wrap">
              <button
                type="button"
                onClick={() => setPicker({ groupKey: group.key, replace: null })}
                className={buttonClass}
                style={{ border: "1px solid var(--rule)" }}
              >
                + Add weapon
              </button>
              {working.groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(removeGroup(working, group.key))}
                  className={buttonClass}
                  style={{ border: "1px solid var(--rule)", color: "var(--ink-2)" }}
                >
                  Remove group
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-[8px] flex-wrap">
        <button
          type="button"
          onClick={() => onChange(addGroup(working))}
          className={buttonClass}
          style={{ border: "1px solid var(--rule)" }}
        >
          + Add group
        </button>
        <button
          type="button"
          disabled={override === null}
          onClick={() => onChange(null)}
          className={buttonClass}
          style={{
            border: "1px solid var(--rule)",
            color: override === null ? "var(--ink-off)" : "var(--ink-2)",
          }}
        >
          Reset to roster
        </button>
        <button type="button" onClick={onClose} className={`${buttonClass} selected ml-auto`}>
          Done
        </button>
      </div>
    </div>
  );
}
