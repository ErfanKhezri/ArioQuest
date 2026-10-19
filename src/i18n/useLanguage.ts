import { useTranslation } from "react-i18next";
import { LANGUAGES, saveLanguage, type Language } from "./language";

/** The current language and a setter that also remembers the choice on this device. */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language: Language = i18n.language in LANGUAGES ? (i18n.language as Language) : "en";
  const setLanguage = (next: Language) => {
    saveLanguage(next);
    void i18n.changeLanguage(next);
  };
  return [language, setLanguage] as const;
}
