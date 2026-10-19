import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { useToasts } from "@/store/toasts";
import { Icon } from "./Icon";
import { Ario } from "./Ario";

export function Toaster() {
  const { t } = useTranslation();
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed end-4 bottom-8 z-[70] flex w-80 flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "glass pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
            toast.kind === "error" ? "border-danger/40" : "border-line",
          )}
        >
          {toast.kind === "error" ? (
            <Ario mood="sad" size={20} className="text-danger" />
          ) : (
            <Icon name="check" size={14} className="mt-px shrink-0 text-subtle" />
          )}
          <span className="selectable min-w-0 flex-1 break-words">{toast.message}</span>
          <button
            type="button"
            aria-label={t("actions.dismiss")}
            onClick={() => dismiss(toast.id)}
            className="text-subtle hover:text-fg"
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
