import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EmptyState, IconButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { newGrpcRequest, newHttpRequest } from "@/core/factory";
import { exportNative, exportCollectionV2 } from "@/core/importers";
import { countRequests, requestLabel } from "@/core/tree";
import type { Collection, CollectionItem } from "@/core/types";
import { cn } from "@/lib/cn";
import { confirmAction } from "@/lib/confirm";
import { safeFileName, saveTextFile } from "@/lib/files";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";
import { RenameInput, SidebarShell } from "./SidebarShell";

const rowClass =
  "group flex h-8 w-full cursor-pointer items-center gap-2 rounded-md pe-1 text-start text-sm hover:bg-panel-2";

/** Returns items matching the filter, keeping folders that contain matches. */
function filterItems(items: CollectionItem[], needle: string): CollectionItem[] {
  if (!needle) return items;
  return items.flatMap((item): CollectionItem[] => {
    if (item.type === "request") {
      const r = item.request;
      const haystack = `${r.name} ${r.kind === "http" ? `${r.method} ${r.url}` : `${r.target} ${r.method}`}`;
      return haystack.toLowerCase().includes(needle) ? [item] : [];
    }
    if (item.name.toLowerCase().includes(needle)) return [item];
    const children = filterItems(item.items, needle);
    return children.length ? [{ ...item, items: children }] : [];
  });
}

export function CollectionsPanel() {
  const { t } = useTranslation();
  const collections = useWorkspace((s) => s.collections);
  const createCollection = useWorkspace((s) => s.createCollection);
  const openDialog = useWorkspace((s) => s.openDialog);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const newCollection = () => {
    const id = createCollection(t("defaults.newCollection"));
    setRenaming(id);
  };

  return (
    <SidebarShell
      title={t("collections.title")}
      actions={
        <>
          <IconButton
            icon="import"
            label={t("actions.import")}
            onClick={() => openDialog({ type: "import" })}
          />
          <IconButton icon="plus" label={t("collections.newCollection")} onClick={newCollection} />
        </>
      }
      search={
        collections.length
          ? { value: query, onChange: setQuery, placeholder: t("collections.filter") }
          : undefined
      }
    >
      {collections.length === 0 ? (
        <EmptyState title={t("collections.emptyTitle")}>
          {t("collections.emptyBody")}
          <div className="mt-3 flex justify-center gap-3">
            <button
              type="button"
              onClick={newCollection}
              className="font-medium text-accent hover:underline"
            >
              {t("collections.create")}
            </button>
            <button
              type="button"
              onClick={() => openDialog({ type: "import" })}
              className="font-medium text-accent hover:underline"
            >
              {t("actions.import")}
            </button>
          </div>
        </EmptyState>
      ) : (
        <ul className="px-1">
          {collections.map((c) => {
            const items = filterItems(c.items, needle);
            if (needle && items.length === 0 && !c.name.toLowerCase().includes(needle)) return null;
            return (
              <CollectionNode
                key={c.id}
                collection={c}
                items={items}
                open={!collapsed.has(c.id) || !!needle}
                collapsed={collapsed}
                toggle={toggle}
                renaming={renaming}
                setRenaming={setRenaming}
              />
            );
          })}
        </ul>
      )}
    </SidebarShell>
  );
}

interface NodeProps {
  collapsed: Set<string>;
  toggle: (id: string) => void;
  renaming: string | null;
  setRenaming: (id: string | null) => void;
}

function CollectionNode({
  collection,
  items,
  open,
  ...shared
}: NodeProps & { collection: Collection; items: CollectionItem[]; open: boolean }) {
  const { t } = useTranslation();
  const store = useWorkspace.getState;
  const { toggle, renaming, setRenaming } = shared;

  const exportAs = async (format: "native" | "v2") => {
    const contents =
      format === "native"
        ? exportNative({ collections: [collection] })
        : exportCollectionV2(collection);
    const suffix = format === "native" ? "arioquest" : "collection_v2.1";
    try {
      if (await saveTextFile(`${safeFileName(collection.name)}.${suffix}.json`, contents))
        notify.success(t("collections.exported"));
    } catch (err) {
      notify.error(
        t("collections.exportFailed", { error: err instanceof Error ? err.message : String(err) }),
      );
    }
  };

  const menu: MenuItem[] = [
    {
      label: t("collections.addHttp"),
      icon: "globe",
      onSelect: () => store().addRequestTo(collection.id, null, newHttpRequest()),
    },
    {
      label: t("collections.addGrpc"),
      icon: "server",
      onSelect: () => store().addRequestTo(collection.id, null, newGrpcRequest()),
    },
    {
      label: t("collections.addFolder"),
      icon: "folderPlus",
      onSelect: () => setRenaming(store().addFolder(collection.id, null, t("defaults.newFolder"))),
    },
    {
      label: t("collections.run"),
      icon: "play",
      separatorBefore: true,
      onSelect: () => store().openDialog({ type: "runner", collectionId: collection.id }),
    },
    {
      label: t("actions.rename"),
      icon: "edit",
      separatorBefore: true,
      onSelect: () => setRenaming(collection.id),
    },
    {
      label: t("actions.duplicate"),
      icon: "copy",
      onSelect: () => store().duplicateCollection(collection.id),
    },
    {
      label: t("collections.exportNative"),
      icon: "download",
      onSelect: () => void exportAs("native"),
    },
    { label: t("collections.exportV2"), icon: "download", onSelect: () => void exportAs("v2") },
    {
      label: t("actions.delete"),
      icon: "trash",
      danger: true,
      separatorBefore: true,
      onSelect: async () => {
        if (await confirmAction(t("collections.deleteConfirm", { name: collection.name }))) {
          store().deleteCollection(collection.id);
        }
      },
    },
  ];

  return (
    <li>
      <div className={cn(rowClass, "ps-1 font-medium")} onClick={() => toggle(collection.id)}>
        <Icon
          name={open ? "chevronDown" : "chevronRight"}
          size={13}
          className="shrink-0 text-subtle"
        />
        <Icon name="folder" size={14} className="shrink-0 text-subtle" />
        {renaming === collection.id ? (
          <RenameInput
            initial={collection.name}
            onDone={(name) => {
              if (name) store().updateCollection(collection.id, { name });
              setRenaming(null);
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{collection.name}</span>
        )}
        <span className="text-xs text-subtle group-hover:hidden">
          {countRequests(collection.items)}
        </span>
        <IconButton
          icon="play"
          label={t("collections.run")}
          size={12}
          className="hidden size-6 group-hover:inline-flex"
          onClick={(e) => {
            e.stopPropagation();
            store().openDialog({ type: "runner", collectionId: collection.id });
          }}
        />
        <Menu
          items={menu}
          trigger={({ toggle: toggleMenu }) => (
            <IconButton
              icon="dots"
              label={t("collections.actions")}
              size={14}
              className="hidden size-6 group-hover:inline-flex"
              onClick={toggleMenu}
            />
          )}
        />
      </div>
      {open && <ItemList collectionId={collection.id} items={items} depth={1} {...shared} />}
      {open && items.length === 0 && (
        <p className="py-2 ps-9 text-xs text-subtle">
          <Trans
            i18nKey="collections.empty"
            components={{
              add: (
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => store().addRequestTo(collection.id, null, newHttpRequest())}
                />
              ),
            }}
          />
        </p>
      )}
    </li>
  );
}

function ItemList({
  collectionId,
  items,
  depth,
  ...shared
}: NodeProps & { collectionId: string; items: CollectionItem[]; depth: number }) {
  return (
    <ul>
      {items.map((item) => (
        <ItemNode key={item.id} collectionId={collectionId} item={item} depth={depth} {...shared} />
      ))}
    </ul>
  );
}

function ItemNode({
  collectionId,
  item,
  depth,
  ...shared
}: NodeProps & { collectionId: string; item: CollectionItem; depth: number }) {
  const { t } = useTranslation();
  const store = useWorkspace.getState;
  const activeItemId = useWorkspace(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.origin?.itemId,
  );
  const { collapsed, toggle, renaming, setRenaming } = shared;
  const indent = { paddingInlineStart: `${depth * 14 + 4}px` };

  const remove = async () => {
    const question =
      item.type === "folder"
        ? t("collections.deleteFolderConfirm", { name: item.name })
        : t("collections.deleteRequestConfirm", { name: item.request.name });
    if (await confirmAction(question)) store().deleteItem(collectionId, item.id);
  };

  if (item.type === "folder") {
    const open = !collapsed.has(item.id);
    const menu: MenuItem[] = [
      {
        label: t("collections.addHttp"),
        icon: "globe",
        onSelect: () => store().addRequestTo(collectionId, item.id, newHttpRequest()),
      },
      {
        label: t("collections.addGrpc"),
        icon: "server",
        onSelect: () => store().addRequestTo(collectionId, item.id, newGrpcRequest()),
      },
      {
        label: t("collections.addFolder"),
        icon: "folderPlus",
        onSelect: () =>
          setRenaming(store().addFolder(collectionId, item.id, t("defaults.newFolder"))),
      },
      {
        label: t("collections.runFolder"),
        icon: "play",
        separatorBefore: true,
        onSelect: () => store().openDialog({ type: "runner", collectionId, folderId: item.id }),
      },
      {
        label: t("actions.rename"),
        icon: "edit",
        separatorBefore: true,
        onSelect: () => setRenaming(item.id),
      },
      {
        label: t("actions.duplicate"),
        icon: "copy",
        onSelect: () => store().duplicateItem(collectionId, item.id),
      },
      {
        label: t("actions.delete"),
        icon: "trash",
        danger: true,
        separatorBefore: true,
        onSelect: () => void remove(),
      },
    ];
    return (
      <li>
        <div className={rowClass} style={indent} onClick={() => toggle(item.id)}>
          <Icon
            name={open ? "chevronDown" : "chevronRight"}
            size={12}
            className="shrink-0 text-subtle"
          />
          <Icon name="folder" size={13} className="shrink-0 text-subtle" />
          {renaming === item.id ? (
            <RenameInput
              initial={item.name}
              onDone={(name) => {
                if (name) store().renameItem(collectionId, item.id, name);
                setRenaming(null);
              }}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
          )}
          <Menu
            items={menu}
            trigger={({ toggle: toggleMenu }) => (
              <IconButton
                icon="dots"
                label={t("collections.folderActions")}
                size={14}
                className="hidden size-6 group-hover:inline-flex"
                onClick={toggleMenu}
              />
            )}
          />
        </div>
        {open && (
          <ItemList collectionId={collectionId} items={item.items} depth={depth + 1} {...shared} />
        )}
      </li>
    );
  }

  const r = item.request;
  const menu: MenuItem[] = [
    {
      label: t("actions.open"),
      icon: "arrowRight",
      onSelect: () => store().openCollectionRequest(collectionId, item.id),
    },
    { label: t("actions.rename"), icon: "edit", onSelect: () => setRenaming(item.id) },
    {
      label: t("actions.duplicate"),
      icon: "copy",
      onSelect: () => store().duplicateItem(collectionId, item.id),
    },
    {
      label: t("actions.delete"),
      icon: "trash",
      danger: true,
      separatorBefore: true,
      onSelect: () => void remove(),
    },
  ];
  return (
    <li>
      <div
        className={cn(rowClass, activeItemId === item.id && "bg-panel-2 hover:bg-panel-2")}
        style={indent}
        onClick={() => store().openCollectionRequest(collectionId, item.id)}
        title={r.kind === "http" ? r.url : `${r.target} ${r.method}`}
      >
        <span className="w-3 shrink-0" />
        <MethodBadge method={requestLabel(r)} className="w-10 text-xs" />
        {renaming === item.id ? (
          <RenameInput
            initial={r.name}
            onDone={(name) => {
              if (name) store().renameItem(collectionId, item.id, name);
              setRenaming(null);
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{r.name}</span>
        )}
        <Menu
          items={menu}
          trigger={({ toggle: toggleMenu }) => (
            <IconButton
              icon="dots"
              label={t("collections.requestActions")}
              size={14}
              className="hidden size-6 group-hover:inline-flex"
              onClick={toggleMenu}
            />
          )}
        />
      </div>
    </li>
  );
}
