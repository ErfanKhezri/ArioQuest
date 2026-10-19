import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ario } from "@/components/ui/Ario";
import { moodForHttpStatus, moodTextClass } from "@/components/ui/arioMood";
import { statusTextClass } from "@/components/ui/methodColors";

const VARIABLE = "{{baseUrl}}";

// Two requests take turns, so the demo shows Ario cheering a 200 and sulking at a 404.
const ROUNDS = [
  {
    url: `${VARIABLE}/users`,
    status: 200,
    chip: "200 OK · 84 ms",
    lines: [
      "[",
      '  { "id": 1, "name": "Ava Karimi", "role": "admin" },',
      '  { "id": 2, "name": "Leo Novak", "role": "qa" }',
      "]",
    ],
  },
  {
    url: `${VARIABLE}/users/999`,
    status: 404,
    chip: "404 Not Found · 31 ms",
    lines: ["{", '  "error": "User not found"', "}"],
  },
];

type Round = (typeof ROUNDS)[number];

// Timeline per round: type the URL one character per step, send, reveal the response, hold.
const timeline = (round: Round) => {
  const sending = round.url.length + 1;
  return { sending, firstLine: sending + 1, last: sending + 1 + round.lines.length };
};

function delayAfter(step: number, round: Round) {
  const { sending, last } = timeline(round);
  if (step < round.url.length) return 70;
  if (step === round.url.length) return 400;
  if (step === sending) return 800;
  if (step < last) return 160;
  return 3200;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const JSON_COLORS = [
  { test: (p: string) => p.endsWith(":"), className: "text-[var(--syn-key)]" },
  { test: (p: string) => p.startsWith('"'), className: "text-[var(--syn-string)]" },
  { test: (p: string) => /^\d+$/.test(p), className: "text-[var(--syn-number)]" },
];

/** Colors JSON keys, strings and numbers with the editor's syntax tokens. */
function JsonLine({ text }: { text: string }) {
  const parts = text.split(/("[^"]*"\s*:|"[^"]*"|\d+)/g);
  return (
    <div className="whitespace-pre">
      {parts.map((p, i) => (
        <span key={i} className={JSON_COLORS.find((c) => c.test(p))?.className ?? "text-muted"}>
          {p}
        </span>
      ))}
    </div>
  );
}

/** Requests being typed and answered, looping slowly. Static when motion is reduced. */
export function LiveDemo() {
  const { t } = useTranslation();
  const [roundIndex, setRoundIndex] = useState(0);
  const round = ROUNDS[roundIndex] as Round;
  const { sending, firstLine, last } = timeline(round);
  const [step, setStep] = useState(() => (reducedMotion() ? last : 0));

  useEffect(() => {
    if (reducedMotion()) return;
    const timer = setTimeout(
      () => {
        if (step < last) {
          setStep(step + 1);
        } else {
          setRoundIndex((roundIndex + 1) % ROUNDS.length);
          setStep(0);
        }
      },
      delayAfter(step, round),
    );
    return () => clearTimeout(timer);
  }, [step, last, round, roundIndex]);

  const typed = round.url.slice(0, Math.min(step, round.url.length));
  const variable = typed.slice(0, VARIABLE.length);
  const rest = typed.slice(VARIABLE.length);
  const typing = step <= round.url.length;
  const mood = step === sending ? "thinking" : moodForHttpStatus(round.status);

  return (
    <div
      dir="ltr"
      className="w-full max-w-md overflow-hidden rounded-md border border-line bg-panel/80 text-left backdrop-blur-sm"
    >
      <div className="flex h-9 items-center gap-2 border-b border-line px-3 font-mono text-xs">
        <span className="font-semibold text-method-get">GET</span>
        <span className="min-w-0 flex-1 truncate">
          <span className="rounded-sm bg-accent/15 text-[var(--syn-key)]">{variable}</span>
          {rest}
          {typing && (
            <span className="ml-px inline-block h-3 w-px translate-y-0.5 bg-fg motion-safe:animate-caret" />
          )}
        </span>
        <span className="rounded-sm bg-accent px-2 py-0.5 font-sans text-accent-fg">
          {t("actions.send")}
        </span>
      </div>
      <div className="h-36 px-3 py-2 font-mono text-xs">
        {step >= sending && (
          <div className="mb-2 flex items-center gap-2">
            <Ario
              key={`${roundIndex}-${mood}`}
              mood={mood}
              size={22}
              animate={mood === "happy" ? "happy" : mood === "sad" ? "error" : undefined}
              className={moodTextClass[mood]}
            />
            {step === sending ? (
              <span className="text-subtle">{t("liveDemo.sending")}</span>
            ) : (
              <span
                className={`rounded-sm border border-line px-1 ${statusTextClass(round.status)}`}
              >
                {round.chip}
              </span>
            )}
          </div>
        )}
        {step >= firstLine &&
          round.lines
            .slice(0, step - firstLine + 1)
            .map((line) => <JsonLine key={line} text={line} />)}
      </div>
    </div>
  );
}
