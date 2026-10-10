import { useMemo, useState } from "react";
import { CodeEditor, type EditorLanguage } from "@/components/editor/CodeEditor";
import { EmptyState, IconButton, Spinner } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { Segmented, Tabs } from "@/components/ui/Tabs";
import type { HttpResponseData, RunResult } from "@/core/types";
import { cn } from "@/lib/cn";
import { formatBytes, formatDuration } from "@/lib/files";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

type Section = "body" | "headers" | "tests" | "console" | "request";
type BodyView = "pretty" | "raw" | "preview";

function languageFor(contentType: string): EditorLanguage {
  if (contentType.includes("json")) return "json";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("xml")) return "xml";
  if (contentType.includes("javascript")) return "javascript";
  return "text";
}

function prettyBody(body: string, language: EditorLanguage): string {
  if (language !== "json") return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function statusTone(ok: boolean, warn = false) {
  if (warn) return "bg-amber-500/12 text-amber-600 dark:text-amber-400";
  return ok
    ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
    : "bg-rose-500/12 text-rose-600 dark:text-rose-400";
}

const copy = (text: string) =>
  navigator.clipboard.writeText(text).then(
    () => notify.success("Copied to clipboard."),
    () => notify.error("Could not access the clipboard."),
  );

export function ResponsePanel({ tabId }: { tabId: string }) {
  const result = useWorkspace((s) => s.results[tabId]);
  const running = useWorkspace((s) => Boolean(s.running[tabId]));
  const [section, setSection] = useState<Section>("body");

  if (running && !result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-xs text-subtle">
        <Spinner className="size-5 text-brand-500" />
        Waiting for response…
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState icon="send" title="Send a request to see the response" className="flex-1">
        <span className="inline-flex items-center gap-1">
          Press <Kbd>Ctrl</Kbd>
          <Kbd>Enter</Kbd> to send.
        </span>
      </EmptyState>
    );
  }

  const passed = result.tests.filter((t) => t.passed).length;
  const headerCount =
    result.outcome.kind === "http"
      ? result.outcome.response.headers.length
      : result.outcome.kind === "grpc"
        ? result.outcome.response.headers.length + result.outcome.response.trailers.length
        : 0;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", running && "opacity-60")}>
      <StatusLine result={result} running={running} />
      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { id: "body", label: result.outcome.kind === "grpc" ? "Messages" : "Body" },
          {
            id: "headers",
            label: result.outcome.kind === "grpc" ? "Metadata" : "Headers",
            badge: headerCount,
          },
          {
            id: "tests",
            label: "Tests",
            badge: result.tests.length ? (
              <span
                className={passed === result.tests.length ? "text-emerald-500" : "text-rose-500"}
              >
                {passed}/{result.tests.length}
              </span>
            ) : undefined,
          },
          { id: "console", label: "Console", badge: result.logs.length },
          { id: "request", label: "Request" },
        ]}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {section === "body" && <BodySection result={result} />}
        {section === "headers" && <HeadersSection result={result} />}
        {section === "tests" && <TestsSection result={result} />}
        {section === "console" && <ConsoleSection logs={result.logs} />}
        {section === "request" && <RequestSection result={result} />}
      </div>
    </div>
  );
}

function StatusLine({ result, running }: { result: RunResult; running: boolean }) {
  const { outcome } = result;
  return (
    <div className="flex items-center gap-3 px-4 pt-3 pb-1 text-xs">
      <span className="font-medium text-muted">Response</span>
      {outcome.kind === "http" && (
        <>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-semibold",
              statusTone(
                outcome.response.status < 400,
                outcome.response.status >= 300 && outcome.response.status < 400,
              ),
            )}
          >
            {outcome.response.status} {outcome.response.statusText}
          </span>
          <span className="text-subtle">{formatDuration(outcome.response.timeMs)}</span>
          <span className="text-subtle">{formatBytes(outcome.response.size)}</span>
          {outcome.response.httpVersion && (
            <span className="hidden text-subtle md:inline">{outcome.response.httpVersion}</span>
          )}
        </>
      )}
      {outcome.kind === "grpc" && (
        <>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-mono font-semibold",
              statusTone(outcome.response.ok),
            )}
          >
            {outcome.response.statusCode} {outcome.response.statusName}
          </span>
          <span className="text-subtle">{formatDuration(outcome.response.timeMs)}</span>
          <span className="text-subtle">
            {outcome.response.messages.length} message
            {outcome.response.messages.length === 1 ? "" : "s"}
          </span>
        </>
      )}
      {outcome.kind === "error" && (
        <span className={cn("rounded-md px-1.5 py-0.5 font-semibold", statusTone(false))}>
          Error
        </span>
      )}
      {running && <Spinner className="ml-auto text-brand-500" />}
    </div>
  );
}

function BodySection({ result }: { result: RunResult }) {
  const { outcome } = result;
  const [view, setView] = useState<BodyView>("pretty");
  const [wrap, setWrap] = useState(false);

  const { text, language, http } = useMemo(() => {
    if (outcome.kind === "http") {
      const ct =
        outcome.response.headers
          .find((h) => h.key.toLowerCase() === "content-type")
          ?.value.toLowerCase() ?? "";
      let lang = languageFor(ct);
      if (lang === "text" && /^\s*[[{]/.test(outcome.response.body)) lang = "json";
      return { text: outcome.response.body, language: lang, http: outcome.response };
    }
    if (outcome.kind === "grpc") {
      const { messages } = outcome.response;
      const payload = messages.length === 1 ? messages[0] : messages;
      return {
        text: messages.length ? JSON.stringify(payload, null, 2) : "",
        language: "json" as const,
        http: undefined,
      };
    }
    return { text: "", language: "text" as const, http: undefined };
  }, [outcome]);

  if (outcome.kind === "error") {
    return (
      <div className="m-4 rounded-lg border border-rose-500/25 bg-rose-500/8 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <Icon name="alert" size={15} /> Could not get a response
        </p>
        <p className="selectable mt-2 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-fg">
          {outcome.message}
        </p>
      </div>
    );
  }

  const contentType =
    http?.headers.find((h) => h.key.toLowerCase() === "content-type")?.value ?? "";
  const canPreview = http && (http.isBinary ? /^image\//i.test(contentType) : language === "html");
  const shown = view === "raw" ? text : prettyBody(text, language);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "pretty", label: "Pretty" },
            { value: "raw", label: "Raw" },
            ...(canPreview ? [{ value: "preview" as const, label: "Preview" }] : []),
          ]}
        />
        {outcome.kind === "grpc" && !outcome.response.ok && (
          <span
            className="selectable min-w-0 truncate text-xs text-rose-600 dark:text-rose-400"
            title={outcome.response.statusMessage}
          >
            {outcome.response.statusMessage || "The call failed."}
          </span>
        )}
        <span className="ml-auto flex items-center gap-0.5">
          <IconButton
            icon="wrap"
            label={wrap ? "Disable line wrap" : "Wrap lines"}
            onClick={() => setWrap(!wrap)}
            className={wrap ? "text-brand-500" : ""}
          />
          <IconButton
            icon="copy"
            label="Copy body"
            onClick={() => void copy(shown)}
            disabled={!text}
          />
        </span>
      </div>
      <div className="min-h-0 flex-1 border-t border-line">
        {view === "preview" && http ? (
          http.isBinary && http.bodyBase64 ? (
            <div className="flex h-full items-center justify-center overflow-auto bg-[repeating-conic-gradient(var(--panel-2)_0%_25%,transparent_0%_50%)] bg-size-[16px_16px] p-4">
              <img
                alt="Response preview"
                src={`data:${contentType || "image/png"};base64,${http.bodyBase64}`}
                className="max-h-full max-w-full"
              />
            </div>
          ) : (
            <iframe
              title="HTML preview"
              sandbox=""
              srcDoc={http.body}
              className="h-full w-full bg-white"
            />
          )
        ) : http?.isBinary ? (
          <EmptyState icon="file" title="Binary response">
            {formatBytes(http.size)} of binary data
            {http.bodyBase64 && canPreview ? " — switch to Preview to view it." : "."}
          </EmptyState>
        ) : text ? (
          <CodeEditor
            value={shown}
            readOnly
            language={view === "raw" ? "text" : language}
            wrap={wrap}
          />
        ) : (
          <p className="px-4 py-6 text-xs text-subtle">
            {outcome.kind === "grpc" ? "No messages were returned." : "The response body is empty."}
          </p>
        )}
      </div>
    </div>
  );
}

function HeaderTable({ rows }: { rows: Array<{ key: string; value: string }> }) {
  if (rows.length === 0) return <p className="px-4 py-3 text-xs text-subtle">None.</p>;
  return (
    <table className="selectable mx-4 mb-4 w-[calc(100%-2rem)] table-fixed overflow-hidden rounded-lg border border-line text-xs">
      <tbody>
        {rows.map((h, i) => (
          <tr key={`${h.key}-${i}`} className="border-b border-line last:border-b-0">
            <td className="w-1/3 px-3 py-1.5 align-top font-mono font-medium break-words">
              {h.key}
            </td>
            <td className="px-3 py-1.5 font-mono break-all text-muted">{h.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HeadersSection({ result }: { result: RunResult }) {
  const { outcome } = result;
  if (outcome.kind === "http") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto pt-3">
        <HeaderTable rows={outcome.response.headers} />
        <ResponseCookies response={outcome.response} />
      </div>
    );
  }
  if (outcome.kind === "grpc") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <h4 className="px-4 pt-3 pb-1.5 text-[11px] font-semibold text-subtle uppercase">
          Headers
        </h4>
        <HeaderTable rows={outcome.response.headers} />
        <h4 className="px-4 pb-1.5 text-[11px] font-semibold text-subtle uppercase">Trailers</h4>
        <HeaderTable rows={outcome.response.trailers} />
      </div>
    );
  }
  return <p className="px-4 py-3 text-xs text-subtle">No response.</p>;
}

function ResponseCookies({ response }: { response: HttpResponseData }) {
  const cookies = response.headers.filter((h) => h.key.toLowerCase() === "set-cookie");
  if (cookies.length === 0) return null;
  return (
    <>
      <h4 className="px-4 pb-1.5 text-[11px] font-semibold text-subtle uppercase">Cookies set</h4>
      <HeaderTable
        rows={cookies.map((c) => {
          const [pair = ""] = c.value.split(";");
          const eq = pair.indexOf("=");
          return { key: pair.slice(0, eq), value: c.value.slice(eq + 1) };
        })}
      />
    </>
  );
}

function TestsSection({ result }: { result: RunResult }) {
  if (result.tests.length === 0) {
    return (
      <EmptyState icon="beaker" title="No tests ran" className="flex-1">
        Add assertions in the Tests tab or write a script with aq.test().
      </EmptyState>
    );
  }
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
      {result.tests.map((t, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 border-b border-line py-2 text-xs last:border-b-0"
        >
          <Icon
            name={t.passed ? "checkCircle" : "alert"}
            size={15}
            className={cn("mt-px shrink-0", t.passed ? "text-emerald-500" : "text-rose-500")}
          />
          <span className="min-w-0">
            <span className={cn("font-medium", !t.passed && "text-rose-600 dark:text-rose-400")}>
              {t.name}
            </span>
            {t.message && (
              <span className="selectable mt-0.5 block font-mono text-[11px] break-words text-muted">
                {t.message}
              </span>
            )}
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 text-[10px] font-semibold uppercase",
              t.passed ? "text-emerald-500" : "text-rose-500",
            )}
          >
            {t.passed ? "Pass" : "Fail"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ConsoleSection({ logs }: { logs: string[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState icon="terminal" title="Console is empty" className="flex-1">
        console.log() output from scripts and variable updates appear here.
      </EmptyState>
    );
  }
  return (
    <pre className="selectable min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[12px] leading-6">
      {logs.map((line, i) => (
        <div
          key={i}
          className={cn(
            line.startsWith("[error]") && "text-rose-500",
            line.startsWith("[warn]") && "text-amber-500",
          )}
        >
          {line}
        </div>
      ))}
    </pre>
  );
}

function RequestSection({ result }: { result: RunResult }) {
  const sent = result.sent;
  if (!sent) return <p className="px-4 py-3 text-xs text-subtle">The request was not sent.</p>;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="selectable px-4 pt-3 pb-2 font-mono text-xs break-all">
        <span className="font-bold">{sent.method}</span> {sent.url}
      </p>
      <HeaderTable rows={sent.headers} />
      {sent.body && (
        <pre className="selectable mx-4 mb-4 max-h-80 overflow-auto rounded-lg border border-line bg-panel-2/40 p-3 font-mono text-xs whitespace-pre-wrap">
          {sent.body}
        </pre>
      )}
    </div>
  );
}
