import { Icon } from "@/components/ui/Icon";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { recentRequests } from "./data";

interface RecentRequestsProps {
  query: string;
}

export function RecentRequests({ query }: RecentRequestsProps) {
  const needle = query.trim().toLowerCase();
  const items = needle
    ? recentRequests.filter((r) =>
        [r.name, r.url, r.collection, r.method].some((f) => f.toLowerCase().includes(needle)),
      )
    : recentRequests;

  return (
    <section className="flex flex-col rounded-2xl border border-line bg-panel">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-sm font-semibold">Recent requests</h2>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-subtle transition-colors hover:text-fg"
        >
          View history
          <Icon name="chevronRight" size={13} />
        </button>
      </header>

      {items.length === 0 ? (
        <p className="px-5 pt-6 pb-8 text-center text-sm text-subtle">
          No requests match “{query.trim()}”.
        </p>
      ) : (
        <ul className="px-2 pb-2">
          {items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none"
              >
                <MethodBadge method={r.method} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate font-mono text-[11px] text-subtle">{r.url}</span>
                </span>
                <span className="hidden shrink-0 rounded-md bg-panel-2 px-2 py-0.5 text-[11px] text-muted group-hover:bg-panel md:inline">
                  {r.collection}
                </span>
                <span className="w-16 shrink-0 text-right text-[11px] text-subtle">{r.time}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
