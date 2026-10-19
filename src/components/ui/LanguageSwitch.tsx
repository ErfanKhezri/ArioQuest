import { LANGUAGES, type Language } from "@/i18n/language";
import { useLanguage } from "@/i18n/useLanguage";
import { cn } from "@/lib/cn";

const languages = Object.keys(LANGUAGES) as Language[];

/**
 * Switches to the other language, labelled in that language ("فارسی" / "English").
 * Used on the sign-in screen, where Settings is out of reach.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const [language, setLanguage] = useLanguage();
  const next = languages.find((other) => other !== language) ?? "en";

  return (
    <button
      type="button"
      lang={next}
      onClick={() => setLanguage(next)}
      className={cn(
        "inline-flex h-7 items-center rounded-md px-2 text-sm text-muted hover:bg-panel-2 hover:text-fg",
        "focus-visible:outline-2 focus-visible:outline-accent",
        className,
      )}
    >
      {LANGUAGES[next].label}
    </button>
  );
}
