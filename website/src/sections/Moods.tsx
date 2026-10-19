import { m, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ario, type ArioMood } from "@/components/ui/Ario";
import { moodTextClass } from "@/components/ui/arioMood";
import { cn } from "@/lib/cn";
import { group, inView, rise } from "../lib/motion";

/** Calls `tick` every `ms` while the tile is on screen and motion is allowed. */
function useLoop(ref: React.RefObject<HTMLElement | null>, ms: number, tick: () => void) {
  const visible = useInView(ref, { amount: 0.4 });
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!visible || reduced) return;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [visible, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
}

interface TileProps {
  field: string;
  strip: string;
  values: [string, string, string, string];
  message: string;
  children: ReactNode;
}

/** A field with Ario in it and a label strip attached beneath, like a print with its tag. */
function Tile({ field, strip, values, message, children }: TileProps) {
  return (
    <m.figure variants={rise} className="flex flex-col">
      <div className={cn("flex aspect-square items-center justify-center overflow-hidden", field)}>
        {children}
      </div>
      <figcaption
        className={cn(
          "text-small flex min-h-24 flex-col justify-between gap-2 p-3 tabular-nums",
          strip,
        )}
      >
        <span dir="ltr" className="flex flex-wrap justify-between gap-x-3">
          {values.map((v, i) => (
            <span key={i}>{v}</span>
          ))}
        </span>
        <span className="font-medium">{message}</span>
      </figcaption>
    </m.figure>
  );
}

const big = "h-auto w-[58%]";

function Timeout() {
  const ref = useRef<HTMLDivElement>(null);
  const [tenths, setTenths] = useState(300);
  useLoop(ref, 100, () => setTenths((t) => (t >= 340 ? 0 : t + 10)));
  const timedOut = tenths >= 300;
  const mood: ArioMood = timedOut ? "error" : "thinking";

  return (
    <div ref={ref} className="flex size-full flex-col items-center justify-center gap-2">
      <m.div
        key={String(timedOut)}
        animate={timedOut ? { x: [0, -8, 8, -5, 5, 0] } : { y: [0, -4, 0] }}
        transition={timedOut ? { duration: 0.5 } : { duration: 1.2, repeat: Infinity }}
        className="flex w-full justify-center"
      >
        <Ario mood={mood} className={cn(big, "transition-colors", moodTextClass[mood])} />
      </m.div>
      <span
        className={cn(
          "text-small font-medium tabular-nums",
          timedOut ? "text-danger" : "text-muted",
        )}
      >
        {(Math.min(tenths, 300) / 10).toFixed(1)} s
      </span>
    </div>
  );
}

function NotFound() {
  const ref = useRef<HTMLDivElement>(null);
  const [looking, setLooking] = useState(false);
  useLoop(ref, 1400, () => setLooking((l) => !l));
  const mood: ArioMood = looking ? "curious" : "sad";

  return (
    <div ref={ref} className="flex size-full items-center justify-center">
      <m.div
        animate={{ rotate: looking ? 6 : -3, x: looking ? 10 : 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        className="flex w-full justify-center"
      >
        <Ario mood={mood} className={cn(big, moodTextClass[mood])} />
      </m.div>
    </div>
  );
}

function ServerError() {
  return (
    <m.div
      animate={{ x: [0, -10, 10, -7, 7, 0], rotate: [0, -5, 5, -3, 3, 0] }}
      transition={{ duration: 0.55, repeat: Infinity, repeatDelay: 1.8 }}
      className="flex w-full justify-center"
    >
      <Ario mood="error" className={cn(big, "text-danger")} />
    </m.div>
  );
}

function Network() {
  return (
    <m.div
      animate={{ y: [0, -14, 0], rotate: [-8, 6, -8] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="flex w-full justify-center"
    >
      <Ario mood="error" className={cn(big, "text-danger")} />
    </m.div>
  );
}

export default function Moods() {
  const { t } = useTranslation("site");
  return (
    <m.section {...inView} className="page py-24 lg:py-40">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <m.h2 variants={rise} className="text-title font-semibold lg:col-span-6">
          {t("moods.title")}
        </m.h2>
        <m.p variants={rise} className="max-w-[52ch] lg:col-span-6 lg:pt-2">
          {t("moods.body")}
        </m.p>
      </div>

      <m.div variants={group} className="mt-12 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <Tile
          field="bg-panel"
          strip="bg-panel-2 text-fg"
          values={["GET", "/reports", "30 000 ms", "—"]}
          message={t("moods.timedOut")}
        >
          <Timeout />
        </Tile>
        <Tile
          field="bg-warning/12"
          strip="bg-warning text-canvas"
          values={["GET", "/posts/0", "96 ms", "2 B"]}
          message="404 Not Found"
        >
          <NotFound />
        </Tile>
        <Tile
          field="bg-danger/12"
          strip="bg-danger text-canvas"
          values={["POST", "/orders", "1 204 ms", "87 B"]}
          message="500 Internal Server Error"
        >
          <ServerError />
        </Tile>
        <Tile
          field="bg-panel"
          strip="bg-fg text-canvas"
          values={["GET", "localhost:3000", "—", "—"]}
          message={t("moods.refused")}
        >
          <Network />
        </Tile>
      </m.div>
    </m.section>
  );
}
