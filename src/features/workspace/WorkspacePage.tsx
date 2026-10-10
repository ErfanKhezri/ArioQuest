import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
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

function NoTabs() {
  const newTab = useWorkspace((s) => s.newTab);
  const openDialog = useWorkspace((s) => s.openDialog);
  return (
    <div className="flex flex-1 items-center justify-center bg-panel p-8">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
          <Icon name="send" size={22} />
        </span>
        <h2 className="mt-4 text-base font-semibold">No open requests</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Open one from a collection or history, or start a new HTTP or gRPC request.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={() => newTab("http")}>
            <Icon name="globe" size={14} /> HTTP request
          </Button>
          <Button variant="secondary" onClick={() => newTab("grpc")}>
            <Icon name="server" size={14} /> gRPC request
          </Button>
          <Button variant="secondary" onClick={() => openDialog({ type: "import" })}>
            <Icon name="import" size={14} /> Import
          </Button>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1 text-[11px] text-subtle">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd> to search everything
        </p>
      </div>
    </div>
  );
}

export function WorkspacePage() {
  const tab = useActiveTab();
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TabBar />
        {tab ? <RequestPane key={tab.id} tab={tab} /> : <NoTabs />}
      </div>
    </div>
  );
}
