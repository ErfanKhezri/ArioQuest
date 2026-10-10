import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { type SidebarSection, useWorkspace } from "@/store/workspace";

interface RailButtonProps {
  label: string;
  icon: IconName;
  active?: boolean;
  onClick: () => void;
}

function RailButton({ label, icon, active = false, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-xl transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none",
        active
          ? "bg-brand-500/12 text-brand-600 dark:text-brand-300"
          : "text-subtle hover:bg-panel-2 hover:text-fg",
      )}
    >
      {active && <span className="absolute top-2.5 -left-3 h-5 w-1 rounded-r-full bg-brand-500" />}
      <Icon name={icon} size={19} />
    </button>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-xl bg-linear-135 from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/30",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" aria-hidden="true">
        <path
          d="M5 19 12 5l7 14M8.2 13.5h7.6"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const sections: Array<{ id: SidebarSection; label: string; icon: IconName }> = [
  { id: "collections", label: "Collections", icon: "folder" },
  { id: "history", label: "History", icon: "history" },
  { id: "environments", label: "Environments", icon: "globe" },
  { id: "protos", label: "Proto files (gRPC)", icon: "layers" },
];

export function NavRail() {
  const view = useWorkspace((s) => s.view);
  const sidebar = useWorkspace((s) => s.sidebar);
  const setView = useWorkspace((s) => s.setView);
  const showSection = useWorkspace((s) => s.showSection);
  const openDialog = useWorkspace((s) => s.openDialog);

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1.5 border-r border-line bg-panel py-3">
      <button
        type="button"
        aria-label="Home"
        onClick={() => setView("home")}
        className="mb-4 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
      >
        <Logo />
      </button>
      <RailButton
        label="Home"
        icon="home"
        active={view === "home"}
        onClick={() => setView("home")}
      />
      {sections.map((item) => (
        <RailButton
          key={item.id}
          label={item.label}
          icon={item.icon}
          active={view === "workspace" && sidebar === item.id}
          onClick={() => showSection(item.id)}
        />
      ))}

      <div className="mt-auto flex flex-col items-center gap-1.5">
        <RailButton
          label="Command palette (Ctrl+K)"
          icon="search"
          onClick={() => openDialog({ type: "palette" })}
        />
        <RailButton
          label="Import (Ctrl+O)"
          icon="import"
          onClick={() => openDialog({ type: "import" })}
        />
        <div
          title="Local workspace"
          className="mt-2 flex size-8 items-center justify-center rounded-full bg-panel-2 text-xs font-semibold text-muted ring-1 ring-line"
        >
          AQ
        </div>
      </div>
    </nav>
  );
}
