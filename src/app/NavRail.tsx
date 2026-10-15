import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { type SidebarSection, useWorkspace } from "@/store/workspace";

function RailButton({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex size-8 items-center justify-center rounded-md",
        "focus-visible:outline-2 focus-visible:outline-accent",
        active ? "text-fg" : "text-subtle hover:text-fg",
      )}
    >
      {active && <span className="absolute top-1.5 -left-2 h-5 w-0.5 rounded-full bg-accent" />}
      <Icon name={icon} size={18} />
    </button>
  );
}

const sections: Array<{ id: SidebarSection; label: string; icon: IconName }> = [
  { id: "collections", label: "Collections", icon: "folder" },
  { id: "environments", label: "Environments", icon: "globe" },
  { id: "history", label: "History", icon: "history" },
  { id: "protos", label: "Proto files", icon: "layers" },
];

interface NavRailProps {
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
}

export function NavRail({ sidebarOpen, onSidebarOpenChange }: NavRailProps) {
  const sidebar = useWorkspace((s) => s.sidebar);
  const showSection = useWorkspace((s) => s.showSection);
  const openDialog = useWorkspace((s) => s.openDialog);
  const [theme, setTheme] = useState(document.documentElement.dataset.theme ?? "dark");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("aq-theme", next);
    setTheme(next);
  };

  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-2">
      {sections.map((item) => {
        const active = sidebarOpen && sidebar === item.id;
        return (
          <RailButton
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={active}
            // Clicking the open section again collapses the sidebar.
            onClick={() => {
              if (active) onSidebarOpenChange(false);
              else {
                showSection(item.id);
                onSidebarOpenChange(true);
              }
            }}
          />
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1">
        <RailButton
          label="Search (Ctrl+K)"
          icon="search"
          onClick={() => openDialog({ type: "palette" })}
        />
        <RailButton
          label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          icon={theme === "dark" ? "sun" : "moon"}
          onClick={toggleTheme}
        />
      </div>
    </nav>
  );
}
