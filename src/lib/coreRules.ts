import type { ParsedUnit, RuleRef } from "../../parseRoster.mjs";
import { CORE_ABILITIES } from "../data/core-abilities";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchers = Object.keys(CORE_ABILITIES)
  .sort()
  .map((name) => ({
    name,
    // The name as a whole word, so "Hover" is not found inside "Hoverboards".
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, "u"),
  }));

/**
 * Core abilities a unit's abilities mention (a Techmarine "has the Lone
 * Operative ability") but whose definition the roster does not attach to the
 * unit. Rosters only carry the definitions of some core abilities, so this
 * fills in the rest from the core book. Skips any the unit already lists as a
 * rule; a rule with a value after the name ("Deadly Demise D3") counts.
 */
export function referencedCoreRules(unit: ParsedUnit): RuleRef[] {
  const listed = unit.rules.map((r) => r.name.toLowerCase());
  const mentions = unit.abilities.map((a) => `${a.name}\n${a.text ?? ""}`).join("\n");
  return matchers
    .filter(
      ({ name, pattern }) =>
        pattern.test(mentions) && !listed.some((l) => l.startsWith(name.toLowerCase())),
    )
    .map(({ name }) => ({ name, text: CORE_ABILITIES[name] }));
}
