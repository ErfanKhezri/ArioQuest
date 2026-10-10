import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/store/workspace";
import { type QuickActionId, quickActions } from "./data";

export function QuickActions() {
  const newTab = useWorkspace((s) => s.newTab);
  const openDialog = useWorkspace((s) => s.openDialog);
  const showSection = useWorkspace((s) => s.showSection);

  const run: Record<QuickActionId, () => void> = {
    "new-request": () => newTab("http"),
    "new-grpc": () => {
      showSection("protos");
      newTab("grpc");
    },
    import: () => openDialog({ type: "import" }),
    environment: () => showSection("environments"),
  };

  return (
    <section>
      <h2 className="text-sm font-semibold">Start something new</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action, i) => (
          <button
            key={action.id}
            type="button"
            onClick={run[action.id]}
            className={cn(
              "group relative flex flex-col items-start rounded-2xl border border-line bg-panel p-4 text-left transition-all",
              "hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5",
              "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none",
              "motion-safe:animate-fade-up",
            )}
            style={{ animationDelay: `${200 + i * 60}ms` }}
          >
            <span className={cn("flex size-9 items-center justify-center rounded-xl", action.tint)}>
              <Icon name={action.icon} size={18} />
            </span>
            <span className="mt-4 text-sm font-semibold">{action.title}</span>
            <span className="mt-1 text-xs text-muted">{action.description}</span>
            <span className="mt-4 flex h-5 gap-0.5">
              {action.shortcut.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
            <Icon
              name="arrowRight"
              size={16}
              className="absolute top-4 right-4 -translate-x-1 text-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
