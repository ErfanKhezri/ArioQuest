import { useState } from "react";
import { useTranslation } from "react-i18next";
import { VariableInput } from "@/components/editor/VariableInput";
import { Field, Input, Toggle } from "@/components/ui/controls";
import { KeyValueEditor } from "@/components/ui/KeyValueEditor";
import { methodTextClasses } from "@/components/ui/methodColors";
import { Tabs } from "@/components/ui/Tabs";
import { looksLikeCurl, parseCurl } from "@/core/curl";
import { applyParamsToUrl, syncParamsFromUrl } from "@/core/url";
import { HTTP_METHODS, type HttpMethodName, type HttpRequest } from "@/core/types";
import { inEveryLanguage, t } from "@/i18n";
import { cn } from "@/lib/cn";
import { notify } from "@/store/toasts";
import { type Tab, useWorkspace } from "@/store/workspace";
import { useRequestUpdater } from "../hooks";
import { ScriptsEditor } from "../shared/ScriptsEditor";
import { TestsEditor } from "../shared/TestsEditor";
import { SendControls } from "../SendControls";
import { AuthEditor } from "./AuthEditor";
import { BodyEditor } from "./BodyEditor";

const bodyLabel = (mode: HttpRequest["body"]["mode"]): string | undefined => {
  switch (mode) {
    case "none":
      return undefined;
    case "json":
      return "JSON";
    case "xml":
      return "XML";
    case "html":
      return "HTML";
    case "graphql":
      return "GraphQL";
    default:
      return t(`http.bodyBadge.${mode}`);
  }
};

const authLabel: Partial<Record<HttpRequest["auth"]["type"], string>> = {
  bearer: "Bearer",
  basic: "Basic",
  apikey: "API key",
};

type Section = "params" | "headers" | "body" | "auth" | "scripts" | "tests" | "settings";

export function HttpRequestEditor({ tab, request }: { tab: Tab; request: HttpRequest }) {
  const { t } = useTranslation();
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
        name: inEveryLanguage("defaults.untitledRequest").includes(r.name) ? parsed.name : r.name,
      }));
      notify.success(t("http.curlImported"));
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
            aria-label={t("http.method")}
            value={request.method}
            onChange={(e) => update((r) => ({ ...r, method: e.target.value as HttpMethodName }))}
            className={cn(
              "h-full cursor-pointer rounded-s-md border-e border-line bg-transparent ps-2 pe-1 font-mono text-xs font-medium outline-none",
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
            placeholder={t("http.urlPlaceholder")}
            ariaLabel={t("http.url")}
            className="px-2"
          />
        </div>
        <SendControls tab={tab} />
      </div>

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { id: "params", label: t("request.params"), badge: count(request.params) },
          { id: "headers", label: t("request.headers"), badge: count(request.headers) },
          { id: "body", label: t("request.body"), badge: bodyLabel(request.body.mode) },
          { id: "auth", label: t("request.auth"), badge: authLabel[request.auth.type] },
          { id: "scripts", label: t("request.scripts"), badge: scripts },
          {
            id: "tests",
            label: t("request.tests"),
            badge: request.assertions.filter((a) => a.enabled).length,
          },
          { id: "settings", label: t("request.settings") },
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
              keyPlaceholder={t("http.parameter")}
              showDescription
            />
          </div>
        )}
        {section === "headers" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <KeyValueEditor
              rows={request.headers}
              onChange={(headers) => update((r) => ({ ...r, headers }))}
              keyPlaceholder={t("http.header")}
              showDescription
            />
            <p className="px-3 pb-3 text-xs text-subtle">{t("http.headersHint")}</p>
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
                label={t("http.followRedirects")}
                description={t("http.followRedirectsHint")}
                checked={request.settings.followRedirects}
                onChange={(followRedirects) =>
                  update((r) => ({ ...r, settings: { ...r.settings, followRedirects } }))
                }
              />
              <Toggle
                label={t("http.verifyTls")}
                description={t("http.verifyTlsHint")}
                checked={request.settings.verifyTls}
                onChange={(verifyTls) =>
                  update((r) => ({ ...r, settings: { ...r.settings, verifyTls } }))
                }
              />
              <div className="py-3">
                <Field label={t("http.timeout")} hint={t("http.timeoutHint")}>
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
                <Field label={t("request.description")}>
                  <textarea
                    value={request.description ?? ""}
                    onChange={(e) => update((r) => ({ ...r, description: e.target.value }))}
                    rows={4}
                    dir="auto"
                    placeholder={t("http.descriptionPlaceholder")}
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
