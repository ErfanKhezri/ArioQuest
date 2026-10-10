import { cn } from "@/lib/cn";
import { useToasts } from "@/store/toasts";
import { Icon } from "./Icon";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-10 z-[70] flex w-80 flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-panel px-3.5 py-3 text-xs shadow-xl shadow-black/15 motion-safe:animate-fade-up",
            t.kind === "error" ? "border-rose-500/30" : "border-line",
          )}
        >
          <Icon
            name={t.kind === "error" ? "alert" : t.kind === "success" ? "checkCircle" : "info"}
            size={15}
            className={cn(
              "mt-px shrink-0",
              t.kind === "error"
                ? "text-rose-500"
                : t.kind === "success"
                  ? "text-emerald-500"
                  : "text-brand-500",
            )}
          />
          <span className="selectable min-w-0 flex-1 leading-relaxed break-words">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="text-subtle hover:text-fg"
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
