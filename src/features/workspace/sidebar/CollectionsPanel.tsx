import { useState } from "react";
import { EmptyState, IconButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { newGrpcRequest, newHttpRequest } from "@/core/factory";
import { exportNative, exportPostman } from "@/core/importers";
import { countRequests, requestLabel } from "@/core/tree";
import type { Collection, CollectionItem } from "@/core/types";
import { cn } from "@/lib/cn";
import { confirmAction } from "@/lib/confirm";
import { safeFileName, saveTextFile } from "@/lib/files";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";
import { RenameInput, SidebarShell } from "./SidebarShell";

const rowClass =
  "group flex h-8 w-full cursor-pointer items-center gap-2 rounded-md pr-1 text-left text-sm hover:bg-panel-2";

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
    const id = createCollection("New collection");
    setRenaming(id);
  };

  return (
    <SidebarShell
      title="Collections"
      actions={
        <>
          <IconButton icon="import" label="Import" onClick={() => openDialog({ type: "import" })} />
          <IconButton icon="plus" label="New collection" onClick={newCollection} />
        </>
      }
      search={
        collections.length
          ? { value: query, onChange: setQuery, placeholder: "Filter requests" }
          : undefined
      }
    >
      {collections.length === 0 ? (
        <EmptyState title="No collections yet">
          Group requests into collections to save them, run them together and export them.
          <div className="mt-3 flex justify-center gap-3">
            <button
              type="button"
              onClick={newCollection}
              className="font-medium text-accent hover:underline"
            >
              Create collection
            </button>
            <button
              type="button"
              onClick={() => openDialog({ type: "import" })}
              className="font-medium text-accent hover:underline"
            >
              Import
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
  const store = useWorkspace.getState;
  const { toggle, renaming, setRenaming } = shared;

  const exportAs = async (format: "native" | "postman") => {
    const contents =
      format === "native" ? exportNative({ collections: [collection] }) : exportPostman(collection);
    const suffix = format === "native" ? "arioquest" : "postman_collection";
    try {
      if (await saveTextFile(`${safeFileName(collection.name)}.${suffix}.json`, contents))
        notify.success("Collection exported.");
    } catch (err) {
      notify.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const menu: MenuItem[] = [
    {
      label: "Add HTTP request",
      icon: "globe",
      onSelect: () => store().addRequestTo(collection.id, null, newHttpRequest()),
    },
    {
      label: "Add gRPC request",
      icon: "server",
      onSelect: () => store().addRequestTo(collection.id, null, newGrpcRequest()),
    },
    {
      label: "Add folder",
      icon: "folderPlus",
      onSelect: () => setRenaming(store().addFolder(collection.id, null, "New folder")),
    },
    {
      label: "Run collection",
      icon: "play",
      separatorBefore: true,
      onSelect: () => store().openDialog({ type: "runner", collectionId: collection.id }),
    },
    {
      label: "Rename",
      icon: "edit",
      separatorBefore: true,
      onSelect: () => setRenaming(collection.id),
    },
    {
      label: "Duplicate",
      icon: "copy",
      onSelect: () => store().duplicateCollection(collection.id),
    },
    { label: "Export (ArioQuest)", icon: "download", onSelect: () => void exportAs("native") },
    { label: "Export (Postman v2.1)", icon: "download", onSelect: () => void exportAs("postman") },
    {
      label: "Delete",
      icon: "trash",
      danger: true,
      separatorBefore: true,
      onSelect: async () => {
        if (
          await confirmAction(`Delete the collection "${collection.name}" and all its requests?`)
        ) {
          store().deleteCollection(collection.id);
        }
      },
    },
  ];

  return (
    <li>
      <div className={cn(rowClass, "pl-1 font-medium")} onClick={() => toggle(collection.id)}>
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
          label="Run collection"
          size={12}
          className="hidden size-6 group-hover:inline-flex"
          onClick={(e) => {
            e.stopPropagation();
            store().openDialog({ type: "runner", collectionId: collection.id });
          }}
        />
        <Menu
          items={menu}
          trigger={({ toggle: t }) => (
            <IconButton
              icon="dots"
              label="Collection actions"
              size={14}
              className="hidden size-6 group-hover:inline-flex"
              onClick={t}
            />
          )}
        />
      </div>
      {open && <ItemList collectionId={collection.id} items={items} depth={1} {...shared} />}
      {open && items.length === 0 && (
        <p className="py-2 pl-9 text-xs text-subtle">
          Empty —{" "}
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={() => store().addRequestTo(collection.id, null, newHttpRequest())}
          >
            add a request
          </button>
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
  const store = useWorkspace.getState;
  const activeItemId = useWorkspace(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.origin?.itemId,
  );
  const { collapsed, toggle, renaming, setRenaming } = shared;
  const indent = { paddingLeft: `${depth * 14 + 4}px` };

  const remove = async () => {
    const what =
      item.type === "folder"
        ? `the folder "${item.name}" and its contents`
        : `"${item.request.name}"`;
    if (await confirmAction(`Delete ${what}?`)) store().deleteItem(collectionId, item.id);
  };

  if (item.type === "folder") {
    const open = !collapsed.has(item.id);
    const menu: MenuItem[] = [
      {
        label: "Add HTTP request",
        icon: "globe",
        onSelect: () => store().addRequestTo(collectionId, item.id, newHttpRequest()),
      },
      {
        label: "Add gRPC request",
        icon: "server",
        onSelect: () => store().addRequestTo(collectionId, item.id, newGrpcRequest()),
      },
      {
        label: "Add folder",
        icon: "folderPlus",
        onSelect: () => setRenaming(store().addFolder(collectionId, item.id, "New folder")),
      },
      {
        label: "Run folder",
        icon: "play",
        separatorBefore: true,
        onSelect: () => store().openDialog({ type: "runner", collectionId, folderId: item.id }),
      },
      {
        label: "Rename",
        icon: "edit",
        separatorBefore: true,
        onSelect: () => setRenaming(item.id),
      },
      {
        label: "Duplicate",
        icon: "copy",
        onSelect: () => store().duplicateItem(collectionId, item.id),
      },
      {
        label: "Delete",
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
            trigger={({ toggle: t }) => (
              <IconButton
                icon="dots"
                label="Folder actions"
                size={14}
                className="hidden size-6 group-hover:inline-flex"
                onClick={t}
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
      label: "Open",
      icon: "arrowRight",
      onSelect: () => store().openCollectionRequest(collectionId, item.id),
    },
    { label: "Rename", icon: "edit", onSelect: () => setRenaming(item.id) },
    {
      label: "Duplicate",
      icon: "copy",
      onSelect: () => store().duplicateItem(collectionId, item.id),
    },
    {
      label: "Delete",
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
          trigger={({ toggle: t }) => (
            <IconButton
              icon="dots"
              label="Request actions"
              size={14}
              className="hidden size-6 group-hover:inline-flex"
              onClick={t}
            />
          )}
        />
      </div>
    </li>
  );
}
