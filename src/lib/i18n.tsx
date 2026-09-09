import { createContext, useContext, type ReactNode } from "react";
import { uk } from "../i18n/uk";

export type Lang = "en" | "uk";

const DICTIONARIES: Record<Lang, Record<string, string> | null> = {
  en: null,
  uk,
};

// Written via fromCharCode rather than a literal character so the
// distinction from a plain space survives any editor/encoding round-trip.
const NON_BREAKING_SPACE = String.fromCharCode(160);

/**
 * Some roster exports carry stray non-breaking spaces inside ability/rule
 * text — invisible in the UI, but they break an exact-string dictionary
 * lookup. Normalize to a plain ASCII space before comparing.
 */
function normalizeWhitespace(text: string): string {
  return text.split(NON_BREAKING_SPACE).join(" ");
}

/**
 * Translate roster-derived text (ability/rule names and text) for the
 * given language. Looks the exact string up in that language's
 * dictionary and falls back to the original English on any miss — an
 * untranslated string never breaks or renders blank, it just stays in
 * English until an entry is added to `src/i18n/<lang>.ts`.
 *
 * Deliberately NOT used for raw weapon keyword badges (`weapon.keywords`)
 * — those always render verbatim regardless of language. See
 * `.claude/skills/translate-army` for the full convention.
 */
export function translate(text: string | null, lang: Lang): string | null {
  if (text == null) return text;
  const dictionary = DICTIONARIES[lang];
  if (!dictionary) return text;
  return dictionary[normalizeWhitespace(text)] ?? text;
}

const LangContext = createContext<Lang>("en");

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** `useLang()` + `translate()` in one call, for the common case of
 * translating a single piece of roster text at render time. */
export function useTranslate(): (text: string | null) => string | null {
  const lang = useLang();
  return (text) => translate(text, lang);
}
