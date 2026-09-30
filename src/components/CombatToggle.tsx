import { HeaderIconButton } from "./VoiceToggle";

interface CombatToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function CombatToggle({ enabled, onToggle }: CombatToggleProps) {
  return (
    <HeaderIconButton
      pressed={enabled}
      onClick={onToggle}
      label={enabled ? "Hide combat calculator" : "Show combat calculator"}
    >
      <CalculatorIcon />
    </HeaderIconButton>
  );
}

function CalculatorIcon({ size = 22 }: { size?: number }) {
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
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <rect x="8" y="5.5" width="8" height="4" rx="0.5" />
      <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" strokeWidth="2.6" />
    </svg>
  );
}
