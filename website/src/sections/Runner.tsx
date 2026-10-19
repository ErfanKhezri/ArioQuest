import { m, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Ario } from "@/components/ui/Ario";
import { Icon } from "@/components/ui/Icon";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { statusTextClass } from "@/components/ui/methodColors";
import { isRtl } from "@/i18n/language";
import { cn } from "@/lib/cn";
import { Fragment } from "../components/Fragment";
import { inView, press, rise, sleep } from "../lib/motion";
import { DemoLink } from "../components/DemoLink";

const REQUESTS = [
  { name: "listPosts", method: "GET", status: 200, ms: 142, tests: 2, failed: 0 },
  { name: "getPost", method: "GET", status: 200, ms: 88, tests: 1, failed: 0 },
  { name: "createPost", method: "POST", status: 201, ms: 318, tests: 2, failed: 0 },
  { name: "updatePost", method: "PUT", status: 200, ms: 201, tests: 1, failed: 0 },
  { name: "getMissingPost", method: "GET", status: 404, ms: 96, tests: 1, failed: 1 },
  { name: "deletePost", method: "DELETE", status: 200, ms: 154, tests: 1, failed: 0 },
] as const;

type RowState = "waiting" | "running" | "done" | "skipped";

const allDone = (): RowState[] => REQUESTS.map(() => "done");

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useTranslation("site");
  const step =
    "inline-flex size-7 items-center justify-center rounded-sm text-muted hover:bg-panel-2 hover:text-fg disabled:opacity-40";
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-canvas p-0.5">
      <button
        type="button"
        className={step}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label={t("runner.fewer")}
      >
        −
      </button>
      <span className="w-5 text-center tabular-nums">{value}</span>
      <button
        type="button"
        className={step}
        disabled={value >= 3}
        onClick={() => onChange(value + 1)}
        aria-label={t("runner.more")}
      >
        +
      </button>
    </span>
  );
}

export default function Runner() {
  const { t } = useTranslation("site");
  const reduced = useReducedMotion();
  const runId = useRef(0);

  const [iterations, setIterations] = useState(2);
  const [delayMs, setDelayMs] = useState(0);
  const [stopOnFailure, setStopOnFailure] = useState(false);
  const [rows, setRows] = useState<RowState[]>(allDone);
  const [iteration, setIteration] = useState(1);
  const [running, setRunning] = useState(false);

  const run = async () => {
    const id = ++runId.current;
    const alive = () => runId.current === id;
    setRunning(true);
    outer: for (let it = 1; it <= iterations; it++) {
      setIteration(it);
      const states: RowState[] = REQUESTS.map(() => "waiting");
      setRows([...states]);
      for (let i = 0; i < REQUESTS.length; i++) {
        states[i] = "running";
        setRows([...states]);
        await sleep(reduced ? 0 : REQUESTS[i]!.ms * 2);
        if (!alive()) return;
        states[i] = "done";
        setRows([...states]);
        if (stopOnFailure && REQUESTS[i]!.failed) {
          setRows(states.map((s) => (s === "waiting" ? "skipped" : s)));
          break outer;
        }
        if (delayMs) await sleep(delayMs);
      }
      if (it < iterations) await sleep(700);
    }
    if (alive()) setRunning(false);
  };

  const stop = () => {
    runId.current++;
    setRunning(false);
  };

  const done = REQUESTS.filter((_, i) => rows[i] === "done");
  const passed = done.reduce((n, r) => n + r.tests - r.failed, 0);
  const failed = done.reduce((n, r) => n + r.failed, 0);
  const row = "flex h-11 items-center justify-between gap-3 px-4 text-sm";

  return (
    <m.section {...inView} className="page py-24 lg:py-40">
      <div className="mx-auto max-w-[1040px]">
        <m.h2 variants={rise} className="text-title font-semibold">
          {t("runner.title")}
        </m.h2>
        <m.p variants={rise} className="mt-4 max-w-[56ch]">
          {t("runner.body")}
        </m.p>

        <m.div
          variants={rise}
          // Play once when it scrolls into view.
          viewport={{ once: true, amount: 0.4 }}
          onViewportEnter={() => !reduced && void run()}
          className="mt-12"
        >
          <Fragment className="grid bg-panel md:grid-cols-[62fr_38fr]">
            {/* results */}
            <div className="flex min-w-0 flex-col p-3">
              <div className="flex h-9 items-center gap-2 px-1 text-xs">
                <Ario
                  mood={running ? "thinking" : failed ? "sad" : "happy"}
                  size={22}
                  className={running ? "text-accent" : failed ? "text-warning" : "text-success"}
                />
                <span className="font-medium">{t("ui.collection")}</span>
                <span className="text-muted tabular-nums">
                  {t("runner.iteration", { current: iteration, total: iterations })}
                </span>
                <span className="ms-auto tabular-nums">
                  <span className="text-success">{t("ui.passed", { count: passed })}</span>
                  <span className={cn("ms-3", failed ? "text-danger" : "text-muted")}>
                    {t("ui.failed", { count: failed })}
                  </span>
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {REQUESTS.map((r, i) => {
                  const state = rows[i];
                  const fail = state === "done" && r.failed > 0;
                  return (
                    <li
                      key={r.name}
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-sm px-2 text-xs transition-colors",
                        state === "running" ? "bg-accent/12" : "bg-panel-2/50",
                        fail && "bg-danger/10",
                      )}
                    >
                      <span className="flex w-4 justify-center">
                        {state === "running" && (
                          <span className="size-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                        )}
                        {state === "done" &&
                          (fail ? (
                            <Icon name="x" size={13} className="text-danger" />
                          ) : (
                            <Icon name="check" size={13} className="text-success" />
                          ))}
                      </span>
                      <MethodBadge method={r.method} className="w-11" />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          state === "skipped" ? "text-muted" : "text-fg",
                        )}
                      >
                        {t(`ui.requests.${r.name}`)}
                      </span>
                      {state === "done" && (
                        <m.span
                          initial={{ opacity: 0, x: 6 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 tabular-nums"
                        >
                          <span className={statusTextClass(r.status)}>{r.status}</span>
                          <span dir="ltr" className="hidden w-14 text-end text-muted sm:inline">
                            {r.ms} ms
                          </span>
                          <span
                            dir="ltr"
                            className={cn("w-10 text-end", fail ? "text-danger" : "text-success")}
                          >
                            {r.tests - r.failed}/{r.tests}
                          </span>
                        </m.span>
                      )}
                      {state === "skipped" && (
                        <span className="text-muted">{t("runner.skipped")}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* settings */}
            <div className="flex flex-col bg-panel-2/60 py-3">
              <p className="px-4 pb-2 text-xs font-medium text-muted">{t("runner.settings")}</p>
              <div className={row}>
                {t("runner.iterations")}
                <Stepper value={iterations} onChange={setIterations} />
              </div>
              <div className={row}>
                {t("runner.delay")}
                <span className="inline-flex rounded-md border border-line bg-canvas p-0.5">
                  {[0, 250, 500].map((ms) => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => setDelayMs(ms)}
                      aria-pressed={delayMs === ms}
                      className={cn(
                        "h-7 rounded-sm px-2 tabular-nums",
                        delayMs === ms ? "bg-panel-2 text-fg" : "text-muted hover:text-fg",
                      )}
                    >
                      {ms}
                    </button>
                  ))}
                </span>
              </div>
              <label className={cn(row, "cursor-pointer")}>
                {t("runner.stopOnFailure")}
                <button
                  type="button"
                  role="switch"
                  aria-checked={stopOnFailure}
                  onClick={() => setStopOnFailure((v) => !v)}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    stopOnFailure ? "bg-accent" : "bg-line",
                  )}
                >
                  <m.span
                    // Slides toward the end side, which is the left in Persian.
                    animate={{ x: stopOnFailure ? (isRtl() ? -16 : 16) : 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 32 }}
                    className="absolute start-0.5 top-0.5 size-4 rounded-full bg-white"
                  />
                </button>
              </label>
              <div className="mt-auto flex gap-2 px-4 pt-4">
                <m.button
                  {...press}
                  type="button"
                  onClick={running ? stop : () => void run()}
                  className={cn(
                    "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md text-sm font-medium",
                    running
                      ? "bg-panel text-fg hover:bg-canvas"
                      : "bg-accent text-accent-fg hover:bg-accent/85",
                  )}
                >
                  <Icon name={running ? "stop" : "play"} size={13} />
                  {running ? t("runner.stop") : t("runner.run")}
                </m.button>
              </div>
            </div>
          </Fragment>
        </m.div>

        <m.p variants={rise} className="text-small mt-6 text-muted">
          <Trans
            t={t}
            i18nKey="runner.demoNote"
            components={{
              demo: (
                <DemoLink className="text-fg underline underline-offset-4 hover:text-accent" />
              ),
            }}
          />
        </m.p>
      </div>
    </m.section>
  );
}
