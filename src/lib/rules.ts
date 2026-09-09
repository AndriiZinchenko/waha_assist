import type { RuleRef } from "../../parseRoster.mjs";

/**
 * A weapon's `rules` are the union of every core rule on its owning
 * selection (see parseRoster.mjs `collectRules`), not one-to-one with its
 * `keywords` strings — "Rapid Fire 2" needs to resolve to the rule named
 * "Rapid Fire", "Anti-INFANTRY 4+" to "Anti-". Match by prefix so a keyword
 * with a trailing value/threshold still finds its rule text.
 */
export function matchRule(keyword: string, rules: RuleRef[]): RuleRef | undefined {
  const kw = keyword.toLowerCase();
  return rules.find((r) => kw.startsWith(r.name.toLowerCase()));
}
