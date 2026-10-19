import { useTranslation } from "react-i18next";
import { Ario } from "@/components/ui/Ario";
import { DemoLink } from "../components/DemoLink";
import { RELEASES_URL, REPO_URL } from "../lib/github";

const tile = "flex flex-col justify-between gap-6 rounded-md bg-panel p-5";
const link = "text-fg underline-offset-4 hover:text-accent hover:underline";

export default function Footer() {
  const { t } = useTranslation("site");
  return (
    <footer className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-12">
      <div className={`${tile} lg:col-span-5`}>
        <p className="text-lead max-w-[30ch]">{t("footer.tagline")}</p>
        <p className="text-small text-muted">© 2026 ArioQuest</p>
      </div>
      <nav aria-label={t("footer.label")} className={`${tile} lg:col-span-4`}>
        <ul className="flex flex-col gap-2">
          <li>
            <a className={link} href="#features">
              {t("nav.features")}
            </a>
          </li>
          <li>
            <DemoLink className={link}>{t("footer.tryOnline")}</DemoLink>
          </li>
          <li>
            <a className={link} href={RELEASES_URL}>
              {t("footer.releases")}
            </a>
          </li>
          <li>
            <a className={link} href={`${REPO_URL}#readme`}>
              {t("footer.docs")}
            </a>
          </li>
        </ul>
      </nav>
      <a
        href={REPO_URL}
        className={`${tile} bg-accent text-accent-fg transition-colors hover:bg-accent/85 sm:col-span-2 lg:col-span-3`}
      >
        <span className="text-lead font-medium">{t("footer.star")}</span>
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="self-end rtl:-scale-x-100"
          aria-hidden
        >
          <path d="M5 19 19 5M8 5h11v11" />
        </svg>
      </a>
      <div className="flex items-center justify-center gap-[2vw] overflow-hidden rounded-md bg-fg py-10 text-canvas sm:col-span-2 lg:col-span-12">
        <Ario mood="happy" className="size-[11vw] max-h-40 max-w-40" />
        <span
          dir="ltr"
          className="text-[13vw] leading-none font-semibold tracking-[-0.05em] lg:text-[11vw]"
        >
          ArioQuest
        </span>
      </div>
    </footer>
  );
}
