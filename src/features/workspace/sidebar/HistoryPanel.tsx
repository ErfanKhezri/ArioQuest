import { useMemo, useState } from "react";
import { EmptyState, IconButton } from "@/components/ui/controls";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { requestLabel, requestTarget } from "@/core/tree";
import type { HistoryEntry } from "@/core/types";
import { cn } from "@/lib/cn";
import { confirmAction } from "@/lib/confirm";
import { formatDuration } from "@/lib/files";
import { useWorkspace } from "@/store/workspace";
import { SidebarShell } from "./SidebarShell";

const historyTarget = (h: HistoryEntry) => requestTarget(h.request);

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function HistoryPanel() {
  const history = useWorkspace((s) => s.history);
  const openHistoryEntry = useWorkspace((s) => s.openHistoryEntry);
  const deleteHistoryEntry = useWorkspace((s) => s.deleteHistoryEntry);
  const clearHistory = useWorkspace((s) => s.clearHistory);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? history.filter((h) =>
          `${h.request.name} ${historyTarget(h)} ${h.summary.status}`
            .toLowerCase()
            .includes(needle),
        )
      : history;
    const out: Array<{ label: string; entries: HistoryEntry[] }> = [];
    for (const entry of filtered) {
      const label = dayLabel(entry.timestamp);
      const last = out[out.length - 1];
      if (last?.label === label) last.entries.push(entry);
      else out.push({ label, entries: [entry] });
    }
    return out;
  }, [history, query]);

  return (
    <SidebarShell
      title="History"
      actions={
        history.length > 0 && (
          <IconButton
            icon="trash"
            label="Clear history"
            tone="danger"
            onClick={async () => {
              if (await confirmAction("Clear all request history?")) clearHistory();
            }}
          />
        )
      }
      search={
        history.length
          ? { value: query, onChange: setQuery, placeholder: "Search history" }
          : undefined
      }
    >
      {history.length === 0 ? (
        <EmptyState title="No history yet">
          Every request you send is recorded here so you can reopen it later.
        </EmptyState>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="px-2 pb-2">
            <h3 className="px-2 pt-2 pb-1 text-xs font-medium text-subtle">{group.label}</h3>
            <ul>
              {group.entries.map((h) => (
                <li key={h.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openHistoryEntry(h.id)}
                    onKeyDown={(e) => e.key === "Enter" && openHistoryEntry(h.id)}
                    className="group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-panel-2"
                    title={historyTarget(h)}
                  >
                    <MethodBadge method={requestLabel(h.request)} className="w-10 text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs">
                        {historyTarget(h) || h.request.name}
                      </span>
                      <span className="flex gap-2 text-xs text-subtle">
                        <span className={cn(h.summary.ok ? "text-success" : "text-danger")}>
                          {h.summary.status}
                        </span>
                        {h.summary.timeMs !== undefined && (
                          <span>{formatDuration(h.summary.timeMs)}</span>
                        )}
                        <span>
                          {new Date(h.timestamp).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </span>
                    <IconButton
                      icon="x"
                      label="Remove from history"
                      size={12}
                      className="hidden size-6 group-hover:inline-flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoryEntry(h.id);
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </SidebarShell>
  );
}
