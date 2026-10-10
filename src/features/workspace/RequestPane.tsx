import { useState } from "react";
import { IconButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { SplitPane } from "@/components/ui/SplitPane";
import { findItem } from "@/core/tree";
import { type Tab, useWorkspace } from "@/store/workspace";
import { GrpcRequestEditor } from "./grpc/GrpcRequestEditor";
import { HttpRequestEditor } from "./http/HttpRequestEditor";
import { ResponsePanel } from "./response/ResponsePanel";

function Breadcrumb({ tab }: { tab: Tab }) {
  const collection = useWorkspace((s) =>
    s.collections.find((c) => c.id === tab.origin?.collectionId),
  );
  const updateRequest = useWorkspace((s) => s.updateRequest);
  const renameItem = useWorkspace((s) => s.renameItem);

  // Folder names between the collection and the request.
  const path: string[] = [];
  if (collection && tab.origin) {
    const walk = (items: typeof collection.items, trail: string[]): boolean =>
      items.some((item) => {
        if (item.id === tab.origin?.itemId) {
          path.push(...trail);
          return true;
        }
        return item.type === "folder" && walk(item.items, [...trail, item.name]);
      });
    walk(collection.items, []);
  }

  const commitName = (name: string) => {
    const trimmed = name.trim() || "Untitled request";
    if (tab.origin && collection && findItem(collection.items, tab.origin.itemId)) {
      renameItem(tab.origin.collectionId, tab.origin.itemId, trimmed);
    } else {
      updateRequest(tab.id, (r) => ({ ...r, name: trimmed }));
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5 px-4 pt-3 text-xs">
      {collection ? (
        <>
          <Icon name="folder" size={13} className="shrink-0 text-subtle" />
          <span className="shrink-0 text-subtle">{collection.name}</span>
          {path.map((p, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1.5 text-subtle">
              <Icon name="chevronRight" size={11} /> {p}
            </span>
          ))}
          <Icon name="chevronRight" size={11} className="shrink-0 text-subtle" />
        </>
      ) : (
        <span className="shrink-0 rounded bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          Unsaved
        </span>
      )}
      <input
        key={`${tab.id}:${tab.request.name}`}
        defaultValue={tab.request.name}
        aria-label="Request name"
        onBlur={(e) => e.target.value !== tab.request.name && commitName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = tab.request.name;
            e.currentTarget.blur();
          }
        }}
        className="min-w-0 flex-1 rounded px-1 py-0.5 font-medium outline-none hover:bg-panel-2 focus:bg-panel-2 focus:ring-1 focus:ring-brand-500/40"
      />
    </div>
  );
}

export function RequestPane({ tab }: { tab: Tab }) {
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");

  const editor =
    tab.request.kind === "http" ? (
      <HttpRequestEditor key={tab.id} tab={tab} request={tab.request} />
    ) : (
      <GrpcRequestEditor key={tab.id} tab={tab} request={tab.request} />
    );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-panel">
      <div className="flex items-center">
        <div className="min-w-0 flex-1">
          <Breadcrumb tab={tab} />
        </div>
        <IconButton
          icon={layout === "vertical" ? "columns" : "rows"}
          label={layout === "vertical" ? "Show response on the right" : "Show response below"}
          onClick={() => setLayout(layout === "vertical" ? "horizontal" : "vertical")}
          className="mt-3 mr-3"
        />
      </div>
      <SplitPane
        key={layout}
        direction={layout}
        initial={layout === "vertical" ? 0.5 : 0.52}
        className="flex-1"
        first={editor}
        second={<ResponsePanel tabId={tab.id} />}
      />
    </div>
  );
}
