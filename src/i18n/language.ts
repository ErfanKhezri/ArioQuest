/**
 * The interface language, shared by the app, the web demo and the website.
 * The choice is stored per device under "aq-lang", next to "aq-theme".
 */

export const LANGUAGES = {
  en: { label: "English", dir: "ltr" },
  fa: { label: "فارسی", dir: "rtl" },
} as const;

export type Language = keyof typeof LANGUAGES;

const STORAGE_KEY = "aq-lang";

const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && value in LANGUAGES;

/** The saved choice, else the browser's language when we support it, else English. */
export function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Storage can be blocked; fall through to the browser language.
  }
  const browser = typeof navigator === "undefined" ? "" : navigator.language.slice(0, 2);
  return isLanguage(browser) ? browser : "en";
}

export function saveLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not saved; the language still applies until the page reloads.
  }
}

/** Sets `<html lang dir>` so the browser lays the page out right-to-left for Persian. */
export function applyDocumentLanguage(language: string) {
  if (typeof document === "undefined") return;
  const dir = isLanguage(language) ? LANGUAGES[language].dir : "ltr";
  document.documentElement.lang = language;
  document.documentElement.dir = dir;
}

export const isRtl = () =>
  typeof document !== "undefined" && document.documentElement.dir === "rtl";
