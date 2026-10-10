import { useEffect, useMemo, useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { VariableInput } from "@/components/editor/VariableInput";
import { Button } from "@/components/ui/Button";
import { Field, Input, Spinner } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { KeyValueEditor } from "@/components/ui/KeyValueEditor";
import { Tabs } from "@/components/ui/Tabs";
import { schemaKey, schemaSourceFor, streamingLabel } from "@/core/grpc";
import type { GrpcMethodInfo, GrpcRequest } from "@/core/types";
import { interpolate } from "@/core/variables";
import { cn } from "@/lib/cn";
import { isTauri } from "@/lib/tauri";
import { type Tab, useWorkspace } from "@/store/workspace";
import { useRequestUpdater } from "../hooks";
import { ScriptsEditor } from "../shared/ScriptsEditor";
import { TestsEditor } from "../shared/TestsEditor";
import { SendControls } from "../SendControls";

type Section = "message" | "metadata" | "scripts" | "tests" | "settings";

const IMPORT_OPTION = "__import__";
const EMPTY_MESSAGES = new Set(["", "{}", "{\n  \n}", "[]"]);

function exampleMessage(method: GrpcMethodInfo) {
  if (!method.clientStreaming) return method.inputTemplate;
  const indented = method.inputTemplate.replace(/\n/g, "\n  ");
  return `[\n  ${indented}\n]`;
}

export function GrpcRequestEditor({ tab, request }: { tab: Tab; request: GrpcRequest }) {
  const update = useRequestUpdater(tab.id, "grpc");
  const protoSets = useWorkspace((s) => s.protoSets);
  const schemas = useWorkspace((s) => s.schemas);
  const loadSchema = useWorkspace((s) => s.loadSchema);
  const resolveVariable = useWorkspace((s) => s.resolveVariable);
  const openDialog = useWorkspace((s) => s.openDialog);
  const sendTab = useWorkspace((s) => s.sendTab);
  const [section, setSection] = useState<Section>("message");

  const resolve = (name: string) => resolveVariable(name)?.value;

  // Which schema this request uses, and its load state.
  let sourceError: string | null = null;
  let source: ReturnType<typeof schemaSourceFor> | null = null;
  try {
    const metadata = request.metadata
      .filter((m) => m.enabled && m.key)
      .map((m) => ({ key: interpolate(m.key, resolve), value: interpolate(m.value, resolve) }));
    source = schemaSourceFor(request, protoSets, metadata, resolve);
  } catch (err) {
    sourceError = err instanceof Error ? err.message : String(err);
  }
  const key = source ? schemaKey(source) : null;
  const schemaState = key ? schemas[key] : undefined;

  // Proto files are local, so load them right away; reflection waits for a click.
  useEffect(() => {
    if (source?.kind === "protos" && key && !schemas[key] && isTauri()) void loadSchema(source);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const methods = useMemo(
    () =>
      schemaState?.schema?.services.flatMap((s) =>
        s.methods.map((m) => ({ service: s.name, method: m })),
      ) ?? [],
    [schemaState],
  );
  const selected = methods.find((m) => `${m.service}/${m.method.name}` === request.method)?.method;

  const selectMethod = (value: string) => {
    const found = methods.find((m) => `${m.service}/${m.method.name}` === value)?.method;
    update((r) => ({
      ...r,
      method: value,
      name: r.name === "Untitled gRPC call" && found ? found.name : r.name,
      message: found && EMPTY_MESSAGES.has(r.message.trim()) ? exampleMessage(found) : r.message,
    }));
  };

  const sourceValue =
    request.source.type === "reflection" ? "reflection" : request.source.protoSetId;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 p-3">
        <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-line bg-panel-2/50 focus-within:border-brand-500/60 focus-within:ring-4 focus-within:ring-brand-500/10">
          <span className="flex h-full items-center border-r border-line px-3 font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
            gRPC
          </span>
          <VariableInput
            value={request.target}
            onChange={(target) => update((r) => ({ ...r, target }))}
            onEnter={() => void sendTab(tab.id)}
            placeholder="localhost:50051"
            ariaLabel="Server address"
            className="px-2"
          />
          <button
            type="button"
            onClick={() => update((r) => ({ ...r, tls: !r.tls }))}
            title={request.tls ? "TLS enabled (grpcs)" : "Plaintext (no TLS)"}
            className={cn(
              "mr-1 flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors",
              request.tls
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : "text-subtle hover:bg-panel-2",
            )}
          >
            <Icon name="shield" size={13} />
            {request.tls ? "TLS" : "No TLS"}
          </button>
        </div>
        <SendControls tab={tab} />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
        <label className="flex h-8 items-center gap-2 rounded-md border border-line bg-panel px-2 text-xs">
          <span className="text-subtle">Schema</span>
          <select
            aria-label="Schema source"
            value={sourceValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === IMPORT_OPTION) openDialog({ type: "protoSet", assignToTabId: tab.id });
              else
                update((r) => ({
                  ...r,
                  source:
                    value === "reflection"
                      ? { type: "reflection" }
                      : { type: "protoSet", protoSetId: value },
                }));
            }}
            className="max-w-48 cursor-pointer bg-transparent font-medium outline-none"
          >
            <option value="reflection">Server reflection</option>
            {protoSets.length > 0 && (
              <optgroup label="Proto files">
                {protoSets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {request.source.type === "protoSet" && !protoSets.some((p) => p.id === sourceValue) && (
              <option value={sourceValue}>(deleted proto set)</option>
            )}
            <option value={IMPORT_OPTION}>Import .proto files…</option>
          </select>
        </label>

        <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-panel px-2 text-xs">
          <span className="text-subtle">Method</span>
          <select
            aria-label="Method"
            value={request.method}
            onChange={(e) => selectMethod(e.target.value)}
            className="min-w-0 flex-1 cursor-pointer bg-transparent font-mono outline-none"
          >
            <option value="" disabled>
              {methods.length ? "Select a method…" : "Load the schema to list methods"}
            </option>
            {schemaState?.schema?.services.map((s) => (
              <optgroup key={s.name} label={s.name}>
                {s.methods.map((m) => (
                  <option key={m.path} value={`${s.name}/${m.name}`}>
                    {m.name}
                    {m.clientStreaming || m.serverStreaming
                      ? `  · ${streamingLabel(m).toLowerCase()}`
                      : ""}
                  </option>
                ))}
              </optgroup>
            ))}
            {request.method && !selected && (
              <option value={request.method}>{request.method}</option>
            )}
          </select>
        </label>

        {source && (
          <Button
            variant="secondary"
            size="sm"
            className="h-8"
            disabled={schemaState?.status === "loading"}
            onClick={() => source && void loadSchema(source)}
            title={
              source.kind === "reflection"
                ? "Ask the server for its services"
                : "Recompile the proto files"
            }
          >
            {schemaState?.status === "loading" ? <Spinner /> : <Icon name="refresh" size={13} />}
            {source.kind === "reflection" ? "Load via reflection" : "Reload"}
          </Button>
        )}
      </div>

      {(sourceError || schemaState?.status === "error" || !isTauri()) && (
        <p className="selectable mx-3 mb-3 flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/8 px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap text-rose-600 dark:text-rose-400">
          <Icon name="alert" size={14} className="mt-px shrink-0" />
          {!isTauri()
            ? "gRPC requires the desktop app. Run `pnpm app:dev` to call gRPC services."
            : (sourceError ?? schemaState?.error)}
        </p>
      )}

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { id: "message", label: "Message" },
          {
            id: "metadata",
            label: "Metadata",
            badge: request.metadata.filter((m) => m.enabled && m.key).length,
          },
          {
            id: "scripts",
            label: "Scripts",
            badge: request.preScript.trim() || request.testScript.trim() ? "•" : undefined,
          },
          {
            id: "tests",
            label: "Tests",
            badge: request.assertions.filter((a) => a.enabled).length,
          },
          { id: "settings", label: "Settings" },
        ]}
        trailing={
          section === "message" &&
          selected && (
            <span className="flex items-center gap-2 text-[11px] text-subtle">
              <span className="hidden font-mono xl:inline">
                {selected.inputType} → {selected.outputType}
              </span>
              <span className="rounded bg-panel-2 px-1.5 py-0.5">{streamingLabel(selected)}</span>
            </span>
          )
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {section === "message" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-subtle">
              {selected?.clientStreaming
                ? "Client streaming: send a JSON array to stream several messages."
                : "Request message as JSON (proto field names or lowerCamelCase)."}
              {selected && (
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-500 dark:text-brand-300"
                  onClick={() => update((r) => ({ ...r, message: exampleMessage(selected) }))}
                >
                  <Icon name="sparkles" size={12} /> Generate example
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 border-t border-line">
              <CodeEditor
                value={request.message}
                onChange={(message) => update((r) => ({ ...r, message }))}
                language="json"
                variables
              />
            </div>
          </div>
        )}
        {section === "metadata" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <KeyValueEditor
              rows={request.metadata}
              onChange={(metadata) => update((r) => ({ ...r, metadata }))}
              keyPlaceholder="authorization"
              valuePlaceholder="Bearer {{token}}"
            />
            <p className="px-4 pb-4 text-[11px] text-subtle">
              Keys are lowercased. Keys ending in <code className="font-mono">-bin</code> take
              base64 values. Metadata is also sent with reflection requests.
            </p>
          </div>
        )}
        {section === "scripts" && (
          <ScriptsEditor
            request={request}
            onChange={(patch) => update((r) => ({ ...r, ...patch }))}
          />
        )}
        {section === "tests" && (
          <TestsEditor
            request={request}
            onChange={(patch) => update((r) => ({ ...r, ...patch }))}
          />
        )}
        {section === "settings" && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <Field label="Deadline (ms)" hint="Sent as grpc-timeout. 0 disables the deadline.">
              <Input
                type="number"
                min={0}
                step={1000}
                value={request.timeoutMs}
                onChange={(e) =>
                  update((r) => ({ ...r, timeoutMs: Math.max(0, Number(e.target.value) || 0) }))
                }
                className="w-40"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={request.description ?? ""}
                onChange={(e) => update((r) => ({ ...r, description: e.target.value }))}
                rows={4}
                className="w-full max-w-lg resize-y rounded-md border border-line bg-panel p-2.5 text-xs outline-none focus:border-brand-500/60"
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
