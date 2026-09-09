interface CombatToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function CombatToggle({ enabled, onToggle }: CombatToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={
        enabled ? "Hide combat calculator" : "Show combat calculator"
      }
      className="min-w-[44px] min-h-[44px] rounded-[7px] flex items-center justify-center text-[21.5px]"
      style={{
        color: enabled ? "var(--ink)" : "var(--ink-soft)",
        background: enabled ? "var(--paper-sunk)" : undefined,
      }}
    >
      ⚔
    </button>
  );
}
