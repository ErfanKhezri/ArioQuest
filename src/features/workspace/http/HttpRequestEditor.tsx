import { useState } from "react";
import { VariableInput } from "@/components/editor/VariableInput";
import { Field, Input, Toggle } from "@/components/ui/controls";
import { KeyValueEditor } from "@/components/ui/KeyValueEditor";
import { methodTextClasses } from "@/components/ui/methodColors";
import { Tabs } from "@/components/ui/Tabs";
import { looksLikeCurl, parseCurl } from "@/core/curl";
import { applyParamsToUrl, syncParamsFromUrl } from "@/core/url";
import { HTTP_METHODS, type HttpMethodName, type HttpRequest } from "@/core/types";
import { cn } from "@/lib/cn";
import { notify } from "@/store/toasts";
import { type Tab, useWorkspace } from "@/store/workspace";
import { useRequestUpdater } from "../hooks";
import { ScriptsEditor } from "../shared/ScriptsEditor";
import { TestsEditor } from "../shared/TestsEditor";
import { SendControls } from "../SendControls";
import { AuthEditor } from "./AuthEditor";
import { BodyEditor } from "./BodyEditor";

const bodyLabel: Partial<Record<HttpRequest["body"]["mode"], string>> = {
  json: "JSON",
  text: "Text",
  xml: "XML",
  html: "HTML",
  urlencoded: "Form",
  formdata: "Multipart",
  graphql: "GraphQL",
  binary: "File",
};

const authLabel: Partial<Record<HttpRequest["auth"]["type"], string>> = {
  bearer: "Bearer",
  basic: "Basic",
  apikey: "API key",
};

type Section = "params" | "headers" | "body" | "auth" | "scripts" | "tests" | "settings";

export function HttpRequestEditor({ tab, request }: { tab: Tab; request: HttpRequest }) {
  const update = useRequestUpdater(tab.id, "http");
  const sendTab = useWorkspace((s) => s.sendTab);
  const [section, setSection] = useState<Section>(request.body.mode !== "none" ? "body" : "params");

  const setUrl = (url: string) =>
    update((r) => ({ ...r, url, params: syncParamsFromUrl(url, r.params) }));

  const pasteCurl = (text: string) => {
    if (!looksLikeCurl(text)) return false;
    try {
      const parsed = parseCurl(text);
      update((r) => ({
        ...parsed,
        id: r.id,
        name: r.name === "Untitled request" ? parsed.name : r.name,
      }));
      notify.success("Imported cURL command.");
      return true;
    } catch {
      return false;
    }
  };

  const count = (list: Array<{ enabled: boolean; key: string }>) =>
    list.filter((x) => x.enabled && x.key).length;
  const scripts = [request.preScript, request.testScript].filter((s) => s.trim()).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 p-2">
        <div className="flex h-7 min-w-0 flex-1 items-center rounded-md border border-line bg-panel focus-within:border-accent">
          <select
            aria-label="HTTP method"
            value={request.method}
            onChange={(e) => update((r) => ({ ...r, method: e.target.value as HttpMethodName }))}
            className={cn(
              "h-full cursor-pointer rounded-l-md border-r border-line bg-transparent pr-1 pl-2 font-mono text-xs font-medium outline-none",
              methodTextClasses[request.method],
            )}
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m} className="bg-panel-solid text-fg">
                {m}
              </option>
            ))}
          </select>
          <VariableInput
            value={request.url}
            onChange={setUrl}
            onPasteText={pasteCurl}
            onEnter={() => void sendTab(tab.id)}
            placeholder="Enter a URL or paste a cURL command"
            ariaLabel="Request URL"
            className="px-2"
          />
        </div>
        <SendControls tab={tab} />
      </div>

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { id: "params", label: "Params", badge: count(request.params) },
          { id: "headers", label: "Headers", badge: count(request.headers) },
          { id: "body", label: "Body", badge: bodyLabel[request.body.mode] },
          { id: "auth", label: "Auth", badge: authLabel[request.auth.type] },
          { id: "scripts", label: "Scripts", badge: scripts },
          {
            id: "tests",
            label: "Tests",
            badge: request.assertions.filter((a) => a.enabled).length,
          },
          { id: "settings", label: "Settings" },
        ]}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {section === "params" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <KeyValueEditor
              rows={request.params}
              onChange={(params) =>
                update((r) => ({ ...r, params, url: applyParamsToUrl(r.url, params) }))
              }
              keyPlaceholder="Parameter"
              showDescription
            />
          </div>
        )}
        {section === "headers" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <KeyValueEditor
              rows={request.headers}
              onChange={(headers) => update((r) => ({ ...r, headers }))}
              keyPlaceholder="Header"
              showDescription
            />
            <p className="px-3 pb-3 text-xs text-subtle">
              Content-Type, Authorization and User-Agent are added automatically from the body and
              auth settings unless you set them here.
            </p>
          </div>
        )}
        {section === "body" && (
          <BodyEditor body={request.body} onChange={(body) => update((r) => ({ ...r, body }))} />
        )}
        {section === "auth" && (
          <AuthEditor auth={request.auth} onChange={(auth) => update((r) => ({ ...r, auth }))} />
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
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            <div className="max-w-lg divide-y divide-line">
              <Toggle
                label="Follow redirects"
                description="Automatically follow 3xx responses (up to 10)."
                checked={request.settings.followRedirects}
                onChange={(followRedirects) =>
                  update((r) => ({ ...r, settings: { ...r.settings, followRedirects } }))
                }
              />
              <Toggle
                label="Verify TLS certificates"
                description="Turn off for local servers with self-signed certificates."
                checked={request.settings.verifyTls}
                onChange={(verifyTls) =>
                  update((r) => ({ ...r, settings: { ...r.settings, verifyTls } }))
                }
              />
              <div className="py-3">
                <Field label="Timeout (ms)" hint="0 disables the timeout.">
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={request.settings.timeoutMs}
                    onChange={(e) =>
                      update((r) => ({
                        ...r,
                        settings: {
                          ...r.settings,
                          timeoutMs: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    className="w-40"
                  />
                </Field>
              </div>
              <div className="py-3">
                <Field label="Description">
                  <textarea
                    value={request.description ?? ""}
                    onChange={(e) => update((r) => ({ ...r, description: e.target.value }))}
                    rows={4}
                    placeholder="What does this request do?"
                    className="w-full resize-y rounded-md border border-line bg-panel p-2 text-sm outline-none focus:border-accent"
                  />
                </Field>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
