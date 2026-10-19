import { i18n } from "@/i18n";
import { applyDocumentLanguage } from "@/i18n/language";
import { site as en } from "./en";
import { site as fa } from "./fa";

/**
 * The website adds its own text to the app's i18next instance. The site also
 * runs app code (the cURL parser), and both share the language choice
 * ("aq-lang") with the web demo at /app.
 */
i18n.addResourceBundle("en", "site", en);
i18n.addResourceBundle("fa", "site", fa);
i18n.setDefaultNamespace("site");

/** `<html lang dir>`, the tab title and the description follow the language. */
function applyLanguage(language: string) {
  applyDocumentLanguage(language);
  document.title = i18n.t("site:meta.title");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", i18n.t("site:meta.description"));
}

applyLanguage(i18n.language);
i18n.on("languageChanged", applyLanguage);
