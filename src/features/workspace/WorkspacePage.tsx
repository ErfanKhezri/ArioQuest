import { Kbd } from "@/components/ui/Kbd";
import { Ario } from "@/components/ui/Ario";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { requestLabel, requestTarget } from "@/core/tree";
import { useWorkspace } from "@/store/workspace";
import { RequestPane } from "./RequestPane";
import { CollectionsPanel } from "./sidebar/CollectionsPanel";
import { EnvironmentsPanel } from "./sidebar/EnvironmentsPanel";
import { HistoryPanel } from "./sidebar/HistoryPanel";
import { ProtosPanel } from "./sidebar/ProtosPanel";
import { TabBar } from "./TabBar";
import { useActiveTab } from "./hooks";

function Sidebar() {
  const section = useWorkspace((s) => s.sidebar);
  switch (section) {
    case "collections":
      return <CollectionsPanel />;
    case "history":
      return <HistoryPanel />;
    case "environments":
      return <EnvironmentsPanel />;
    case "protos":
      return <ProtosPanel />;
  }
}

const quickActions = [
  { label: "New HTTP request", keys: ["Ctrl", "N"], run: "http" },
  { label: "New gRPC request", keys: [], run: "grpc" },
  { label: "Import collection or cURL", keys: ["Ctrl", "O"], run: "import" },
  { label: "Search everything", keys: ["Ctrl", "K"], run: "palette" },
] as const;

/** Shown when no tab is open: a few quick actions and the latest requests. */
function NoTabs() {
  const newTab = useWorkspace((s) => s.newTab);
  const openDialog = useWorkspace((s) => s.openDialog);
  const openHistoryEntry = useWorkspace((s) => s.openHistoryEntry);
  const history = useWorkspace((s) => s.history);

  const run = (action: (typeof quickActions)[number]["run"]) => {
    if (action === "http" || action === "grpc") newTab(action);
    else openDialog({ type: action });
  };

  return (
    <div className="flex flex-1 justify-center overflow-y-auto bg-canvas p-4">
      <div className="mt-[12vh] w-full max-w-md">
        <div className="flex items-center gap-3">
          <Ario />
          <p className="text-sm text-muted">No open requests</p>
        </div>

        <ul className="mt-4">
          {quickActions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => run(a.run)}
                className="flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-sm hover:bg-panel-2"
              >
                {a.label}
                <span className="flex gap-1">
                  {a.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {history.length > 0 && (
          <>
            <h3 className="mt-4 px-2 pb-1 text-xs text-subtle">Recent</h3>
            <ul>
              {history.slice(0, 6).map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => openHistoryEntry(h.id)}
                    title={requestTarget(h.request)}
                    className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-panel-2"
                  >
                    <MethodBadge method={requestLabel(h.request)} />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {requestTarget(h.request) || h.request.name}
                    </span>
                    <span className="text-xs text-subtle">{h.summary.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export function WorkspacePage({ sidebarOpen }: { sidebarOpen: boolean }) {
  const tab = useActiveTab();
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {sidebarOpen && <Sidebar />}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TabBar />
        {tab ? <RequestPane key={tab.id} tab={tab} /> : <NoTabs />}
      </div>
    </div>
  );
}
