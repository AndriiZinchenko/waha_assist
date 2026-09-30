import type { WeaponMode } from "../lib/route";

interface WeaponModeToggleProps {
  mode: WeaponMode;
  onChange: (next: WeaponMode) => void;
}

const OPTIONS: Array<{ value: WeaponMode; label: string }> = [
  { value: "ranged", label: "Ranged" },
  { value: "melee", label: "Melee" },
];

/**
 * Header switch for the phase being played: the calculator resolves only
 * ranged or only melee weapons. It stays where it is while different unit
 * pairs are compared, so a whole Shooting or Fight phase runs on one tap.
 */
export function WeaponModeToggle({ mode, onChange }: WeaponModeToggleProps) {
  return (
    <span
      role="group"
      aria-label="Weapon type"
      className="flex h-[46px] shrink-0 rounded-[var(--r-control)] overflow-hidden"
      style={{ border: "1px solid var(--rule)" }}
    >
      {OPTIONS.map((option, i) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={`${option.label} weapons`}
            title={`${option.label} weapons`}
            onClick={() => onChange(option.value)}
            className={`min-w-[44px] px-[10px] flex items-center justify-center gap-[6px] ${active ? "selected" : ""}`}
            style={{
              color: active ? undefined : "var(--ink-2)",
              borderLeft: i > 0 ? "1px solid var(--rule)" : undefined,
            }}
          >
            {option.value === "ranged" ? <RangedIcon /> : <MeleeIcon />}
            <span className="display hidden min-[900px]:inline text-[14px] font-extrabold uppercase tracking-[0.1em]">
              {option.label}
            </span>
          </button>
        );
      })}
    </span>
  );
}

/** Crosshair. */
function RangedIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

/** Sword, point up. */
function MeleeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5l2 3v9.5h-4V5.5z" />
      <path d="M7 15h10" />
      <path d="M12 15v4.5" />
      <circle cx="12" cy="20.5" r="1.3" />
    </svg>
  );
}
