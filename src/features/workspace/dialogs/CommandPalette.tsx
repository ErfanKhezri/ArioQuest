import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { MethodBadge, type HttpMethod } from "@/components/ui/MethodBadge";
import { Modal } from "@/components/ui/Modal";
import { flattenRequests, requestLabel, requestTarget } from "@/core/tree";
import { cn } from "@/lib/cn";
import { invokeCommand } from "@/lib/tauri";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  icon?: IconName;
  method?: HttpMethod;
  run: () => void;
}

export function CommandPalette() {
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const collections = useWorkspace((s) => s.collections);
  const history = useWorkspace((s) => s.history);
  const environments = useWorkspace((s) => s.environments);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const s = useWorkspace.getState();
    const actions: Command[] = [
      {
        id: "new-http",
        title: "New HTTP request",
        group: "Actions",
        icon: "globe",
        run: () => s.newTab("http"),
      },
      {
        id: "new-grpc",
        title: "New gRPC request",
        group: "Actions",
        icon: "server",
        run: () => s.newTab("grpc"),
      },
      {
        id: "import",
        title: "Import collection, environment or cURL",
        group: "Actions",
        icon: "import",
        run: () => s.openDialog({ type: "import" }),
      },
      {
        id: "protos",
        title: "Import .proto files",
        group: "Actions",
        icon: "file",
        run: () => s.openDialog({ type: "protoSet" }),
      },
      {
        id: "globals",
        title: "Edit global variables",
        group: "Actions",
        icon: "globe",
        run: () => s.openDialog({ type: "environment", environmentId: "globals" }),
      },
      {
        id: "settings",
        title: "Editor theme and settings",
        group: "Actions",
        icon: "palette",
        run: () => s.openDialog({ type: "settings" }),
      },
      {
        id: "cookies",
        title: "Clear cookies",
        group: "Actions",
        icon: "trash",
        run: () =>
          void invokeCommand("clear_cookies").then(() => notify.success("Cookie jar cleared.")),
      },
    ];
    const runs: Command[] = collections.map((c) => ({
      id: `run-${c.id}`,
      title: `Run collection: ${c.name}`,
      group: "Actions",
      icon: "play",
      run: () => s.openDialog({ type: "runner", collectionId: c.id }),
    }));
    const envs: Command[] = [
      {
        id: "env-none",
        title: "Use no environment",
        group: "Environments",
        icon: "globe",
        run: () => s.setActiveEnvironment(null),
      },
      ...environments.map((e) => ({
        id: `env-${e.id}`,
        title: `Use environment: ${e.name}`,
        group: "Environments",
        icon: "globe" as const,
        run: () => s.setActiveEnvironment(e.id),
      })),
    ];
    const requests: Command[] = collections.flatMap((c) =>
      flattenRequests(c.items).map(({ item, path }) => ({
        id: `req-${item.id}`,
        title: item.request.name,
        subtitle: [c.name, ...path].join(" / "),
        group: "Requests",
        method: requestLabel(item.request),
        run: () => s.openCollectionRequest(c.id, item.id),
      })),
    );
    const recent: Command[] = history.slice(0, 30).map((h) => ({
      id: `hist-${h.id}`,
      title: requestTarget(h.request) || h.request.name,
      subtitle: `${h.summary.status} · ${new Date(h.timestamp).toLocaleString()}`,
      group: "History",
      method: requestLabel(h.request),
      run: () => s.openHistoryEntry(h.id),
    }));
    return [...requests, ...actions, ...runs, ...envs, ...recent];
  }, [collections, history, environments]);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return commands.filter((c) => c.group !== "History").slice(0, 50);
    return commands
      .filter((c) => {
        const text = `${c.title} ${c.subtitle ?? ""} ${c.method ?? ""}`.toLowerCase();
        return terms.every((t) => text.includes(t));
      })
      .slice(0, 50);
  }, [commands, query]);

  const choose = (command: Command | undefined) => {
    if (!command) return;
    closeDialog();
    command.run();
  };

  let lastGroup = "";
  return (
    <Modal title="Command palette" bare onClose={closeDialog} className="max-w-xl">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Icon name="search" size={16} className="text-subtle" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(results[index]);
            }
          }}
          placeholder="Search requests, history and actions…"
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-subtle">Nothing matches “{query}”.</li>
        )}
        {results.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          return (
            <li key={c.id}>
              {header && <p className="px-3 pt-2 pb-1 text-xs font-medium text-subtle">{header}</p>}
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(c)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs",
                  i === index ? "bg-panel-2 text-fg" : "text-muted",
                )}
              >
                {c.method ? (
                  <MethodBadge method={c.method} className="w-10 text-xs" />
                ) : (
                  <Icon
                    name={c.icon ?? "arrowRight"}
                    size={15}
                    className="w-10 shrink-0 text-subtle"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fg">{c.title}</span>
                  {c.subtitle && (
                    <span className="block truncate text-xs text-subtle">{c.subtitle}</span>
                  )}
                </span>
                {i === index && <Icon name="arrowRight" size={13} className="text-subtle" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
