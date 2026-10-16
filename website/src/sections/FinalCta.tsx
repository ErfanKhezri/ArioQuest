import { m } from "motion/react";
import { useState } from "react";
import { Ario, type ArioMood } from "@/components/ui/Ario";
import { moodTextClass } from "@/components/ui/arioMood";
import { cn } from "@/lib/cn";
import { Actions } from "../components/Actions";
import { ease, inView, rise } from "../lib/motion";

/** Which face Ario makes at the link under the pointer. */
function moodFor(target: EventTarget): ArioMood {
  const href = (target as HTMLElement).closest("a")?.href ?? "";
  if (!href) return "idle";
  if (href.includes("/app")) return "curious";
  if (/releases|\.exe|\.msi/.test(href)) return "happy";
  return "thinking";
}

export default function FinalCta() {
  const [mood, setMood] = useState<ArioMood>("idle");

  return (
    <m.section {...inView} className="bg-panel">
      <div className="page grid min-h-[80svh] items-center gap-12 py-24 lg:grid-cols-12 lg:gap-8">
        <div
          className="flex flex-col gap-8 lg:col-span-7"
          onPointerOver={(e) => setMood(moodFor(e.target))}
          onPointerLeave={() => setMood("idle")}
          onFocus={(e) => setMood(moodFor(e.target))}
          onBlur={() => setMood("idle")}
        >
          <m.h2 variants={rise} className="text-hero font-semibold">
            Send your first request
          </m.h2>
          <m.p variants={rise} className="text-lead max-w-[46ch]">
            Try it in the browser right now, or install the desktop app for gRPC and requests with
            no CORS limits.
          </m.p>
          <m.div variants={rise}>
            <Actions />
          </m.div>
        </div>
        <m.div variants={rise} className="flex justify-center self-center lg:col-span-5">
          <m.div
            key={mood}
            animate={mood === "happy" ? { y: [0, -30, 0, -14, 0] } : { y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="w-2/3 max-w-[300px]"
          >
            <Ario
              mood={mood}
              animate={mood === "idle" ? "idle" : undefined}
              className={cn(
                "size-full transition-colors duration-300",
                mood === "idle" ? "text-accent" : moodTextClass[mood],
              )}
            />
          </m.div>
        </m.div>
      </div>
    </m.section>
  );
}
