import type { WeaponMode } from "./route";

/** The phases of a turn, in play order. */
export const PHASES = ["command", "movement", "shooting", "charge", "fight"] as const;
export type Phase = (typeof PHASES)[number];

/** Rules terms, so they read the same in both languages. */
export const PHASE_NAMES: Record<Phase, string> = {
  command: "Command",
  movement: "Movement",
  shooting: "Shooting",
  charge: "Charge",
  fight: "Fight",
};

export function isPhase(value: unknown): value is Phase {
  return typeof value === "string" && (PHASES as readonly string[]).includes(value);
}

/** Which weapons the calculator resolves in a phase; none outside Shooting
 * and Fight. */
export function weaponModeFor(phase: Phase): WeaponMode | null {
  if (phase === "shooting") return "ranged";
  if (phase === "fight") return "melee";
  return null;
}

function phaseWord(phase: Phase): RegExp {
  return new RegExp(`\\b${PHASE_NAMES[phase]} phase\\b`, "i");
}

/** Whether a text names the phase ("In your Command phase, …"). */
export function mentionsPhase(text: string | null | undefined, phase: Phase): boolean {
  return !!text && phaseWord(phase).test(text);
}

/**
 * Whether a stratagem can be used in the phase: its timing names the phase
 * (yours, or an opponent's it reacts in) or says "Any phase". A stratagem
 * with no timing is never hidden.
 */
export function stratagemInPhase(timing: string | null | undefined, phase: Phase): boolean {
  if (!timing || !timing.trim()) return true;
  return /\bany phase\b/i.test(timing) || phaseWord(phase).test(timing);
}

/** Whether an ability or rule names the phase in its name or its text. */
export function matchesPhase(
  item: { name: string; text: string | null },
  phase: Phase,
): boolean {
  return mentionsPhase(item.name, phase) || mentionsPhase(item.text, phase);
}

/** Items whose name or text names the phase, then the rest, each in order. */
export function partitionByPhase<T extends { name: string; text: string | null }>(
  items: T[],
  phase: Phase,
): { matching: T[]; other: T[] } {
  const matching: T[] = [];
  const other: T[] = [];
  for (const item of items) {
    (matchesPhase(item, phase) ? matching : other).push(item);
  }
  return { matching, other };
}
