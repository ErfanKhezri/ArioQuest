import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/controls";

const URL = "{{baseUrl}}/users";
const VARIABLE = "{{baseUrl}}";
const JSON_LINES = [
  "[",
  '  { "id": 1, "name": "Ava Karimi", "role": "admin" },',
  '  { "id": 2, "name": "Leo Novak", "role": "qa" }',
  "]",
];

// Timeline: type the URL one character per step, send, reveal the response, hold.
const SENDING = URL.length + 1;
const FIRST_LINE = SENDING + 1;
const LAST = FIRST_LINE + JSON_LINES.length;

function delayAfter(step: number) {
  if (step < URL.length) return 70;
  if (step === URL.length) return 400;
  if (step === SENDING) return 700;
  if (step < LAST) return 160;
  return 3200;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Colors JSON keys, strings and numbers with the editor's syntax tokens. */
function JsonLine({ text }: { text: string }) {
  const parts = text.split(/("[^"]*"\s*:|"[^"]*"|\d+)/g);
  return (
    <div className="whitespace-pre">
      {parts.map((p, i) => {
        if (p.endsWith(":"))
          return (
            <span key={i} className="text-[var(--syn-key)]">
              {p}
            </span>
          );
        if (p.startsWith('"'))
          return (
            <span key={i} className="text-[var(--syn-string)]">
              {p}
            </span>
          );
        if (/^\d+$/.test(p))
          return (
            <span key={i} className="text-[var(--syn-number)]">
              {p}
            </span>
          );
        return (
          <span key={i} className="text-muted">
            {p}
          </span>
        );
      })}
    </div>
  );
}

/** A request being typed and answered, looping slowly. Static when motion is reduced. */
export function LiveDemo() {
  const [step, setStep] = useState(() => (reducedMotion() ? LAST : 0));

  useEffect(() => {
    if (reducedMotion()) return;
    const timer = setTimeout(() => setStep(step >= LAST ? 0 : step + 1), delayAfter(step));
    return () => clearTimeout(timer);
  }, [step]);

  const typed = URL.slice(0, Math.min(step, URL.length));
  const variable = typed.slice(0, VARIABLE.length);
  const rest = typed.slice(VARIABLE.length);
  const typing = step <= URL.length;

  return (
    <div className="w-full max-w-md overflow-hidden rounded-md border border-line bg-panel/80 text-left backdrop-blur-sm">
      <div className="flex h-9 items-center gap-2 border-b border-line px-3 font-mono text-xs">
        <span className="font-semibold text-method-get">GET</span>
        <span className="min-w-0 flex-1 truncate">
          <span className="rounded-sm bg-accent/15 text-[var(--syn-key)]">{variable}</span>
          {rest}
          {typing && (
            <span className="ml-px inline-block h-3 w-px translate-y-0.5 bg-fg motion-safe:animate-caret" />
          )}
        </span>
        <span className="rounded-sm bg-accent px-2 py-0.5 font-sans text-accent-fg">Send</span>
      </div>
      <div className="h-36 px-3 py-2 font-mono text-xs">
        {step === SENDING && (
          <span className="flex items-center gap-2 text-subtle">
            <Spinner className="text-accent" /> Sending…
          </span>
        )}
        {step >= FIRST_LINE && (
          <>
            <span className="mb-2 inline-block rounded-sm border border-line px-1 text-status-2xx">
              200 OK · 84 ms
            </span>
            {JSON_LINES.slice(0, step - FIRST_LINE + 1).map((line) => (
              <JsonLine key={line} text={line} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
