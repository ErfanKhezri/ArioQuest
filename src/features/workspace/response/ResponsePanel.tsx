import { useMemo, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { CodeEditor, type EditorLanguage } from "@/components/editor/CodeEditor";
import { ThemeMenu } from "@/components/editor/ThemeMenu";
import { Ario, type ArioMood } from "@/components/ui/Ario";
import { moodForGrpcStatus, moodForHttpStatus, moodTextClass } from "@/components/ui/arioMood";
import { EmptyState, ErrorNote, IconButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { statusTextClass } from "@/components/ui/methodColors";
import { Segmented, Tabs } from "@/components/ui/Tabs";
import type { GrpcResponseData, HttpResponseData, RunResult } from "@/core/types";
import { i18n, t } from "@/i18n";
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
    () => notify.success(t("notices.copied")),
    () => notify.error(t("notices.clipboardFailed")),
  );

const clock = (ts: number) =>
  `${new Date(ts).toLocaleTimeString(i18n.language, { hour12: false })}.${String(ts % 1000).padStart(3, "0")}`;

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
  const { t } = useTranslation();
  const result = useWorkspace((s) => s.results[tabId]);
  const running = useWorkspace((s) => Boolean(s.running[tabId]));
  const [section, setSection] = useState<Section>("body");

  const toggle = (
    <IconButton
      icon={layout === "vertical" ? "columns" : "rows"}
      label={layout === "vertical" ? t("response.showRight") : t("response.showBelow")}
      onClick={onToggleLayout}
      className="ms-auto"
    />
  );

  if (!result) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line ps-3 pe-1 text-xs text-subtle">
          {running && <Ario mood="thinking" size={20} className={moodTextClass.thinking} />}
          {running ? t("response.sending") : t("response.title")}
          {toggle}
        </div>
        {running ? (
          <EmptyState title={t("response.waiting")} mood="thinking" className="flex-1" />
        ) : (
          <EmptyState title={t("response.noResponse")} mood="sleepy" className="flex-1">
            <span className="inline-flex items-center gap-1">
              <Trans i18nKey="response.pressToSend" components={{ kbd: <Kbd /> }} />
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
    { id: "body", label: outcome.kind === "grpc" ? t("response.messages") : t("request.body") },
  ];
  if (outcome.kind === "http") {
    tabs.push(
      { id: "headers", label: t("request.headers"), badge: outcome.response.headers.length },
      { id: "cookies", label: t("response.cookies"), badge: cookiesOf(outcome.response).length },
    );
  }
  if (outcome.kind === "grpc") {
    tabs.push({
      id: "headers",
      label: t("request.metadata"),
      badge: outcome.response.headers.length + outcome.response.trailers.length,
    });
  }
  tabs.push({
    id: "tests",
    label: t("request.tests"),
    badge: result.tests.length ? (
      <span className={passed === result.tests.length ? "text-success" : "text-danger"}>
        {t("response.testsPassed", { passed, total: result.tests.length })}
      </span>
    ) : undefined,
  });
  // Console only appears when a script actually logged something.
  if (result.logs.length)
    tabs.push({ id: "console", label: t("response.console"), badge: result.logs.length });
  const current = tabs.some((t) => t.id === section) ? section : "body";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line ps-3 pe-1">
        <Ario
          mood={running ? "thinking" : mood}
          size={20}
          label={t("ario.is", { mood: t(`ario.moods.${running ? "thinking" : mood}`) })}
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
        {outcome.kind === "error" && <Chip className="text-danger">{t("defaults.error")}</Chip>}
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
            <HeaderTable rows={cookiesOf(outcome.response)} empty={t("response.noCookies")} />
          </div>
        )}
        {current === "tests" && <TestsSection result={result} />}
        {current === "console" && <ConsoleSection logs={result.logs} />}
      </div>
    </div>
  );
}

function BodySection({ result }: { result: RunResult }) {
  const { t } = useTranslation();
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
        <p className="font-medium">{t("response.noResponseError")}</p>
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
            { value: "pretty", label: t("response.pretty") },
            { value: "raw", label: t("response.raw") },
            ...(canPreview ? [{ value: "preview" as const, label: t("response.preview") }] : []),
          ]}
        />
        <span className="ms-auto flex items-center">
          <ThemeMenu />
          <IconButton
            icon="wrap"
            label={wrap ? t("response.unwrapLines") : t("response.wrapLines")}
            onClick={() => setWrap(!wrap)}
            className={wrap ? "text-accent" : ""}
          />
          <IconButton
            icon="copy"
            label={t("response.copyBody")}
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
                alt={t("response.imagePreview")}
                src={`data:${contentType || "image/png"};base64,${http.bodyBase64}`}
                className="max-h-full max-w-full"
              />
            </div>
          ) : (
            <iframe
              title={t("response.htmlPreview")}
              sandbox=""
              srcDoc={http.body}
              className="h-full w-full bg-white"
            />
          )
        ) : http?.isBinary ? (
          <EmptyState title={t("response.binary")} mood="curious">
            {t("response.binaryData", { size: formatBytes(http.size) })}
            {http.bodyBase64 && canPreview ? t("response.switchToPreview") : "."}
          </EmptyState>
        ) : text ? (
          <CodeEditor
            value={shown}
            readOnly
            language={view === "raw" ? "text" : language}
            wrap={wrap}
          />
        ) : (
          <p className="p-3 text-xs text-subtle">{t("response.emptyBody")}</p>
        )}
      </div>
    </div>
  );
}

/** Sent and received messages in order, with the final status. */
function GrpcTimeline({ result, response }: { result: RunResult; response: GrpcResponseData }) {
  const { t } = useTranslation();
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
        {t("response.sentReceived", { sent: sent.length, received: response.messages.length })}
        <IconButton
          icon="copy"
          label={t("response.copyReceived")}
          onClick={() => void copy(all)}
          disabled={!all}
          className="ms-auto"
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
              <Ario mood="happy" size={18} className="text-success" /> {t("response.completed")}
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
  const { t } = useTranslation();
  return (
    <li className="flex items-start gap-2 border-b border-line px-3 py-2 text-xs">
      <Icon
        name={direction === "sent" ? "arrowUp" : "arrowDown"}
        size={14}
        className="mt-px shrink-0 text-subtle"
        aria-label={t(`response.${direction}`)}
      />
      <span className="w-24 shrink-0 font-mono text-subtle">{time}</span>
      <pre
        dir="ltr"
        className="min-w-0 flex-1 overflow-x-auto text-left font-mono text-xs whitespace-pre-wrap"
      >
        {children}
      </pre>
    </li>
  );
}

function HeaderTable({
  rows,
  empty = t("response.none"),
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
            <td className="h-8 w-1/3 pe-3 align-middle font-mono break-words text-muted">
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
  const { t } = useTranslation();
  const { outcome, sent } = result;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {outcome.kind === "http" && <HeaderTable rows={outcome.response.headers} />}
      {outcome.kind === "grpc" && (
        <>
          <SectionTitle>{t("request.headers")}</SectionTitle>
          <HeaderTable rows={outcome.response.headers} />
          <SectionTitle>{t("response.trailers")}</SectionTitle>
          <HeaderTable rows={outcome.response.trailers} />
        </>
      )}
      {sent && (
        <details className="px-3 pb-3 text-xs">
          <summary className="cursor-pointer py-2 text-subtle hover:text-fg">
            {t("response.requestSent")}
          </summary>
          <p dir="ltr" className="selectable mb-2 text-left font-mono break-all">
            {sent.method} {sent.url}
          </p>
          <table className="selectable w-full table-fixed border-collapse">
            <tbody>
              {sent.headers.map((h, i) => (
                <tr key={`${h.key}-${i}`} className="border-b border-line">
                  <td className="h-8 w-1/3 pe-3 font-mono text-muted">{h.key}</td>
                  <td className="py-2 font-mono break-all">{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sent.body && (
            <pre
              dir="ltr"
              className="selectable mt-2 max-h-80 overflow-auto rounded-md border border-line p-2 text-left font-mono whitespace-pre-wrap"
            >
              {sent.body}
            </pre>
          )}
        </details>
      )}
    </div>
  );
}

function TestsSection({ result }: { result: RunResult }) {
  const { t } = useTranslation();
  if (result.tests.length === 0) {
    return (
      <EmptyState title={t("response.noTests")} mood="curious" className="flex-1">
        {t("response.noTestsHint")}
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
          ? t("response.failedOf", { failed, total: result.tests.length })
          : t("response.allPassed", { count: result.tests.length })}
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
    <pre
      dir="ltr"
      className="selectable min-h-0 flex-1 overflow-auto p-3 text-left font-mono text-xs"
    >
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
