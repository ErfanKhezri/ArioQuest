import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { VariableInput } from "@/components/editor/VariableInput";
import { Ario } from "@/components/ui/Ario";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, Input, Spinner } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { KeyValueEditor } from "@/components/ui/KeyValueEditor";
import { Tabs } from "@/components/ui/Tabs";
import { schemaKey, schemaSourceFor, streamingLabel } from "@/core/grpc";
import type { GrpcMethodInfo, GrpcRequest } from "@/core/types";
import { interpolate } from "@/core/variables";
import { inEveryLanguage } from "@/i18n";
import { cn } from "@/lib/cn";
import { isTauri } from "@/lib/tauri";
import { isWebDemo, RELEASES_URL } from "@/lib/demo";
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

/** Shown in the web demo: browsers can't open the HTTP/2 connections gRPC needs. */
function GrpcInDesktopApp() {
  const { t } = useTranslation();
  return (
    <div className="mx-2 mb-2 flex items-center gap-3 rounded-md bg-panel-2 px-3 py-3 text-sm">
      <Ario mood="shy" size={36} className="text-info" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">{t("grpc.desktopTitle")}</p>
        <p className="text-muted">{t("grpc.desktopBody")}</p>
      </div>
      <a
        href={RELEASES_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-7 shrink-0 items-center gap-2 rounded-md bg-accent px-3 font-medium text-accent-fg hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <Icon name="download" size={13} />
        {t("grpc.downloadWindows")}
      </a>
    </div>
  );
}

export function GrpcRequestEditor({ tab, request }: { tab: Tab; request: GrpcRequest }) {
  const { t } = useTranslation();
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
      name:
        inEveryLanguage("defaults.untitledGrpc").includes(r.name) && found ? found.name : r.name,
      message: found && EMPTY_MESSAGES.has(r.message.trim()) ? exampleMessage(found) : r.message,
    }));
  };

  const sourceValue =
    request.source.type === "reflection" ? "reflection" : request.source.protoSetId;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 p-2">
        <div className="flex h-7 min-w-0 flex-1 items-center rounded-md border border-line bg-panel focus-within:border-accent">
          <span className="flex h-full items-center border-e border-line px-2 font-mono text-xs font-medium">
            gRPC
          </span>
          <VariableInput
            value={request.target}
            onChange={(target) => update((r) => ({ ...r, target }))}
            onEnter={() => void sendTab(tab.id)}
            placeholder="localhost:50051"
            ariaLabel={t("grpc.serverAddress")}
            className="px-2"
          />
          <button
            type="button"
            onClick={() => update((r) => ({ ...r, tls: !r.tls }))}
            title={request.tls ? t("grpc.tlsOn") : t("grpc.tlsOff")}
            className={cn(
              "me-1 flex h-5 items-center gap-1 rounded-sm px-1 text-xs",
              request.tls ? "text-fg" : "text-subtle hover:text-fg",
            )}
          >
            <Icon name="shield" size={12} />
            {request.tls ? "TLS" : t("grpc.noTls")}
          </button>
        </div>
        <SendControls tab={tab} />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
        <label className="flex h-7 items-center gap-2 rounded-md border border-line bg-panel px-2 text-sm">
          <span className="text-subtle">{t("grpc.schema")}</span>
          <select
            aria-label={t("grpc.schemaSource")}
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
            className="max-w-48 cursor-pointer bg-transparent outline-none"
          >
            <option value="reflection">{t("grpc.reflection")}</option>
            {protoSets.length > 0 && (
              <optgroup label={t("grpc.protoFiles")}>
                {protoSets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {request.source.type === "protoSet" && !protoSets.some((p) => p.id === sourceValue) && (
              <option value={sourceValue}>{t("grpc.deletedSet")}</option>
            )}
            <option value={IMPORT_OPTION}>{t("grpc.importProtos")}</option>
          </select>
        </label>

        <label className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-panel px-2 text-sm">
          <span className="text-subtle">{t("grpc.method")}</span>
          <select
            aria-label={t("grpc.method")}
            value={request.method}
            onChange={(e) => selectMethod(e.target.value)}
            className="min-w-0 flex-1 cursor-pointer bg-transparent font-mono text-xs outline-none"
          >
            <option value="" disabled>
              {methods.length ? t("grpc.selectMethod") : t("grpc.loadSchemaFirst")}
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
            disabled={schemaState?.status === "loading"}
            onClick={() => source && void loadSchema(source)}
            title={source.kind === "reflection" ? t("grpc.askServer") : t("grpc.recompile")}
          >
            {schemaState?.status === "loading" ? <Spinner /> : <Icon name="refresh" size={13} />}
            {source.kind === "reflection" ? t("grpc.loadReflection") : t("grpc.reload")}
          </Button>
        )}
      </div>

      {isWebDemo ? (
        <GrpcInDesktopApp />
      ) : (
        (sourceError || schemaState?.status === "error" || !isTauri()) && (
          <ErrorNote className="mx-2 mb-2">
            {!isTauri() ? t("grpc.needsDesktop") : (sourceError ?? schemaState?.error)}
          </ErrorNote>
        )
      )}

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { id: "message", label: t("request.message") },
          {
            id: "metadata",
            label: t("request.metadata"),
            badge: request.metadata.filter((m) => m.enabled && m.key).length,
          },
          {
            id: "scripts",
            label: t("request.scripts"),
            badge: [request.preScript, request.testScript].filter((s) => s.trim()).length,
          },
          {
            id: "tests",
            label: t("request.tests"),
            badge: request.assertions.filter((a) => a.enabled).length,
          },
          { id: "settings", label: t("request.settings") },
        ]}
        trailing={
          section === "message" &&
          selected && (
            <span className="flex items-center gap-2 text-xs text-subtle">
              <span dir="ltr" className="hidden font-mono xl:inline">
                {selected.inputType} → {selected.outputType}
              </span>
              <span>{streamingLabel(selected)}</span>
            </span>
          )
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {section === "message" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-8 items-center gap-2 px-3 text-xs text-subtle">
              {selected?.clientStreaming ? t("grpc.clientStreamingHint") : t("grpc.messageHint")}
              {selected && (
                <button
                  type="button"
                  className="ms-auto text-accent hover:underline"
                  onClick={() => update((r) => ({ ...r, message: exampleMessage(selected) }))}
                >
                  {t("grpc.generateExample")}
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
            <p className="px-3 pb-3 text-xs text-subtle">
              <Trans
                i18nKey="grpc.metadataHint"
                components={{ code: <code className="font-mono" /> }}
              />
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
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            <Field label={t("grpc.deadline")} hint={t("grpc.deadlineHint")}>
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
            <Field label={t("request.description")}>
              <textarea
                value={request.description ?? ""}
                onChange={(e) => update((r) => ({ ...r, description: e.target.value }))}
                rows={4}
                dir="auto"
                className="w-full max-w-lg resize-y rounded-md border border-line bg-panel p-2 text-xs outline-none focus:border-accent"
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
