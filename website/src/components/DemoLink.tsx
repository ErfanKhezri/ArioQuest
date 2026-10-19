import { m } from "motion/react";
import { useState, type ComponentProps, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Ario } from "@/components/ui/Ario";
import { Icon } from "@/components/ui/Icon";
import { DEMO_URL } from "../lib/github";
import { press } from "../lib/motion";
import { Dialog } from "./Dialog";

// Below Tailwind's `md`, where the page already says the demo works best on a desktop.
const PHONE_SCREEN = "(max-width: 767px)";

/**
 * A link to the online demo. The demo is a full desktop app, so on a phone the
 * click opens a note asking the visitor to open it on a desktop instead.
 */
export function DemoLink({ onClick, ...props }: Omit<ComponentProps<typeof m.a>, "href">) {
  const [open, setOpen] = useState(false);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (window.matchMedia(PHONE_SCREEN).matches) {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <>
      <m.a {...props} href={DEMO_URL} onClick={handleClick} />
      <DesktopOnlyDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function DesktopOnlyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation("site");
  const [copied, setCopied] = useState(false);
  const demoAddress = new URL(DEMO_URL, window.location.href).href;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(demoAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the address is still shown in the dialog.
    }
  };

  return (
    <Dialog open={open} title={t("demoDesktop.title")} onClose={onClose}>
      <div className="flex flex-col gap-4 px-3 pt-1 pb-3">
        <div className="flex items-center gap-3">
          <Ario mood="shy" className="size-14 shrink-0 text-accent" />
          <p className="text-small text-muted">{t("demoDesktop.body")}</p>
        </div>
        <p
          dir="ltr"
          className="text-small truncate rounded-md border border-line bg-canvas px-3 py-2 font-mono text-fg"
        >
          {demoAddress}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <m.button
            {...press}
            type="button"
            onClick={copyLink}
            className="text-small inline-flex h-10 items-center justify-center gap-2 rounded-md bg-panel-2 font-medium text-fg transition-colors hover:bg-line"
          >
            <Icon name={copied ? "check" : "copy"} size={15} />
            {copied ? t("demoDesktop.copied") : t("demoDesktop.copy")}
          </m.button>
          <m.button
            {...press}
            type="button"
            onClick={onClose}
            data-autofocus
            className="text-small inline-flex h-10 items-center justify-center rounded-md bg-accent font-medium text-accent-fg transition-colors hover:bg-accent/85"
          >
            {t("demoDesktop.ok")}
          </m.button>
        </div>
      </div>
    </Dialog>
  );
}
