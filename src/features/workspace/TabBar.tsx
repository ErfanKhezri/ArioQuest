import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { IconButton } from "@/components/ui/controls";
import { findItem, requestLabel } from "@/core/tree";
import { cn } from "@/lib/cn";
import { isTabDirty, type Tab, useWorkspace } from "@/store/workspace";

/** Renames the saved item when the tab has one, otherwise just the draft. */
function useRenameTab() {
  const collections = useWorkspace((s) => s.collections);
  const updateRequest = useWorkspace((s) => s.updateRequest);
  const renameItem = useWorkspace((s) => s.renameItem);
  return (tab: Tab, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tab.request.name) return;
    const origin = tab.origin;
    const collection = origin && collections.find((c) => c.id === origin.collectionId);
    if (origin && collection && findItem(collection.items, origin.itemId)) {
      renameItem(origin.collectionId, origin.itemId, trimmed);
    } else {
      updateRequest(tab.id, (r) => ({ ...r, name: trimmed }));
    }
  };
}

export function TabBar() {
  const { t } = useTranslation();
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const activateTab = useWorkspace((s) => s.activateTab);
  const closeTab = useWorkspace((s) => s.closeTab);
  const closeOtherTabs = useWorkspace((s) => s.closeOtherTabs);
  const duplicateTab = useWorkspace((s) => s.duplicateTab);
  const newTab = useWorkspace((s) => s.newTab);
  const running = useWorkspace((s) => s.running);
  const collections = useWorkspace((s) => s.collections);
  const renameTab = useRenameTab();
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-line">
      <div
        role="tablist"
        className="flex min-w-0 flex-1 [scrollbar-width:none] items-stretch overflow-x-auto"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const dirty = isTabDirty(tab);
          const collection = collections.find((c) => c.id === tab.origin?.collectionId);
          return (
            <Menu
              key={tab.id}
              align="start"
              items={[
                { label: t("actions.rename"), icon: "edit", onSelect: () => setRenaming(tab.id) },
                {
                  label: t("actions.duplicate"),
                  icon: "copy",
                  onSelect: () => duplicateTab(tab.id),
                },
                { label: t("actions.close"), icon: "x", onSelect: () => closeTab(tab.id) },
                {
                  label: t("tabs.closeOthers"),
                  icon: "x",
                  onSelect: () => closeOtherTabs(tab.id),
                },
              ]}
              trigger={({ toggle }) => (
                <div
                  role="tab"
                  aria-selected={active}
                  tabIndex={0}
                  title={
                    collection
                      ? `${collection.name} / ${tab.request.name}`
                      : t("tabs.unsaved", { name: tab.request.name })
                  }
                  onClick={() => activateTab(tab.id)}
                  onDoubleClick={() => setRenaming(tab.id)}
                  onKeyDown={(e) => e.key === "Enter" && activateTab(tab.id)}
                  onAuxClick={(e) => e.button === 1 && closeTab(tab.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggle(e);
                  }}
                  className={cn(
                    "group relative flex max-w-56 min-w-28 shrink-0 cursor-pointer items-center gap-2 border-e border-line ps-3 pe-1 text-sm",
                    active ? "bg-panel-2 text-fg" : "text-subtle hover:text-fg",
                  )}
                >
                  {active && <span className="absolute inset-x-0 top-0 h-px bg-accent" />}
                  <MethodBadge method={requestLabel(tab.request)} className="w-auto" />
                  {renaming === tab.id ? (
                    <input
                      autoFocus
                      defaultValue={tab.request.name}
                      aria-label={t("tabs.requestName")}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        renameTab(tab, e.target.value);
                        setRenaming(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="h-6 min-w-0 flex-1 rounded-sm border border-accent bg-panel px-1 outline-none"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{tab.request.name}</span>
                  )}
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    {running[tab.id] ? (
                      <span className="size-1.5 rounded-full bg-accent" />
                    ) : (
                      dirty && (
                        <span
                          className="size-1.5 rounded-full bg-subtle group-hover:hidden"
                          title={t("tabs.unsavedChanges")}
                        />
                      )
                    )}
                    <button
                      type="button"
                      aria-label={t("tabs.closeTab", { name: tab.request.name })}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className={cn(
                        "size-5 items-center justify-center rounded-sm text-subtle hover:bg-panel-2 hover:text-fg",
                        running[tab.id] || dirty ? "hidden group-hover:flex" : "flex",
                        !active && !running[tab.id] && !dirty && "invisible group-hover:visible",
                      )}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                </div>
              )}
            />
          );
        })}
        <Menu
          align="start"
          items={[
            { label: t("tabs.httpRequest"), icon: "globe", onSelect: () => newTab("http") },
            { label: t("tabs.grpcRequest"), icon: "server", onSelect: () => newTab("grpc") },
          ]}
          trigger={({ toggle }) => (
            <IconButton icon="plus" label={t("tabs.newTab")} onClick={toggle} className="m-1" />
          )}
        />
      </div>
    </div>
  );
}
