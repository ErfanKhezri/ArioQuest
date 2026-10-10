import { useState } from "react";
import { FeatureGrid } from "./FeatureGrid";
import { Hero } from "./Hero";
import { NavRail } from "./NavRail";
import { QuickActions } from "./QuickActions";
import { RecentRequests } from "./RecentRequests";
import { CopilotCard, ShortcutsCard } from "./SidePanels";
import { StatusBar } from "./StatusBar";

/** First screen of the app: welcome hero, quick actions and recent work. */
export function LandingPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-full bg-canvas text-fg">
      <NavRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="relative flex-1 overflow-x-hidden overflow-y-auto">
          {/* Ambient background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[640px]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] bg-size-[48px_48px]" />
            <div className="absolute -top-40 left-1/4 size-[480px] rounded-full bg-brand-500/20 blur-3xl motion-safe:animate-drift" />
            <div
              className="absolute -top-20 right-0 size-[380px] rounded-full bg-accent-500/15 blur-3xl motion-safe:animate-drift"
              style={{ animationDelay: "-9s" }}
            />
          </div>

          <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-10 pt-14 pb-12">
            <Hero query={query} onQueryChange={setQuery} />
            <QuickActions />

            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <RecentRequests query={query} />
              <div className="flex flex-col gap-4">
                <CopilotCard />
                <ShortcutsCard />
              </div>
            </div>

            <FeatureGrid />
          </div>
        </main>

        <StatusBar />
      </div>
    </div>
  );
}
