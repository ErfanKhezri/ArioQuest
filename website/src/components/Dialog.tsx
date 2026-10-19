import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { ease } from "../lib/motion";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * A small modal over the page: closes on Esc, the × button or a click outside,
 * and focuses the element marked `data-autofocus` (or the × button) when it opens.
 */
export function Dialog({ open, ...props }: DialogProps) {
  return createPortal(
    <AnimatePresence>{open && <Panel {...props} />}</AnimatePresence>,
    document.body,
  );
}

function Panel({ title, onClose, children, className }: Omit<DialogProps, "open">) {
  const { t } = useTranslation("site");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-60 flex items-start justify-center bg-black/50 p-4 pt-[18vh] backdrop-blur-sm"
    >
      <m.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.25, ease }}
        className={cn(
          "w-full max-w-sm rounded-md border border-line bg-panel p-2 shadow-[0_24px_64px_rgb(0_0_0/0.4)]",
          className,
        )}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <h2 id={titleId} className="text-body font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("dialog.close")}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-panel-2 hover:text-fg"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
        {children}
      </m.div>
    </m.div>
  );
}
