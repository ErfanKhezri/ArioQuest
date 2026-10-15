import { Button } from "@/components/ui/Button";
import { EmptyState, IconButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { useWorkspace } from "@/store/workspace";
import { SidebarShell } from "./SidebarShell";

export function ProtosPanel() {
  const protoSets = useWorkspace((s) => s.protoSets);
  const openDialog = useWorkspace((s) => s.openDialog);
  const newTab = useWorkspace((s) => s.newTab);

  return (
    <SidebarShell
      title="Proto files"
      actions={
        <IconButton
          icon="plus"
          label="Import .proto files"
          onClick={() => openDialog({ type: "protoSet" })}
        />
      }
      footer={
        <Button variant="secondary" size="sm" className="w-full" onClick={() => newTab("grpc")}>
          <Icon name="server" size={13} /> New gRPC request
        </Button>
      }
    >
      {protoSets.length === 0 ? (
        <EmptyState title="No proto files yet">
          Import <code className="font-mono">.proto</code> files (or a whole folder) to call gRPC
          services without server reflection. Imports and google/protobuf types are resolved
          automatically.
          <div className="mt-3">
            <button
              type="button"
              onClick={() => openDialog({ type: "protoSet" })}
              className="font-medium text-accent hover:underline"
            >
              Import .proto files
            </button>
          </div>
        </EmptyState>
      ) : (
        <ul className="px-1">
          {protoSets.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openDialog({ type: "protoSet", protoSetId: p.id })}
                className="flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-panel-2"
              >
                <Icon name="layers" size={14} className="shrink-0 text-fg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-subtle">
                    {p.files.length} file{p.files.length === 1 ? "" : "s"} ·{" "}
                    {p.files.map((f) => f.path.split("/").pop()).join(", ")}
                  </span>
                </span>
                <Icon name="chevronRight" size={13} className="text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SidebarShell>
  );
}
