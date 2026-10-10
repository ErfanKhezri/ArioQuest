import { Icon } from "@/components/ui/Icon";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { requestLabel, requestTarget } from "@/core/tree";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/store/workspace";

interface RecentRequestsProps {
  query: string;
}

function relativeTime(ts: number): string {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export function RecentRequests({ query }: RecentRequestsProps) {
  const history = useWorkspace((s) => s.history);
  const openHistoryEntry = useWorkspace((s) => s.openHistoryEntry);
  const showSection = useWorkspace((s) => s.showSection);
  const newTab = useWorkspace((s) => s.newTab);

  const needle = query.trim().toLowerCase();
  const recent = history.slice(0, 50);
  const items = (
    needle
      ? recent.filter((h) =>
          [h.request.name, requestTarget(h.request), requestLabel(h.request)].some((f) =>
            f.toLowerCase().includes(needle),
          ),
        )
      : recent
  ).slice(0, 6);

  return (
    <section className="flex flex-col rounded-2xl border border-line bg-panel">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-sm font-semibold">Recent requests</h2>
        <button
          type="button"
          onClick={() => showSection("history")}
          className="flex items-center gap-1 text-xs text-subtle transition-colors hover:text-fg"
        >
          View history
          <Icon name="chevronRight" size={13} />
        </button>
      </header>

      {history.length === 0 ? (
        <div className="px-5 pt-4 pb-8 text-center text-sm text-subtle">
          Nothing sent yet.{" "}
          <button
            type="button"
            onClick={() => newTab("http")}
            className="font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            Send your first request
          </button>{" "}
          or open the “Getting started” collection.
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 pt-6 pb-8 text-center text-sm text-subtle">
          No requests match “{query.trim()}”.
        </p>
      ) : (
        <ul className="px-2 pb-2">
          {items.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => openHistoryEntry(h.id)}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none"
              >
                <MethodBadge method={requestLabel(h.request)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{h.request.name}</span>
                  <span className="block truncate font-mono text-[11px] text-subtle">
                    {requestTarget(h.request)}
                  </span>
                </span>
                <span
                  className={cn(
                    "hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] md:inline",
                    h.summary.ok
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-500",
                  )}
                >
                  {h.summary.status}
                </span>
                <span className="w-16 shrink-0 text-right text-[11px] text-subtle">
                  {relativeTime(h.timestamp)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
