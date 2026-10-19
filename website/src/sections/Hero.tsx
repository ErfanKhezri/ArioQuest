import {
  AnimatePresence,
  m,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ario, type ArioMood } from "@/components/ui/Ario";
import { moodForHttpStatus, moodTextClass } from "@/components/ui/arioMood";
import { Icon } from "@/components/ui/Icon";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { statusTextClass } from "@/components/ui/methodColors";
import { cn } from "@/lib/cn";
import { Actions } from "../components/Actions";
import { Fragment, JsonLine, VarText } from "../components/Fragment";
import { ease, group, rise, sleep } from "../lib/motion";

// The sample collection from the web demo, against JSONPlaceholder.
const ROUNDS = [
  {
    name: "getPost",
    method: "GET",
    url: "{{baseUrl}}/posts/1",
    status: 200,
    statusText: "OK",
    meta: "142 ms · 292 B",
    tests: { passed: 2, total: 2 },
    lines: [
      "{",
      '  "userId": 1,',
      '  "id": 1,',
      '  "title": "sunt aut facere repellat provident occaecati",',
      '  "body": "quia et suscipit\\nsuscipit recusandae consequuntur"',
      "}",
    ],
  },
  {
    name: "createPost",
    method: "POST",
    url: "{{baseUrl}}/posts",
    status: 201,
    statusText: "Created",
    meta: "318 ms · 83 B",
    tests: { passed: 2, total: 2 },
    lines: ["{", '  "title": "Hello from ArioQuest",', '  "userId": 1,', '  "id": 101', "}"],
  },
  {
    name: "getMissingPost",
    method: "GET",
    url: "{{baseUrl}}/posts/0",
    status: 404,
    statusText: "Not Found",
    meta: "96 ms · 2 B",
    tests: { passed: 0, total: 1 },
    lines: ["{}"],
  },
] as const;

type Phase = "typing" | "sending" | "done";
interface Frame {
  round: number;
  typed: number;
  phase: Phase;
  lines: number;
}

const FINAL: Frame = { round: 0, typed: ROUNDS[0].url.length, phase: "done", lines: 6 };

/** Plays the rounds in a loop while the mock is on screen: type, send, stream, hold. */
function useTimeline(playing: boolean) {
  const [frame, setFrame] = useState<Frame>(FINAL);

  useEffect(() => {
    if (!playing) return;
    let alive = true;
    const show = (f: Frame) => alive && setFrame(f);

    void (async () => {
      for (let round = 0; alive; round = (round + 1) % ROUNDS.length) {
        const { url, lines } = ROUNDS[round]!;
        for (let typed = 0; typed <= url.length && alive; typed++) {
          show({ round, typed, phase: "typing", lines: 0 });
          await sleep(typed === 0 ? 500 : 55);
        }
        await sleep(350);
        show({ round, typed: url.length, phase: "sending", lines: 0 });
        await sleep(900);
        for (let n = 1; n <= lines.length && alive; n++) {
          show({ round, typed: url.length, phase: "done", lines: n });
          await sleep(110);
        }
        await sleep(3400);
      }
    })();
    return () => {
      alive = false;
    };
  }, [playing]);

  return frame;
}

function AppMock({ frame }: { frame: Frame }) {
  const { t } = useTranslation("site");
  const round = ROUNDS[frame.round]!;
  const sending = frame.phase === "sending";
  const done = frame.phase === "done";

  return (
    <Fragment className="flex h-[440px] text-start sm:h-[480px]">
      {/* sidebar */}
      <div className="hidden w-52 shrink-0 flex-col gap-0.5 bg-panel-2/60 p-2 text-xs md:flex">
        <div className="flex h-7 items-center gap-2 px-2 font-medium text-muted">
          <Icon name="folder" size={13} /> {t("ui.collection")}
        </div>
        {ROUNDS.map((r, i) => (
          <div
            key={r.name}
            className={cn(
              "flex h-7 items-center rounded-sm ps-6 pe-2",
              i === frame.round ? "bg-accent/15 text-fg" : "text-muted",
            )}
          >
            <MethodBadge method={r.method} />
            <span className="truncate">{t(`ui.requests.${r.name}`)}</span>
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* tab bar */}
        <div className="flex h-9 shrink-0 items-end gap-px bg-panel-2/60 px-1 text-xs">
          <div className="flex h-8 items-center gap-1 rounded-t-sm bg-panel px-3">
            <MethodBadge method={round.method} className="w-auto" />
            <span className="text-fg">{t(`ui.requests.${round.name}`)}</span>
          </div>
          <div className="flex h-8 items-center gap-1 px-3 text-muted">
            <MethodBadge method="GET" className="w-auto" /> {t("ui.requests.listPosts")}
          </div>
        </div>

        {/* URL bar */}
        <div className="flex items-center gap-2 p-2">
          <div className="flex min-w-0 flex-1 items-center rounded-md border border-line bg-canvas">
            <span className="border-e border-line px-2 py-1.5">
              <MethodBadge method={round.method} className="w-auto" />
            </span>
            <span className="truncate px-2 font-mono text-xs">
              <VarText text={round.url.slice(0, frame.typed)} />
              {frame.phase === "typing" && (
                <span className="ms-px inline-block h-3.5 w-px translate-y-0.5 animate-caret bg-fg" />
              )}
            </span>
          </div>
          <m.span
            animate={{ scale: sending ? 0.94 : 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className={cn(
              "inline-flex h-7 w-20 items-center justify-center gap-1.5 rounded-md text-xs font-medium",
              sending ? "bg-accent/80 text-accent-fg" : "bg-accent text-accent-fg",
            )}
          >
            {sending ? (
              <span className="size-3 animate-spin rounded-full border-2 border-accent-fg/40 border-t-accent-fg" />
            ) : (
              <Icon name="send" size={12} />
            )}
            {sending ? t("ui.sending") : t("ui.send")}
          </m.span>
        </div>

        <div className="flex gap-4 px-3 pb-2 text-xs text-muted">
          <span>{t("ui.params")}</span>
          <span>{t("ui.headers")}</span>
          <span className={round.method === "POST" ? "text-fg" : undefined}>{t("ui.body")}</span>
          <span>{t("ui.auth")}</span>
          <span>{t("ui.scripts")}</span>
          <span className={round.method === "GET" ? "text-fg" : undefined}>{t("ui.tests")}</span>
        </div>

        {/* response */}
        <div className="flex min-h-0 flex-1 flex-col bg-canvas/60">
          <div className="flex h-9 shrink-0 items-center gap-3 px-3 text-xs">
            <span className="font-medium text-fg">{t("ui.response")}</span>
            {done && (
              <m.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <span dir="ltr" className={cn("font-semibold", statusTextClass(round.status))}>
                  {round.status} {round.statusText}
                </span>
                <span dir="ltr" className="text-muted tabular-nums">
                  {round.meta}
                </span>
                <span
                  className={cn(
                    "hidden sm:inline",
                    round.status < 400 ? "text-success" : "text-warning",
                  )}
                >
                  {t("ui.testsPassed", round.tests)}
                </span>
              </m.span>
            )}
          </div>
          <div className="min-h-0 flex-1 px-3 font-mono text-xs leading-5">
            {frame.phase === "typing" && (
              <p className="pt-6 text-center font-sans text-muted">{t("ui.noResponse")}</p>
            )}
            {sending && <p className="pt-6 text-center font-sans text-muted">{t("ui.waiting")}</p>}
            {round.lines.slice(0, frame.lines).map((line, i) => (
              <m.div
                key={`${frame.round}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <JsonLine text={line} />
              </m.div>
            ))}
          </div>
        </div>
      </div>
    </Fragment>
  );
}

/** Ario sits on the window's edge and reacts to every step of the request. */
function Mascot({ frame }: { frame: Frame }) {
  const { t } = useTranslation("site");
  const round = ROUNDS[frame.round]!;
  const mood: ArioMood =
    frame.phase === "typing"
      ? "curious"
      : frame.phase === "sending"
        ? "thinking"
        : moodForHttpStatus(round.status);
  const line =
    frame.phase === "typing"
      ? t("hero.typing")
      : frame.phase === "sending"
        ? t("hero.sending")
        : t(`hero.say.${round.name}`);
  const reaction =
    frame.phase !== "done"
      ? {}
      : mood === "happy"
        ? { y: [0, -26, 0], scale: [1, 1.06, 1] }
        : { x: [0, -10, 10, -6, 6, 0], rotate: [0, -4, 4, -2, 2, 0] };

  return (
    <div className="flex items-end gap-3">
      <m.div
        key={`${frame.round}-${frame.phase}`}
        animate={reaction}
        transition={{ duration: 0.6, ease }}
        className="origin-bottom"
      >
        <Ario
          mood={mood}
          animate={frame.phase === "typing" ? "idle" : undefined}
          label={t("hero.arioSays", { line })}
          className={cn(
            "size-24 transition-colors duration-500 sm:size-36 lg:size-44",
            moodTextClass[mood],
          )}
        />
      </m.div>
      <AnimatePresence mode="wait">
        <m.p
          key={line}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease }}
          aria-live="polite"
          className="text-small mb-10 rounded-md rounded-es-none bg-panel-2 px-3 py-2 font-medium sm:mb-16"
        >
          {line}
        </m.p>
      </AnimatePresence>
    </div>
  );
}

export function Hero() {
  const { t } = useTranslation("site");
  const ref = useRef<HTMLElement>(null);
  const mockRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const visible = useInView(mockRef, { amount: 0.3 });
  const frame = useTimeline(visible && !reduced);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mockY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -80]);
  const arioY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -140]);

  return (
    <m.section
      ref={ref}
      id="top"
      initial="hidden"
      animate="show"
      variants={group}
      className="page relative isolate grid grid-cols-1 gap-8 pt-8 pb-24 sm:gap-10 sm:pt-16 lg:grid-cols-12 lg:gap-x-8 lg:pb-36"
    >
      {/* A soft glow behind the first screen on phones, where the headline stands alone. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-140 bg-[radial-gradient(ellipse_70%_55%_at_30%_25%,color-mix(in_oklch,var(--accent)_28%,transparent),transparent_70%)] lg:hidden"
      />

      <div className="flex flex-col gap-5 lg:col-span-12">
        <m.p
          variants={rise}
          className="text-small inline-flex items-center gap-2 self-start rounded-full border border-line bg-panel/70 px-3 py-1 text-muted backdrop-blur-sm lg:hidden"
        >
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          {t("hero.eyebrow")}
        </m.p>
        <m.h1 variants={rise} className="text-hero font-semibold">
          {t("hero.title")}
        </m.h1>
      </div>

      <div className="flex flex-col gap-8 lg:col-span-4 lg:pt-44">
        <m.p variants={rise} className="text-lead max-w-[34ch] text-fg">
          {t("hero.lead")}
        </m.p>
        <m.div variants={rise}>
          <Actions />
        </m.div>
      </div>

      <m.div variants={rise} className="relative mt-4 lg:col-span-8 lg:mt-0">
        <m.div style={{ y: arioY }} className="relative z-10 ms-4 -mb-3 sm:ms-10">
          <Mascot frame={frame} />
        </m.div>
        <m.div
          ref={mockRef}
          style={{ y: mockY }}
          className="rounded-md shadow-[0_24px_60px_-20px_color-mix(in_oklch,var(--accent)_45%,transparent)] ring-1 ring-line lg:shadow-none lg:ring-0"
        >
          <AppMock frame={frame} />
        </m.div>
      </m.div>
    </m.section>
  );
}
