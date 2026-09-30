import type { ReactNode } from "react";

interface VoiceToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

/** Header switch for voice mode. While on, every unit row shows its
 * number and the listening banner sits under the header. */
export function VoiceToggle({ enabled, onToggle }: VoiceToggleProps) {
  return (
    <HeaderIconButton
      pressed={enabled}
      onClick={onToggle}
      label={enabled ? "Turn voice commands off" : "Turn voice commands on"}
    >
      <MicIcon />
    </HeaderIconButton>
  );
}

/** 44×44 header icon button; ON is inverted. */
export function HeaderIconButton({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      className={`w-[44px] h-[44px] shrink-0 rounded-[var(--r-control)] flex items-center justify-center ${pressed ? "selected" : ""}`}
      style={{ color: pressed ? undefined : "var(--ink)" }}
    >
      {children}
    </button>
  );
}

export function MicIcon({ size = 22 }: { size?: number }) {
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
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </svg>
  );
}
