import { m } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { LANGUAGES, type Language } from "@/i18n/language";
import { useLanguage } from "@/i18n/useLanguage";
import { cn } from "@/lib/cn";
import { press } from "../lib/motion";
import { Dialog } from "./Dialog";

const languages = Object.keys(LANGUAGES) as Language[];

/** A globe button in the nav that opens a dialog for choosing the site's language. */
export function LanguageMenu() {
  const { t } = useTranslation("site");
  const [language, setLanguage] = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <m.button
        {...press}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("language.title")}
        aria-haspopup="dialog"
        className="inline-flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel-2 hover:text-fg"
      >
        <Icon name="globe" size={17} />
      </m.button>
      <Dialog open={open} title={t("language.title")} onClose={() => setOpen(false)}>
        <ul className="flex flex-col gap-1">
          {languages.map((option) => {
            const selected = option === language;
            return (
              <li key={option}>
                <button
                  type="button"
                  lang={option}
                  aria-current={selected}
                  // Start on the current language, so Enter keeps it.
                  data-autofocus={selected || undefined}
                  onClick={() => {
                    setLanguage(option);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-12 w-full items-center gap-3 rounded-md px-3 text-start transition-colors",
                    selected ? "bg-accent/15 text-fg" : "text-muted hover:bg-panel-2 hover:text-fg",
                  )}
                >
                  <span className="flex-1 font-medium">{LANGUAGES[option].label}</span>
                  {selected && <Icon name="check" size={16} className="text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </>
  );
}
