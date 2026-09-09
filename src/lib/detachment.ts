/**
 * The detachment an army plays with: the one chosen in configuration when
 * there is one, otherwise the one the roster was built with. Keyed by
 * army id, so a choice survives re-syncing the roster from New Recruit.
 */
export function effectiveDetachment(
  army: { id: string; parsed: { detachment?: string | null } },
  overrides: Record<string, string>,
): string | null {
  return overrides[army.id] ?? army.parsed.detachment ?? null;
}
