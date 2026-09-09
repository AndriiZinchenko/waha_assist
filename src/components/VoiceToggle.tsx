interface VoiceToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

/** Header switch for voice mode. While on, every unit row shows its
 * number and the tap-to-speak button appears over the unit lists. */
export function VoiceToggle({ enabled, onToggle }: VoiceToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn voice commands off" : "Turn voice commands on"}
      className="min-w-[44px] min-h-[44px] rounded-[7px] flex items-center justify-center"
      style={{
        color: enabled ? "var(--ink)" : "var(--ink-soft)",
        background: enabled ? "var(--paper-sunk)" : undefined,
      }}
    >
      <MicIcon />
    </button>
  );
}

export function MicIcon({ size = 20 }: { size?: number }) {
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
