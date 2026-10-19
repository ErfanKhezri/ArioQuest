import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { applyDocumentLanguage, initialLanguage } from "./language";
import * as en from "./locales/en";
import * as fa from "./locales/fa";

/**
 * i18next for the desktop app and the web demo. Text lives in `locales/`;
 * components use `useTranslation()`, plain modules (store, core) use `t`.
 */
void i18n.use(initReactI18next).init({
  resources: {
    en: { app: en.app },
    fa: { app: fa.app },
  },
  lng: initialLanguage(),
  fallbackLng: "en",
  ns: ["app"],
  defaultNS: "app",
  // React already escapes text.
  interpolation: { escapeValue: false },
  // Resources are bundled, so there is nothing to wait for.
  initAsync: false,
});

applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export const t = i18n.t.bind(i18n);

/** The value of a key in every language, e.g. to recognise a default name in any of them. */
export const inEveryLanguage = (key: "defaults.untitledRequest" | "defaults.untitledGrpc") =>
  Object.keys(i18n.options.resources ?? {}).map((lng) => t(key, { lng }));

export { i18n };
