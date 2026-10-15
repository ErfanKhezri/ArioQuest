import { useEffect, useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { Button } from "@/components/ui/Button";
import { ErrorNote, IconButton, Input, Spinner } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { newGrpcRequest } from "@/core/factory";
import { schemaKey, streamingLabel } from "@/core/grpc";
import type { GrpcMethodInfo, ProtoFile } from "@/core/types";
import { cn } from "@/lib/cn";
import { confirmAction } from "@/lib/confirm";
import { formatBytes, pickFiles } from "@/lib/files";
import { isTauri } from "@/lib/tauri";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

/** Path as chosen by the user: folder uploads keep their relative path. */
const pathOf = (file: File) =>
  (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

async function chooseProtos(directory: boolean): Promise<ProtoFile[]> {
  const files = await pickFiles({
    accept: directory ? undefined : ".proto",
    multiple: true,
    directory,
  });
  const protos = files.filter((f) => f.name.endsWith(".proto"));
  if (files.length > 0 && protos.length === 0) notify.error("No .proto files were selected.");
  return Promise.all(protos.map(async (f) => ({ path: pathOf(f), content: await f.text() })));
}

function mergeFiles(existing: ProtoFile[], added: ProtoFile[]): ProtoFile[] {
  const byPath = new Map(existing.map((f) => [f.path, f]));
  for (const f of added) byPath.set(f.path, f);
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

const defaultName = (files: ProtoFile[]) => {
  const first = files[0]?.path ?? "protos";
  const folder = first.includes("/") ? first.split("/")[0] : undefined;
  return folder ?? first.replace(/\.proto$/, "");
};

export function ProtoSetDialog({
  protoSetId,
  assignToTabId,
}: {
  protoSetId?: string;
  assignToTabId?: string;
}) {
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const protoSet = useWorkspace((s) => s.protoSets.find((p) => p.id === protoSetId));
  const addProtoSet = useWorkspace((s) => s.addProtoSet);
  const updateProtoSet = useWorkspace((s) => s.updateProtoSet);
  const deleteProtoSet = useWorkspace((s) => s.deleteProtoSet);
  const updateRequest = useWorkspace((s) => s.updateRequest);
  const loadSchema = useWorkspace((s) => s.loadSchema);
  const newTab = useWorkspace((s) => s.newTab);
  const openDialog = useWorkspace((s) => s.openDialog);
  const schemas = useWorkspace((s) => s.schemas);
  const [viewing, setViewing] = useState<string | null>(null);

  const files = protoSet?.files ?? [];
  const key = files.length ? schemaKey({ kind: "protos", files }) : null;
  const schemaState = key ? schemas[key] : undefined;

  useEffect(() => {
    if (key && !schemas[key] && isTauri()) void loadSchema({ kind: "protos", files });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = async (directory: boolean) => {
    const added = await chooseProtos(directory);
    if (added.length === 0) return;
    if (protoSet) {
      updateProtoSet(protoSet.id, { files: mergeFiles(protoSet.files, added) });
    } else {
      const id = addProtoSet(defaultName(added), mergeFiles([], added));
      if (assignToTabId) {
        updateRequest(assignToTabId, (r) =>
          r.kind === "grpc" ? { ...r, source: { type: "protoSet", protoSetId: id } } : r,
        );
      }
      openDialog({ type: "protoSet", protoSetId: id, assignToTabId });
    }
  };

  const openMethod = (service: string, method: GrpcMethodInfo) => {
    if (!protoSet) return;
    const message = method.clientStreaming
      ? `[\n  ${method.inputTemplate.replace(/\n/g, "\n  ")}\n]`
      : method.inputTemplate;
    newTab(
      "grpc",
      newGrpcRequest({
        name: method.name,
        source: { type: "protoSet", protoSetId: protoSet.id },
        method: `${service}/${method.name}`,
        message,
      }),
    );
    closeDialog();
  };

  const viewed = files.find((f) => f.path === viewing);

  return (
    <Modal
      title={protoSet ? "Proto files" : "Import .proto files"}
      onClose={closeDialog}
      className="max-w-4xl"
    >
      {!protoSet ? (
        <div className="space-y-4 p-6">
          <p className="text-xs text-muted">
            Choose the <code className="font-mono">.proto</code> files that define your services.
            Pick a folder to keep import paths like{" "}
            <code className="font-mono">import "common/v1/types.proto"</code> working. Well-known
            types (<code className="font-mono">google/protobuf/*</code>) are built in — no protoc
            needed.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void addFiles(false)}
              className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line px-6 py-8 text-center hover:border-accent/50 hover:bg-panel-2"
            >
              <Icon name="filePlus" size={20} className="text-subtle" />
              <span className="text-sm font-medium">Choose files</span>
              <span className="text-xs text-subtle">One or more .proto files</span>
            </button>
            <button
              type="button"
              onClick={() => void addFiles(true)}
              className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line px-6 py-8 text-center hover:border-accent/50 hover:bg-panel-2"
            >
              <Icon name="folderPlus" size={20} className="text-subtle" />
              <span className="text-sm font-medium">Choose a folder</span>
              <span className="text-xs text-subtle">Every .proto file inside it</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid min-h-[440px] md:grid-cols-[280px_1fr]">
          <div className="flex flex-col border-b border-line md:border-r md:border-b-0">
            <div className="space-y-2 p-4">
              <Input
                value={protoSet.name}
                onChange={(e) => updateProtoSet(protoSet.id, { name: e.target.value })}
                aria-label="Proto set name"
                className="h-9 text-sm font-medium"
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => void addFiles(false)}>
                  <Icon name="filePlus" size={13} /> Files
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void addFiles(true)}>
                  <Icon name="folderPlus" size={13} /> Folder
                </Button>
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {files.map((f) => (
                <li key={f.path}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewing(viewing === f.path ? null : f.path)}
                    onKeyDown={(e) => e.key === "Enter" && setViewing(f.path)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-panel-2",
                      viewing === f.path && "bg-panel-2",
                    )}
                  >
                    <Icon name="file" size={13} className="shrink-0 text-subtle" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs" title={f.path}>
                      {f.path}
                    </span>
                    <span className="text-xs text-subtle group-hover:hidden">
                      {formatBytes(f.content.length)}
                    </span>
                    <IconButton
                      icon="x"
                      label="Remove file"
                      size={12}
                      className="hidden size-5 group-hover:inline-flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProtoSet(protoSet.id, {
                          files: files.filter((x) => x.path !== f.path),
                        });
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger"
                onClick={async () => {
                  if (await confirmAction(`Delete the proto set "${protoSet.name}"?`)) {
                    deleteProtoSet(protoSet.id);
                    closeDialog();
                  }
                }}
              >
                <Icon name="trash" size={13} /> Delete proto set
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            {viewed ? (
              <>
                <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs">
                  <span className="truncate font-mono">{viewed.path}</span>
                  <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
                    Back to services
                  </Button>
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor value={viewed.content} readOnly language="text" />
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-medium">Services</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadSchema({ kind: "protos", files })}
                    disabled={!isTauri()}
                  >
                    {schemaState?.status === "loading" ? (
                      <Spinner />
                    ) : (
                      <Icon name="refresh" size={13} />
                    )}{" "}
                    Recompile
                  </Button>
                </div>
                {!isTauri() && (
                  <p className="text-xs text-subtle">
                    Compiling proto files requires the desktop app.
                  </p>
                )}
                {schemaState?.status === "error" && (
                  <ErrorNote>
                    <span className="font-mono">{schemaState.error}</span>
                  </ErrorNote>
                )}
                {schemaState?.schema?.services.length === 0 && (
                  <p className="text-xs text-subtle">
                    These files compile but do not define any services.
                  </p>
                )}
                <div className="space-y-4">
                  {schemaState?.schema?.services.map((s) => (
                    <section key={s.name}>
                      <h4 className="mb-1 font-mono text-xs font-medium">{s.name}</h4>
                      <ul className="overflow-hidden rounded-md border border-line">
                        {s.methods.map((m) => (
                          <li key={m.path} className="border-b border-line last:border-b-0">
                            <button
                              type="button"
                              onClick={() => openMethod(s.name, m)}
                              className="group flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-panel-2"
                            >
                              <span className="font-mono font-medium">{m.name}</span>
                              <span className="hidden min-w-0 truncate font-mono text-xs text-subtle lg:inline">
                                {m.inputType.split(".").pop()} → {m.outputType.split(".").pop()}
                              </span>
                              <span className="ml-auto shrink-0 rounded-sm bg-panel-2 px-2 py-0.5 text-xs text-muted">
                                {streamingLabel(m)}
                              </span>
                              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100">
                                New request <Icon name="arrowRight" size={12} />
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
