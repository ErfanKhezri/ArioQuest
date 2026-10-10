import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { IconButton } from "@/components/ui/controls";
import { requestLabel } from "@/core/tree";
import { cn } from "@/lib/cn";
import { isTabDirty, useWorkspace } from "@/store/workspace";
import { EnvironmentPicker } from "./EnvironmentPicker";

export function TabBar() {
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const activateTab = useWorkspace((s) => s.activateTab);
  const closeTab = useWorkspace((s) => s.closeTab);
  const closeOtherTabs = useWorkspace((s) => s.closeOtherTabs);
  const duplicateTab = useWorkspace((s) => s.duplicateTab);
  const newTab = useWorkspace((s) => s.newTab);
  const running = useWorkspace((s) => s.running);

  return (
    <div className="flex h-10 shrink-0 items-end border-b border-line bg-panel-2/60 pl-2">
      <div
        role="tablist"
        className="flex min-w-0 flex-1 [scrollbar-width:none] items-end gap-0.5 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const dirty = isTabDirty(tab);
          return (
            <Menu
              key={tab.id}
              align="start"
              items={[
                { label: "Duplicate", icon: "copy", onSelect: () => duplicateTab(tab.id) },
                { label: "Close tab", icon: "x", onSelect: () => closeTab(tab.id) },
                { label: "Close other tabs", icon: "x", onSelect: () => closeOtherTabs(tab.id) },
              ]}
              trigger={({ toggle }) => (
                <div
                  role="tab"
                  aria-selected={active}
                  tabIndex={0}
                  title={tab.request.name}
                  onClick={() => activateTab(tab.id)}
                  onKeyDown={(e) => e.key === "Enter" && activateTab(tab.id)}
                  onAuxClick={(e) => e.button === 1 && closeTab(tab.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggle(e);
                  }}
                  className={cn(
                    "group relative flex h-8 max-w-56 min-w-32 shrink-0 cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 text-xs transition-colors",
                    active
                      ? "border-line bg-panel text-fg"
                      : "border-transparent text-subtle hover:bg-panel/60 hover:text-fg",
                  )}
                >
                  {active && <span className="absolute inset-x-0 -bottom-px h-px bg-panel" />}
                  <MethodBadge method={requestLabel(tab.request)} className="w-auto text-[10px]" />
                  <span className="min-w-0 flex-1 truncate">{tab.request.name}</span>
                  {running[tab.id] ? (
                    <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-brand-500" />
                  ) : (
                    dirty && (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-amber-500 group-hover:hidden"
                        title="Unsaved changes"
                      />
                    )
                  )}
                  <button
                    type="button"
                    aria-label={`Close ${tab.request.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className={cn(
                      "-mr-1 hidden size-5 shrink-0 items-center justify-center rounded text-subtle group-hover:flex hover:bg-panel-2 hover:text-fg",
                      active && !dirty && "flex",
                    )}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              )}
            />
          );
        })}
        <Menu
          align="start"
          items={[
            { label: "HTTP request", icon: "globe", onSelect: () => newTab("http") },
            { label: "gRPC request", icon: "server", onSelect: () => newTab("grpc") },
          ]}
          trigger={({ toggle }) => (
            <IconButton
              icon="plus"
              label="New tab (Ctrl+N)"
              onClick={toggle}
              className="mb-1 ml-1"
            />
          )}
        />
      </div>
      <div className="flex h-full shrink-0 items-center px-3">
        <EnvironmentPicker />
      </div>
    </div>
  );
}
