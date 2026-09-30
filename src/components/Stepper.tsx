import type { CSSProperties, ReactNode } from "react";

interface StepperProps {
  value: ReactNode;
  /** Small caption shown inside the value cell, above the value. */
  caption?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled: boolean;
  incrementDisabled: boolean;
  /** Accessible names for the − / + buttons. */
  decrementLabel: string;
  incrementLabel: string;
  valueColor?: string;
  /** Fixed value-cell width; omit to let the value cell grow. */
  valueWidth?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * − value + group; 46px outside so each button is a full 44px inside the
 * border. A button at its bound is visibly disabled
 * (--disabled-bg, --ink-off glyph), not just dimmed.
 */
export function Stepper({
  value,
  caption,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  decrementLabel,
  incrementLabel,
  valueColor,
  valueWidth,
  className = "",
  style,
}: StepperProps) {
  return (
    <span
      className={`flex items-stretch h-[46px] rounded-[var(--r-control)] overflow-hidden ${className}`}
      style={{ border: "1px solid var(--rule)", ...style }}
    >
      <StepButton
        glyph="−"
        label={decrementLabel}
        disabled={decrementDisabled}
        onClick={onDecrement}
      />
      <span
        className={`flex flex-col items-center justify-center min-w-0 ${valueWidth ? "" : "flex-1"}`}
        style={{
          width: valueWidth,
          borderInline: "1px solid var(--rule)",
          background: "var(--paper-sunk)",
        }}
      >
        {caption && <span className="caption caption-sm leading-none mb-[3px]">{caption}</span>}
        <span
          className="mono font-bold leading-none"
          style={{ fontSize: caption ? 17 : 18, color: valueColor ?? "var(--ink)" }}
        >
          {value}
        </span>
      </span>
      <StepButton
        glyph="+"
        label={incrementLabel}
        disabled={incrementDisabled}
        onClick={onIncrement}
      />
    </span>
  );
}

function StepButton({
  glyph,
  label,
  disabled,
  onClick,
}: {
  glyph: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="mono w-[44px] shrink-0 flex items-center justify-center text-[20px] font-bold"
      style={{
        background: disabled ? "var(--disabled-bg)" : "var(--paper)",
        color: disabled ? "var(--ink-off)" : "var(--ink)",
      }}
    >
      {glyph}
    </button>
  );
}
