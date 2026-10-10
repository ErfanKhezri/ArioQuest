import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconButton } from "./controls";

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Hide the header bar (for the command palette). */
  bare?: boolean;
}

export function Modal({ title, onClose, children, footer, className, bare = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    // Focus the first field so keyboard users can start typing immediately.
    const first = panelRef.current?.querySelector<HTMLElement>(
      "input, textarea, select, .cm-content, button",
    );
    first?.focus();
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6 pt-[10vh] backdrop-blur-[2px] motion-safe:animate-fade-up"
      style={{ animationDuration: "0.2s" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/30",
          className,
        )}
      >
        {!bare && (
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-sm font-semibold">{title}</h2>
            <IconButton icon="x" label="Close" onClick={onClose} />
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-panel-2/40 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
