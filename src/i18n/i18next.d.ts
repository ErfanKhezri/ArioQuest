import "i18next";
import type { site } from "../../website/src/i18n/en";
import type { app } from "./locales/en";

// Type-checks every t("…") key against the English files.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "app";
    resources: { app: typeof app; site: typeof site };
  }
}
