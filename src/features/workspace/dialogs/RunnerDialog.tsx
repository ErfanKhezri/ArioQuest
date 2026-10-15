import { useMemo, useRef, useState } from "react";
import { Aria } from "@/components/ui/Aria";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Spinner, Toggle } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { Modal } from "@/components/ui/Modal";
import { cancelRequest } from "@/core/http";
import { executeRequest } from "@/core/runner";
import { findItem, flattenRequests, requestLabel } from "@/core/tree";
import type { RunResult } from "@/core/types";
import { uid } from "@/lib/id";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/files";
import { useWorkspace } from "@/store/workspace";

interface RunRow {
  key: string;
  iteration: number;
  name: string;
  path: string[];
  label: ReturnType<typeof requestLabel>;
  result: RunResult;
}

function outcomeStatus(result: RunResult): { text: string; ok: boolean; timeMs?: number } {
  const { outcome } = result;
  if (outcome.kind === "http") {
    return {
      text: String(outcome.response.status),
      ok: outcome.response.status < 400,
      timeMs: outcome.response.timeMs,
    };
  }
  if (outcome.kind === "grpc")
    return {
      text: outcome.response.statusName,
      ok: outcome.response.ok,
      timeMs: outcome.response.timeMs,
    };
  return { text: "Error", ok: false };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function RunnerDialog({
  collectionId,
  folderId,
}: {
  collectionId: string;
  folderId?: string;
}) {
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const collection = useWorkspace((s) => s.collections.find((c) => c.id === collectionId));

  const scope = useMemo(() => {
    if (!collection) return [];
    const folder = folderId ? findItem(collection.items, folderId) : undefined;
    return flattenRequests(folder?.type === "folder" ? folder.items : collection.items);
  }, [collection, folderId]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(scope.map((s) => s.item.id)));
  const [iterations, setIterations] = useState(1);
  const [delayMs, setDelayMs] = useState(0);
  const [stopOnFailure, setStopOnFailure] = useState(false);
  const [rows, setRows] = useState<RunRow[]>([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const stopRef = useRef<{ stopped: boolean; requestId?: string }>({ stopped: false });

  if (!collection) return null;
  const folderName = folderId ? findItem(collection.items, folderId) : undefined;
  const title = `Run ${folderName?.type === "folder" ? `${collection.name} / ${folderName.name}` : collection.name}`;

  const run = async () => {
    const queue = scope.filter((s) => selected.has(s.item.id));
    stopRef.current = { stopped: false };
    setRows([]);
    setRunning(true);
    const collected: RunRow[] = [];

    outer: for (let iteration = 1; iteration <= iterations; iteration++) {
      for (const entry of queue) {
        if (stopRef.current.stopped) break outer;
        // Read the latest saved request and state for every step.
        const state = useWorkspace.getState();
        const latest = state.collections.find((c) => c.id === collectionId);
        const item = latest && findItem(latest.items, entry.item.id);
        if (item?.type !== "request") continue;

        const requestId = uid("run");
        stopRef.current.requestId = requestId;
        setCurrent(entry.item.id);
        const result = await executeRequest(item.request, {
          store: state.variableStore(),
          protoSets: state.protoSets,
          requestId,
        });
        const row: RunRow = {
          key: `${iteration}-${entry.item.id}`,
          iteration,
          name: item.request.name,
          path: entry.path,
          label: requestLabel(item.request),
          result,
        };
        collected.push(row);
        setRows([...collected]);

        const failed = result.outcome.kind === "error" || result.tests.some((t) => !t.passed);
        if (stopOnFailure && failed) break outer;
        if (delayMs > 0) await sleep(delayMs);
      }
    }
    setCurrent(null);
    setRunning(false);
  };

  const stop = () => {
    stopRef.current.stopped = true;
    if (stopRef.current.requestId) void cancelRequest(stopRef.current.requestId);
  };

  const allTests = rows.flatMap((r) => r.result.tests);
  const passed = allTests.filter((t) => t.passed).length;
  const failedRequests = rows.filter((r) => !outcomeStatus(r.result).ok).length;
  const totalTime = rows.reduce((sum, r) => sum + (outcomeStatus(r.result).timeMs ?? 0), 0);

  return (
    <Modal
      title={title}
      onClose={() => {
        stop();
        closeDialog();
      }}
      className="max-w-4xl"
      footer={
        <>
          {rows.length > 0 && (
            <span className="mr-auto flex items-center gap-4 text-xs">
              <Aria
                mood={
                  running
                    ? "thinking"
                    : allTests.length > passed || failedRequests
                      ? "sad"
                      : "happy"
                }
                size={20}
                className={
                  running
                    ? "text-accent"
                    : allTests.length > passed || failedRequests
                      ? "text-warning"
                      : "text-success"
                }
              />
              <span className="text-success">{passed} passed</span>
              <span className={allTests.length - passed ? "text-danger" : "text-subtle"}>
                {allTests.length - passed} failed
              </span>
              <span className="text-subtle">
                {rows.length} requests{failedRequests ? ` (${failedRequests} with errors)` : ""} ·{" "}
                {formatDuration(totalTime)}
              </span>
            </span>
          )}
          {running ? (
            <Button variant="secondary" onClick={stop}>
              <Icon name="stop" size={13} /> Stop
            </Button>
          ) : (
            <Button onClick={() => void run()} disabled={selected.size === 0}>
              <Icon name="play" size={13} /> Run {selected.size} request
              {selected.size === 1 ? "" : "s"}
            </Button>
          )}
        </>
      }
    >
      <div className="grid min-h-[420px] md:grid-cols-[260px_1fr]">
        <div className="border-b border-line p-4 md:border-r md:border-b-0">
          <div className="mb-2 flex items-center justify-between text-xs text-subtle">
            <span className="font-medium">Requests</span>
            <button
              type="button"
              className="hover:text-fg"
              onClick={() =>
                setSelected(
                  selected.size === scope.length ? new Set() : new Set(scope.map((s) => s.item.id)),
                )
              }
            >
              {selected.size === scope.length ? "Select none" : "Select all"}
            </button>
          </div>
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {scope.map((s) => (
              <li key={s.item.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-xs hover:bg-panel-2">
                  <Checkbox
                    checked={selected.has(s.item.id)}
                    onChange={(checked) => {
                      const next = new Set(selected);
                      if (checked) next.add(s.item.id);
                      else next.delete(s.item.id);
                      setSelected(next);
                    }}
                  />
                  <MethodBadge method={requestLabel(s.item.request)} className="w-9 text-xs" />
                  <span className="truncate">{s.item.request.name}</span>
                </label>
              </li>
            ))}
            {scope.length === 0 && <li className="text-xs text-subtle">No requests to run.</li>}
          </ul>
          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Iterations">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={iterations}
                  onChange={(e) =>
                    setIterations(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                  }
                />
              </Field>
              <Field label="Delay (ms)">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={delayMs}
                  onChange={(e) => setDelayMs(Math.max(0, Number(e.target.value) || 0))}
                />
              </Field>
            </div>
            <Toggle
              label="Stop on first failure"
              checked={stopOnFailure}
              onChange={setStopOnFailure}
            />
            <p className="text-xs text-subtle">
              Requests run in order with the active environment. Extracted variables carry over to
              the following requests.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          {rows.length === 0 && !running ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-xs text-subtle">
              <Icon name="play" size={20} className="text-subtle" />
              Results appear here as each request finishes.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row) => {
                const status = outcomeStatus(row.result);
                const failedTests = row.result.tests.filter((t) => !t.passed).length;
                const open = expanded === row.key;
                return (
                  <li key={row.key}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : row.key)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-xs hover:bg-panel-2/60"
                    >
                      <Icon
                        name={status.ok && failedTests === 0 ? "checkCircle" : "alert"}
                        size={15}
                        className={status.ok && failedTests === 0 ? "text-success" : "text-danger"}
                      />
                      <MethodBadge method={row.label} className="w-10 text-xs" />
                      <span className="min-w-0 flex-1 truncate">
                        {row.path.length > 0 && (
                          <span className="text-subtle">{row.path.join(" / ")} / </span>
                        )}
                        <span className="font-medium">{row.name}</span>
                        {iterations > 1 && (
                          <span className="ml-2 text-xs text-subtle">#{row.iteration}</span>
                        )}
                      </span>
                      <span className={cn("font-mono", status.ok ? "text-success" : "text-danger")}>
                        {status.text}
                      </span>
                      <span className="w-16 text-right text-subtle">
                        {status.timeMs !== undefined ? formatDuration(status.timeMs) : "—"}
                      </span>
                      <span className="w-14 text-right text-subtle">
                        {row.result.tests.length
                          ? `${row.result.tests.length - failedTests}/${row.result.tests.length}`
                          : "—"}
                      </span>
                      <Icon
                        name={open ? "chevronDown" : "chevronRight"}
                        size={13}
                        className="text-subtle"
                      />
                    </button>
                    {open && (
                      <div className="space-y-1 bg-panel-2/40 px-12 py-2 text-xs">
                        {row.result.outcome.kind === "error" && (
                          <p className="selectable font-mono break-words text-danger">
                            {row.result.outcome.message}
                          </p>
                        )}
                        {row.result.tests.map((t, i) => (
                          <p key={i} className="flex items-start gap-2">
                            <Icon
                              name={t.passed ? "check" : "x"}
                              size={13}
                              className={cn(
                                "mt-px shrink-0",
                                t.passed ? "text-success" : "text-danger",
                              )}
                            />
                            <span>
                              {t.name}
                              {t.message && (
                                <span className="selectable block font-mono text-xs text-muted">
                                  {t.message}
                                </span>
                              )}
                            </span>
                          </p>
                        ))}
                        {row.result.logs.map((l, i) => (
                          <p key={`log-${i}`} className="selectable font-mono text-xs text-subtle">
                            {l}
                          </p>
                        ))}
                        {row.result.tests.length === 0 &&
                          row.result.outcome.kind !== "error" &&
                          row.result.logs.length === 0 && (
                            <p className="text-subtle">No tests defined for this request.</p>
                          )}
                      </div>
                    )}
                  </li>
                );
              })}
              {running && current && (
                <li className="flex items-center gap-3 px-4 py-2 text-xs text-subtle">
                  <Spinner className="text-accent" />
                  Running {scope.find((s) => s.item.id === current)?.item.request.name}…
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
