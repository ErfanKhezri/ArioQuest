import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Ario } from "@/components/ui/Ario";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { Fragment } from "../components/Fragment";
import { inView, press, rise, sleep } from "../lib/motion";

// The script API example from the README, line for line.
const SCRIPT = [
  "// Pre-request: edit the outgoing request or set run-scoped variables",
  'aq.request.headers["X-Request-Id"] = crypto.randomUUID();',
  'aq.variables.set("now", new Date().toISOString());',
  "",
  "// Tests: aq.test / aq.expect (chai or jest style); pm.* works too",
  'aq.test("created", () => aq.response.to.have.status(201));',
  'aq.test("has an id", () => aq.expect(aq.response.json().id).to.exist);',
  'aq.environment.set("orderId", aq.response.json().id);',
  'console.log(aq.response.headers.get("content-type"));',
];

/**
 * What each line leaves behind when it runs, keyed by line index. `scope` is
 * the translated word before an info line ("Header", "Variable", …).
 */
const RESULTS: Record<
  number,
  { kind: "pass" | "info" | "log"; text: string; scope?: "header" | "variable" | "environment" }
> = {
  1: { kind: "info", scope: "header", text: "X-Request-Id = 9b2e4c1a-…" },
  2: { kind: "info", scope: "variable", text: "now = 2026-10-16T09:41:07.512Z" },
  5: { kind: "pass", text: "created" },
  6: { kind: "pass", text: "has an id" },
  7: { kind: "info", scope: "environment", text: "orderId = 101" },
  8: { kind: "log", text: "application/json; charset=utf-8" },
};
const RUNNABLE = SCRIPT.flatMap((line, i) => (line && !line.startsWith("//") ? [i] : []));

function CodeLine({ text, prefix }: { text: string; prefix: string }) {
  if (text.startsWith("//")) return <span className="text-muted">{text}</span>;
  const parts = text.replace(/\baq\./g, `${prefix}.`).split(/("[^"]*"|\b(?:aq|pm)\b|=>)/g);
  return (
    <>
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            p.startsWith('"')
              ? "text-[var(--syn-string)]"
              : p === "aq" || p === "pm"
                ? "text-[var(--syn-keyword)]"
                : p === "=>"
                  ? "text-[var(--syn-key)]"
                  : undefined
          }
        >
          {p}
        </span>
      ))}
    </>
  );
}

export default function Testing() {
  const { t } = useTranslation("site");
  const ref = useRef<HTMLPreElement>(null);
  const visible = useInView(ref, { amount: 0.5 });
  const reduced = useReducedMotion();
  const [prefix, setPrefix] = useState<"aq" | "pm">("aq");
  const [current, setCurrent] = useState(SCRIPT.length);
  const [copied, setCopied] = useState(false);

  // Step a highlight through the runnable lines, then hold the results.
  useEffect(() => {
    if (!visible || reduced) return;
    let alive = true;
    void (async () => {
      while (alive) {
        setCurrent(-1);
        await sleep(800);
        for (const line of RUNNABLE) {
          if (!alive) return;
          setCurrent(line);
          await sleep(750);
        }
        setCurrent(SCRIPT.length);
        await sleep(4500);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, reduced]);

  const ran = Object.entries(RESULTS).filter(([line]) => Number(line) <= current);
  const passed = ran.filter(([, r]) => r.kind === "pass").length;

  const copy = () => {
    void navigator.clipboard.writeText(SCRIPT.join("\n").replace(/\baq\./g, `${prefix}.`));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <m.section {...inView} className="page grid grid-cols-1 gap-10 py-24 lg:grid-cols-12 lg:gap-8 lg:py-40">
      <div className="lg:col-span-4">
        <div className="flex flex-col gap-6 lg:sticky lg:top-28">
          <m.h2 variants={rise} className="text-title font-semibold">
            {t("testing.title")}
          </m.h2>
          <m.p variants={rise} className="max-w-[44ch]">
            <Trans t={t} i18nKey="testing.body" components={{ code: <code /> }} />
          </m.p>
          <m.div variants={rise} className="flex flex-col gap-2">
            <span className="text-small text-muted">{t("testing.eitherWay")}</span>
            <div
              role="radiogroup"
              aria-label={t("testing.prefix")}
              dir="ltr"
              className="inline-flex w-fit rounded-md bg-panel-2 p-1"
            >
              {(["aq", "pm"] as const).map((p) => (
                <m.button
                  key={p}
                  {...press}
                  type="button"
                  role="radio"
                  aria-checked={prefix === p}
                  onClick={() => setPrefix(p)}
                  className={cn(
                    "text-small h-9 rounded-sm px-4 font-medium transition-colors",
                    prefix === p ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {p}.test()
                </m.button>
              ))}
            </div>
          </m.div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
        <m.div variants={rise} className="relative rounded-md bg-panel">
          <pre
            ref={ref}
            dir="ltr"
            className="overflow-x-auto pt-14 pb-4 text-left text-[13px] leading-6 sm:pt-4"
          >
            <code>
              {SCRIPT.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-4 pr-14 transition-colors duration-300",
                    i === current ? "bg-accent/15" : undefined,
                  )}
                >
                  <CodeLine text={line} prefix={prefix} />
                  {"​"}
                </div>
              ))}
            </code>
          </pre>
          <m.button
            {...press}
            type="button"
            onClick={copy}
            aria-label={t("testing.copyScript")}
            className="text-small absolute end-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-panel-2 px-2.5 text-muted transition-colors hover:text-fg"
          >
            <Icon name={copied ? "check" : "copy"} size={14} />
            {copied ? t("testing.copied") : t("testing.copy")}
          </m.button>
        </m.div>

        <m.div variants={rise} className="sm:ms-14">
          <Fragment className="min-h-[244px] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <Ario
                mood={
                  passed === 2
                    ? "happy"
                    : current >= 0 && current < SCRIPT.length
                      ? "thinking"
                      : "idle"
                }
                size={22}
                className={passed === 2 ? "text-success" : "text-accent"}
              />
              <span className="font-medium">{t("ui.tests")}</span>
              <span className={cn("tabular-nums", passed === 2 ? "text-success" : "text-muted")}>
                {t("ui.score", { passed, total: 2 })}
              </span>
            </div>
            <ul className="flex flex-col gap-1 text-xs">
              <AnimatePresence initial={false}>
                {ran.map(([line, r]) => (
                  <m.li
                    key={line}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-sm bg-panel-2/60 px-2 py-1.5"
                  >
                    {r.kind === "pass" ? (
                      <Icon name="check" size={13} className="text-success" />
                    ) : r.kind === "log" ? (
                      <Icon name="terminal" size={13} className="text-muted" />
                    ) : (
                      <Icon name="info" size={13} className="text-info" />
                    )}
                    {r.scope && <span className="text-muted">{t(`testing.${r.scope}`)}</span>}
                    <span
                      dir="ltr"
                      className={r.kind === "pass" ? "text-fg" : "font-mono text-muted"}
                    >
                      {r.text}
                    </span>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
          </Fragment>
        </m.div>
      </div>
    </m.section>
  );
}
