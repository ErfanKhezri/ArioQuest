import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import type { Session } from "@/lib/auth";
import { LiveDemo } from "./LiveDemo";
import { LoginCard } from "./LoginCard";

const features: Array<{ icon: IconName; text: string }> = [
  { icon: "layers", text: "HTTP & gRPC" },
  { icon: "beaker", text: "No-code tests & Postman-compatible scripts" },
  { icon: "folder", text: "Collections & environments" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-fg">
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" aria-hidden="true">
          <path
            d="M5 19 12 5l7 14M8.2 13.5h7.6"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-md font-medium">ArioQuest</span>
    </div>
  );
}

/** Pre-login screen: hero with a live demo on the left, sign-in card on the right. */
export function LandingPage({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  // Bumped on every failed attempt so the mascot replays its error animation.
  const [errors, setErrors] = useState(0);

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
          <h1 className="text-display font-semibold">ArioQuest</h1>
          <p className="mt-2 text-md text-muted">
            Send, test and chain HTTP &amp; gRPC requests — fast.
          </p>
        </div>
        <Mascot animate="idle" size={120} className="text-accent" />
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
        <div className="min-[900px]:hidden">
          <Logo />
        </div>
        <div
          className="relative w-full max-w-sm motion-safe:animate-enter"
          style={{ animationDelay: "120ms" }}
        >
          {errors > 0 && (
            <Mascot
              key={errors}
              animate="error"
              size={36}
              className="absolute -top-9 right-4 text-danger"
            />
          )}
          <LoginCard onSignedIn={onSignedIn} onError={() => setErrors((n) => n + 1)} />
          <p className="mt-4 text-center text-xs text-subtle">
            Your requests and collections stay on this device.
          </p>
        </div>
      </section>
    </div>
  );
}
