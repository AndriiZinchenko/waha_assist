import { useLang, type Lang } from "./i18n";

/**
 * Interface strings that change with the EN/UA toggle (see
 * docs/dataslate-migration.md §9). Separate from `src/i18n/uk.ts`, which
 * only holds roster-derived rules text keyed by the English original.
 */
const STRINGS = {
  side: { en: "SIDE", uk: "СТОРОНА" },
  open: { en: "OPEN", uk: "ВІДКРИТО" },
  "overflow.language": { en: "Language", uk: "Мова" },
  "overflow.wake": { en: "Keep screen awake", uk: "Не вимикати екран" },
  "calc.halfRange": { en: "Half range", uk: "Пів дальності" },
  "calc.apWorsened": { en: "AP worsened by 1", uk: "БП гірше на 1" },
  "calc.stationary": { en: "Stationary (Heavy)", uk: "Не рухався (Heavy)" },
  "calc.engaged": {
    en: "A Monster or Vehicle here is within Engagement Range of an enemy",
    uk: "Monster або Vehicle тут перебуває в Engagement Range ворожого підрозділу",
  },
  "calc.engagedShort": { en: "Engaged", uk: "У бою" },
  "voice.notUnderstood": {
    en: "Didn't catch that — try “3 against 7”",
    uk: "Не розчув — спробуйте «3 проти 7»",
  },
  "setup.needSide": {
    en: "Assign an army to {side} to start.",
    uk: "Призначте армію стороні {side}, щоб почати.",
  },
  "setup.noEdition": {
    en: "No {edition} edition armies yet. Build a list in New Recruit's {edition} Edition, then run",
    uk: "Армій {edition} редакції ще немає. Створіть список у New Recruit для {edition} Edition, потім запустіть",
  },
  "det.roster": { en: "ROSTER DETACHMENT", uk: "ЗАГІН РОСТЕРА" },
  "strat.when": { en: "WHEN", uk: "КОЛИ" },
  "phase.filtered": { en: "Filtered to {phase} phase", uk: "Фільтр: {phase} phase" },
  "phase.showAll": { en: "Show all", uk: "Показати все" },
  "phase.filterByPhase": { en: "Filter by phase", uk: "Фільтр за фазою" },
  "phase.showingAll": { en: "Showing everything", uk: "Показано все" },
  "phase.other": { en: "Other ({n})", uk: "Інші ({n})" },
  "phase.noStratagems": {
    en: "No stratagems for this phase. Use Show all to see the rest.",
    uk: "Немає стратагем для цієї фази. «Показати все» покаже решту.",
  },
} satisfies Record<string, Record<Lang, string>>;

export type UiKey = keyof typeof STRINGS;

export function uiString(
  key: UiKey,
  lang: Lang,
  vars: Record<string, string> = {},
): string {
  return STRINGS[key][lang].replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
}

/** `useLang()` + `uiString()` for rendering interface copy. */
export function useUi(): (key: UiKey, vars?: Record<string, string>) => string {
  const lang = useLang();
  return (key, vars) => uiString(key, lang, vars);
}
