import { useMemo, useState, type ReactNode } from "react";
import { CodeEditor, type EditorLanguage } from "@/components/editor/CodeEditor";
import { ThemeMenu } from "@/components/editor/ThemeMenu";
import { Ario, type ArioMood } from "@/components/ui/Ario";
import {
  moodForGrpcStatus,
  moodForHttpStatus,
  moodLabel,
  moodTextClass,
} from "@/components/ui/arioMood";
import { EmptyState, ErrorNote, IconButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { statusTextClass } from "@/components/ui/methodColors";
import { Segmented, Tabs } from "@/components/ui/Tabs";
import type { GrpcResponseData, HttpResponseData, RunResult } from "@/core/types";
import { cn } from "@/lib/cn";
import { formatBytes, formatDuration } from "@/lib/files";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

type Section = "body" | "headers" | "cookies" | "tests" | "console";
type BodyView = "pretty" | "raw" | "preview";

interface ResponsePanelProps {
  tabId: string;
  layout: "vertical" | "horizontal";
  onToggleLayout: () => void;
}

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

const copy = (text: string) =>
  navigator.clipboard.writeText(text).then(
    () => notify.success("Copied to clipboard."),
    () => notify.error("Could not access the clipboard."),
  );

const clock = (ts: number) =>
  `${new Date(ts).toLocaleTimeString(undefined, { hour12: false })}.${String(ts % 1000).padStart(3, "0")}`;

function cookiesOf(response: HttpResponseData) {
  return response.headers
    .filter((h) => h.key.toLowerCase() === "set-cookie")
    .map((c) => {
      const [pair = ""] = c.value.split(";");
      const eq = pair.indexOf("=");
      return { key: pair.slice(0, eq), value: c.value.slice(eq + 1) };
    });
}

function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-sm border border-line px-1 font-mono text-xs text-muted tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ResponsePanel({ tabId, layout, onToggleLayout }: ResponsePanelProps) {
  const result = useWorkspace((s) => s.results[tabId]);
  const running = useWorkspace((s) => Boolean(s.running[tabId]));
  const [section, setSection] = useState<Section>("body");

  const toggle = (
    <IconButton
      icon={layout === "vertical" ? "columns" : "rows"}
      label={layout === "vertical" ? "Show response on the right" : "Show response below"}
      onClick={onToggleLayout}
      className="ml-auto"
    />
  );

  if (!result) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line pr-1 pl-3 text-xs text-subtle">
          {running && <Ario mood="thinking" size={20} className={moodTextClass.thinking} />}
          {running ? "Sending…" : "Response"}
          {toggle}
        </div>
        {running ? (
          <EmptyState title="Waiting for the response…" mood="thinking" className="flex-1" />
        ) : (
          <EmptyState title="No response yet" mood="sleepy" className="flex-1">
            <span className="inline-flex items-center gap-1">
              Press <Kbd>Ctrl</Kbd>
              <Kbd>Enter</Kbd> to send
            </span>
          </EmptyState>
        )}
      </div>
    );
  }

  const { outcome } = result;
  const passed = result.tests.filter((t) => t.passed).length;
  const mood: ArioMood =
    outcome.kind === "http"
      ? moodForHttpStatus(outcome.response.status)
      : outcome.kind === "grpc"
        ? moodForGrpcStatus(outcome.response.statusName)
        : "error";
  const tabs: Array<{ id: Section; label: string; badge?: ReactNode }> = [
    { id: "body", label: outcome.kind === "grpc" ? "Messages" : "Body" },
  ];
  if (outcome.kind === "http") {
    tabs.push(
      { id: "headers", label: "Headers", badge: outcome.response.headers.length },
      { id: "cookies", label: "Cookies", badge: cookiesOf(outcome.response).length },
    );
  }
  if (outcome.kind === "grpc") {
    tabs.push({
      id: "headers",
      label: "Metadata",
      badge: outcome.response.headers.length + outcome.response.trailers.length,
    });
  }
  tabs.push({
    id: "tests",
    label: "Tests",
    badge: result.tests.length ? (
      <span className={passed === result.tests.length ? "text-success" : "text-danger"}>
        {passed}/{result.tests.length} passed
      </span>
    ) : undefined,
  });
  // Console only appears when a script actually logged something.
  if (result.logs.length) tabs.push({ id: "console", label: "Console", badge: result.logs.length });
  const current = tabs.some((t) => t.id === section) ? section : "body";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line pr-1 pl-3">
        <Ario
          mood={running ? "thinking" : mood}
          size={20}
          label={`Ario is ${moodLabel[running ? "thinking" : mood]}`}
          className={moodTextClass[running ? "thinking" : mood]}
        />
        {outcome.kind === "http" && (
          <>
            <Chip className={statusTextClass(outcome.response.status)}>
              {outcome.response.status} {outcome.response.statusText}
            </Chip>
            <Chip>{formatDuration(outcome.response.timeMs)}</Chip>
            <Chip>{formatBytes(outcome.response.size)}</Chip>
          </>
        )}
        {outcome.kind === "grpc" && (
          <>
            <Chip className={outcome.response.ok ? "text-success" : "text-danger"}>
              {outcome.response.statusCode} {outcome.response.statusName}
            </Chip>
            <Chip>{formatDuration(outcome.response.timeMs)}</Chip>
          </>
        )}
        {outcome.kind === "error" && <Chip className="text-danger">Error</Chip>}
        {toggle}
      </div>
      <Tabs value={current} onChange={setSection} tabs={tabs} />
      <div className="flex min-h-0 flex-1 flex-col">
        {current === "body" &&
          (outcome.kind === "grpc" ? (
            <GrpcTimeline result={result} response={outcome.response} />
          ) : (
            <BodySection result={result} />
          ))}
        {current === "headers" && <HeadersSection result={result} />}
        {current === "cookies" && outcome.kind === "http" && (
          <div className="min-h-0 flex-1 overflow-y-auto pt-2">
            <HeaderTable rows={cookiesOf(outcome.response)} empty="No cookies were set." />
          </div>
        )}
        {current === "tests" && <TestsSection result={result} />}
        {current === "console" && <ConsoleSection logs={result.logs} />}
      </div>
    </div>
  );
}

function BodySection({ result }: { result: RunResult }) {
  const { outcome } = result;
  const [view, setView] = useState<BodyView>("pretty");
  const [wrap, setWrap] = useState(false);

  const { text, language, http } = useMemo(() => {
    if (outcome.kind !== "http") return { text: "", language: "text" as const, http: undefined };
    const ct =
      outcome.response.headers
        .find((h) => h.key.toLowerCase() === "content-type")
        ?.value.toLowerCase() ?? "";
    let lang = languageFor(ct);
    if (lang === "text" && /^\s*[[{]/.test(outcome.response.body)) lang = "json";
    return { text: outcome.response.body, language: lang, http: outcome.response };
  }, [outcome]);

  if (outcome.kind === "error") {
    return (
      <ErrorNote mood="error" className="m-3">
        <p className="font-medium">Could not get a response</p>
        <p className="mt-1 font-mono text-fg">{outcome.message}</p>
      </ErrorNote>
    );
  }

  const contentType =
    http?.headers.find((h) => h.key.toLowerCase() === "content-type")?.value ?? "";
  const canPreview = http && (http.isBinary ? /^image\//i.test(contentType) : language === "html");
  const shown = view === "raw" ? text : prettyBody(text, language);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 px-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "pretty", label: "Pretty" },
            { value: "raw", label: "Raw" },
            ...(canPreview ? [{ value: "preview" as const, label: "Preview" }] : []),
          ]}
        />
        <span className="ml-auto flex items-center">
          <ThemeMenu />
          <IconButton
            icon="wrap"
            label={wrap ? "Disable line wrap" : "Wrap lines"}
            onClick={() => setWrap(!wrap)}
            className={wrap ? "text-accent" : ""}
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
            <div className="flex h-full items-center justify-center overflow-auto p-4">
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
          <EmptyState title="Binary response" mood="curious">
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
          <p className="p-3 text-xs text-subtle">The response body is empty.</p>
        )}
      </div>
    </div>
  );
}

/** Sent and received messages in order, with the final status. */
function GrpcTimeline({ result, response }: { result: RunResult; response: GrpcResponseData }) {
  const sent = useMemo(() => {
    const body = result.sent?.body ?? "";
    try {
      const parsed: unknown = JSON.parse(body);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return body ? [body] : [];
    }
  }, [result.sent]);

  const finishedAt = result.startedAt + Math.round(response.timeMs);
  const json = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));
  const all = response.messages.map(json).join("\n");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center px-3 text-xs text-subtle">
        {sent.length} sent · {response.messages.length} received
        <IconButton
          icon="copy"
          label="Copy received messages"
          onClick={() => void copy(all)}
          disabled={!all}
          className="ml-auto"
        />
      </div>
      <ol className="selectable min-h-0 flex-1 overflow-y-auto border-t border-line">
        {sent.map((m, i) => (
          <TimelineItem key={`s${i}`} direction="sent" time={clock(result.startedAt)}>
            {json(m)}
          </TimelineItem>
        ))}
        {response.messages.map((m, i) => (
          <TimelineItem
            key={`r${i}`}
            direction="received"
            // Per-message arrival times are not reported; the last one closes the call.
            time={i === response.messages.length - 1 ? clock(finishedAt) : `#${i + 1}`}
          >
            {json(m)}
          </TimelineItem>
        ))}
        <li className="flex items-center gap-2 px-3 py-2 text-xs">
          <span className="w-4" />
          <span className="w-24 shrink-0 font-mono text-subtle">{clock(finishedAt)}</span>
          {response.ok ? (
            <span className="flex items-center gap-2 text-success">
              <Ario mood="happy" size={18} className="text-success" /> Completed · OK
            </span>
          ) : (
            <ErrorNote
              mood={moodForGrpcStatus(response.statusName) === "error" ? "error" : "sad"}
              className="flex-1"
            >
              {response.statusName}
              {response.statusMessage && `: ${response.statusMessage}`}
            </ErrorNote>
          )}
        </li>
      </ol>
    </div>
  );
}

function TimelineItem({
  direction,
  time,
  children,
}: {
  direction: "sent" | "received";
  time: string;
  children: string;
}) {
  return (
    <li className="flex items-start gap-2 border-b border-line px-3 py-2 text-xs">
      <Icon
        name={direction === "sent" ? "arrowUp" : "arrowDown"}
        size={14}
        className="mt-px shrink-0 text-subtle"
        aria-label={direction}
      />
      <span className="w-24 shrink-0 font-mono text-subtle">{time}</span>
      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-pre-wrap">
        {children}
      </pre>
    </li>
  );
}

function HeaderTable({
  rows,
  empty = "None.",
}: {
  rows: Array<{ key: string; value: string }>;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="px-3 py-2 text-xs text-subtle">{empty}</p>;
  return (
    <table className="selectable mx-3 mb-3 w-[calc(100%-1.5rem)] table-fixed border-collapse text-xs">
      <tbody>
        {rows.map((h, i) => (
          <tr key={`${h.key}-${i}`} className="border-b border-line">
            <td className="h-8 w-1/3 pr-3 align-middle font-mono break-words text-muted">
              {h.key}
            </td>
            <td className="py-2 font-mono break-all">{h.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="px-3 pt-3 pb-1 text-xs text-subtle">{children}</h4>;
}

function HeadersSection({ result }: { result: RunResult }) {
  const { outcome, sent } = result;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {outcome.kind === "http" && <HeaderTable rows={outcome.response.headers} />}
      {outcome.kind === "grpc" && (
        <>
          <SectionTitle>Headers</SectionTitle>
          <HeaderTable rows={outcome.response.headers} />
          <SectionTitle>Trailers</SectionTitle>
          <HeaderTable rows={outcome.response.trailers} />
        </>
      )}
      {sent && (
        <details className="px-3 pb-3 text-xs">
          <summary className="cursor-pointer py-2 text-subtle hover:text-fg">Request sent</summary>
          <p className="selectable mb-2 font-mono break-all">
            {sent.method} {sent.url}
          </p>
          <table className="selectable w-full table-fixed border-collapse">
            <tbody>
              {sent.headers.map((h, i) => (
                <tr key={`${h.key}-${i}`} className="border-b border-line">
                  <td className="h-8 w-1/3 pr-3 font-mono text-muted">{h.key}</td>
                  <td className="py-2 font-mono break-all">{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sent.body && (
            <pre className="selectable mt-2 max-h-80 overflow-auto rounded-md border border-line p-2 font-mono whitespace-pre-wrap">
              {sent.body}
            </pre>
          )}
        </details>
      )}
    </div>
  );
}

function TestsSection({ result }: { result: RunResult }) {
  if (result.tests.length === 0) {
    return (
      <EmptyState title="No tests ran" mood="curious" className="flex-1">
        Add assertions in the request's Tests tab, or use aq.test() in a script.
      </EmptyState>
    );
  }
  const failed = result.tests.filter((t) => !t.passed).length;
  const mood: ArioMood = failed ? "sad" : "happy";
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      <li className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
        <Ario mood={mood} size={20} className={moodTextClass[mood]} />
        {failed
          ? `${failed} of ${result.tests.length} failed`
          : `All ${result.tests.length} passed`}
      </li>
      {result.tests.map((t, i) => (
        <li key={i} className="flex items-start gap-2 border-b border-line px-3 py-2 text-xs">
          <Icon
            name={t.passed ? "check" : "x"}
            size={14}
            className={cn("mt-px shrink-0", t.passed ? "text-success" : "text-danger")}
          />
          <span className="min-w-0">
            <span className="block text-sm">{t.name}</span>
            {t.message && (
              <span className="selectable block font-mono break-words text-muted">{t.message}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ConsoleSection({ logs }: { logs: string[] }) {
  return (
    <pre className="selectable min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
      {logs.map((line, i) => (
        <div
          key={i}
          className={cn(
            line.startsWith("[error]") && "text-danger",
            line.startsWith("[warn]") && "text-warning",
          )}
        >
          {line}
        </div>
      ))}
    </pre>
  );
}
