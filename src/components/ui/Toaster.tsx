import { cn } from "@/lib/cn";
import { useToasts } from "@/store/toasts";
import { Icon } from "./Icon";
import { Aria } from "./Aria";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-8 z-[70] flex w-80 flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2 rounded-md border bg-panel px-3 py-2 text-xs",
            t.kind === "error" ? "border-danger/40" : "border-line",
          )}
        >
          {t.kind === "error" ? (
            <Aria mood="sad" size={20} className="text-danger" />
          ) : (
            <Icon name="check" size={14} className="mt-px shrink-0 text-subtle" />
          )}
          <span className="selectable min-w-0 flex-1 break-words">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="text-subtle hover:text-fg"
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
