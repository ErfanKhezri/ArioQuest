import { useState } from "react";
import { Ario, type ArioMood } from "@/components/ui/Ario";
import { moodLabel, moodTextClass } from "@/components/ui/arioMood";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { Session } from "@/lib/auth";
import { LiveDemo } from "./LiveDemo";
import { LoginCard, type FieldName } from "./LoginCard";

const features: Array<{ icon: IconName; text: string }> = [
  { icon: "layers", text: "HTTP & gRPC" },
  { icon: "beaker", text: "No-code tests & Postman-compatible scripts" },
  { icon: "folder", text: "Collections & environments" },
];

type Phase = "idle" | "submitting" | "error" | "success";

/** What Ario does and says, based on what the user is doing in the card. */
function reaction(
  phase: Phase,
  field: FieldName | null,
  passwordVisible: boolean,
  name: string,
): { mood: ArioMood; line: string } {
  if (phase === "success") return { mood: "happy", line: `Let's go${name ? `, ${name}` : ""}!` };
  if (phase === "submitting") return { mood: "thinking", line: "Checking…" };
  if (phase === "error")
    return { mood: "sad", line: "Hmm, that didn't work. Mind checking the form?" };
  if (field === "password") {
    return passwordVisible
      ? { mood: "curious", line: "Oops, I can see it now…" }
      : { mood: "shy", line: "Don't worry, I'm not looking!" };
  }
  if (field === "name")
    return { mood: "curious", line: "Nice to meet you! What should I call you?" };
  if (field === "email") return { mood: "curious", line: "Which email should we use?" };
  return { mood: "idle", line: "Hi, I'm Ario — your API sidekick." };
}

function SpeechBubble({ children }: { children: string }) {
  return (
    <p
      aria-live="polite"
      className="relative max-w-56 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted"
    >
      {/* tail pointing at Ario */}
      <span className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45 border-b border-l border-line bg-panel" />
      <span className="relative">{children}</span>
    </p>
  );
}

/** Pre-login screen: Ario and a live demo on the left, the sign-in card on the right. */
export function LandingPage({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  // The email field is autofocused, so Ario starts out looking at it.
  const [field, setField] = useState<FieldName | null>("email");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  // Bumped on every failed attempt so Ario replays the shake.
  const [errors, setErrors] = useState(0);

  const { mood, line } = reaction(phase, field, passwordVisible, firstName);
  const animate = phase === "error" ? "error" : phase === "success" ? "happy" : "idle";
  const ario = (size: number) => (
    <Ario
      key={`${errors}-${phase === "success"}`}
      mood={mood}
      size={size}
      animate={animate}
      label={`Ario is ${moodLabel[mood]}`}
      className={phase === "error" ? moodTextClass.error : "text-accent"}
    />
  );

  const cardEvents = {
    onSubmit: () => setPhase("submitting"),
    onError: () => {
      setPhase("error");
      setErrors((n) => n + 1);
    },
    onFocusField: (next: FieldName | null) => {
      setField(next);
      // Once the user goes back to the form, Ario stops sulking.
      setPhase((p) => (p === "error" && next ? "idle" : p));
    },
    onPasswordVisibleChange: setPasswordVisible,
    onSignedIn: (session: Session) => {
      const first = session.name.split(" ")[0] ?? "";
      setFirstName(first.charAt(0).toUpperCase() + first.slice(1));
      setPhase("success");
      // Let Ario celebrate for a moment before the workspace opens.
      setTimeout(() => onSignedIn(session), 700);
    },
  };

  return (
    <div className="relative flex h-full overflow-hidden bg-canvas text-fg">
      {/* Background: faint dot grid and a slow accent-colored aurora. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(var(--line)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_center,black,transparent_75%)] bg-size-[20px_20px]" />
        <div className="absolute -top-1/3 -left-1/4 size-[70vmax] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--accent)_28%,transparent),transparent)] blur-3xl motion-safe:animate-aurora" />
        <div
          className="absolute -right-1/4 -bottom-1/2 size-[60vmax] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--accent)_18%,transparent),transparent)] blur-3xl motion-safe:animate-aurora"
          style={{ animationDelay: "-12s" }}
        />
      </div>

      <section className="relative hidden w-[60%] flex-col items-center justify-center gap-8 px-12 motion-safe:animate-enter min-[900px]:flex">
        <div className="text-center">
          <h1 className="flex items-center justify-center gap-3 text-display font-semibold">
            <Ario size={48} className="text-accent" />
            ArioQuest
          </h1>
          <p className="mt-2 text-md text-muted">
            Send, test and chain HTTP &amp; gRPC requests — fast.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {ario(128)}
          <SpeechBubble>{line}</SpeechBubble>
        </div>
        <LiveDemo />
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-2">
              <Icon name={f.icon} size={14} className="text-subtle" />
              {f.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
        {/* Narrow windows: Ario and the name stand in for the hero. */}
        <div className="flex flex-col items-center gap-2 text-center min-[900px]:hidden">
          {ario(64)}
          <span className="text-md font-medium">ArioQuest</span>
          <span className="text-sm text-muted">{line}</span>
        </div>
        <div
          className="w-full max-w-sm motion-safe:animate-enter"
          style={{ animationDelay: "120ms" }}
        >
          <LoginCard {...cardEvents} />
          <p className="mt-4 text-center text-xs text-subtle">
            Your requests and collections stay on this device.
          </p>
        </div>
      </section>
    </div>
  );
}
