import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { looksLikeCurl, parseCurl } from "@/core/curl";
import type { HttpRequest } from "@/core/types";
import { JsonLine } from "../components/Fragment";
import { ease, inView, press, rise } from "../lib/motion";

const EXAMPLE = `curl -X POST https://jsonplaceholder.typicode.com/posts -H "Content-Type: application/json" -H "Authorization: Bearer 7f3c9e21" -d '{"title":"Hello from ArioQuest","userId":1}'`;

function prettyBody(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2).split("\n");
  } catch {
    return raw.split("\n");
  }
}

export default function Import() {
  const reduced = useReducedMotion();
  const [input, setInput] = useState("");
  const [request, setRequest] = useState<HttpRequest | null>(null);
  const [pasted, setPasted] = useState(false);

  // The real parser from the app: a cURL command in the URL bar becomes a request.
  const convert = (text: string) => {
    try {
      const parsed = parseCurl(text);
      setRequest(parsed);
      setInput(parsed.url);
    } catch {
      setInput(text);
    }
  };

  const paste = (text: string, delay: number) => {
    setRequest(null);
    setInput(text);
    setPasted(true);
    setTimeout(() => {
      setPasted(false);
      convert(text);
    }, delay);
  };

  const onChange = (text: string) => {
    if (looksLikeCurl(text)) paste(text, reduced ? 0 : 600);
    else {
      setInput(text);
      if (!text) setRequest(null);
    }
  };

  const method = request?.method ?? "GET";
  const headers = request?.headers.filter((h) => h.key) ?? [];
  const body = request && request.body.mode !== "none" ? prettyBody(request.body.raw) : [];

  return (
    <m.section
      {...inView}
      className="overflow-hidden bg-accent text-accent-fg"
      aria-labelledby="import-title"
    >
      <div className="page flex flex-col py-24 lg:py-36">
        <div className="grid gap-4 lg:grid-cols-12">
          <m.h2
            variants={rise}
            id="import-title"
            className="text-title font-semibold lg:col-span-6"
          >
            Paste cURL, get a request
          </m.h2>
          <m.p variants={rise} className="max-w-[52ch] lg:col-span-6 lg:pt-2">
            Paste a cURL command into the URL bar and it becomes a request, headers and body
            included. Collection files (v2.0, v2.1) and environments import too, and anything
            exports as a v2.1 collection, cURL or <code>fetch</code>.
          </m.p>
        </div>

        {/* The URL bar, at poster size. It works: paste any cURL command. */}
        <m.div
          variants={rise}
          viewport={{ once: true, amount: 0.6 }}
          onViewportEnter={() => paste(EXAMPLE, reduced ? 0 : 1400)}
          className="mt-16 min-h-[clamp(300px,24vw,420px)] lg:mt-24 lg:-mr-[5vw] lg:ml-[16%]"
        >
          <div data-ui className="rounded-md bg-panel text-[clamp(15px,1.7vw,24px)] text-fg">
            <div className="flex items-stretch gap-[0.5em] p-[0.5em]">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.span
                  key={method}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center rounded-[0.25em] bg-canvas px-[0.6em]"
                >
                  <MethodBadge method={method} className="w-auto text-[1em]" />
                </m.span>
              </AnimatePresence>
              <label className="min-w-0 flex-1">
                <span className="sr-only">URL, or paste a cURL command</span>
                <input
                  value={input}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Paste a cURL command"
                  spellCheck={false}
                  className={`h-[2.4em] w-full rounded-[0.25em] bg-canvas px-[0.6em] font-mono text-[0.8em] outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent ${pasted ? "bg-accent/25" : ""}`}
                />
              </label>
              <span className="hidden items-center rounded-[0.25em] bg-accent px-[1em] font-medium text-accent-fg sm:flex">
                Send
              </span>
            </div>

            <AnimatePresence>
              {request && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5, ease }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-[1em] px-[0.75em] pt-[0.25em] pb-[0.9em] text-[0.62em] md:grid-cols-2">
                    <div>
                      <p className="mb-[0.5em] text-muted">Headers {headers.length}</p>
                      <ul className="flex flex-col gap-[0.3em] font-mono">
                        {headers.map((h, i) => (
                          <m.li
                            key={h.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.08 }}
                            className="flex gap-[0.6em] rounded-[0.3em] bg-panel-2 px-[0.6em] py-[0.35em]"
                          >
                            <span className="text-[var(--syn-key)]">{h.key}</span>
                            <span className="truncate text-muted">{h.value}</span>
                          </m.li>
                        ))}
                        {headers.length === 0 && <li className="text-muted">None</li>}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-[0.5em] text-muted">
                        Body {body.length > 0 && `· ${request.body.mode.toUpperCase()}`}
                      </p>
                      <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        className="rounded-[0.3em] bg-panel-2 px-[0.6em] py-[0.35em] font-mono leading-[1.6]"
                      >
                        {body.length ? (
                          body.map((l, i) => <JsonLine key={i} text={l} />)
                        ) : (
                          <span className="text-muted">Empty</span>
                        )}
                      </m.div>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.div>

        <m.div variants={rise} className="mt-8 flex flex-wrap items-center gap-3 lg:ml-[16%]">
          <m.button
            {...press}
            type="button"
            onClick={() => paste(EXAMPLE, reduced ? 0 : 900)}
            className="text-small inline-flex h-11 items-center rounded-md bg-accent-fg px-4 font-medium text-[oklch(0.3_0.1_255)] transition-colors hover:bg-white"
          >
            Paste the example again
          </m.button>
          <span className="text-small">Or paste your own. It never leaves this page.</span>
        </m.div>
      </div>
    </m.section>
  );
}
