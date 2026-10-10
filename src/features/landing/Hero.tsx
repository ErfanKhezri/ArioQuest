import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { RequestPreview } from "./RequestPreview";

interface HeroProps {
  query: string;
  onQueryChange: (query: string) => void;
}

const protocols = ["REST", "GraphQL", "WebSocket", "gRPC", "SSE"];

export function Hero({ query, onQueryChange }: HeroProps) {
  return (
    <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
      <div className="motion-safe:animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/8 py-1 pr-3 pl-1 text-xs font-medium text-brand-600 dark:text-brand-300">
          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            New
          </span>
          AI-generated test suites
          <Icon name="chevronRight" size={13} />
        </span>

        <h1 className="mt-5 text-5xl leading-[1.05] font-semibold tracking-tight text-balance xl:text-6xl">
          Every API,
          <br />
          one{" "}
          <span className="bg-linear-100 from-brand-500 via-brand-400 to-accent-400 bg-clip-text text-transparent">
            workspace.
          </span>
        </h1>

        <p className="mt-5 max-w-lg text-base leading-relaxed text-pretty text-muted">
          Design, debug, test and mock your APIs in a fast native app — with scripting,
          environments, visual flows and an AI copilot built in.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button size="lg">
            <Icon name="plus" size={16} />
            New request
            <span className="ml-1 flex gap-0.5 opacity-70">
              <Kbd className="border-white/25 bg-white/15 text-white">Ctrl</Kbd>
              <Kbd className="border-white/25 bg-white/15 text-white">N</Kbd>
            </span>
          </Button>
          <Button size="lg" variant="secondary">
            <Icon name="import" size={16} />
            Import collection
          </Button>
        </div>

        <label className="group mt-8 flex h-11 max-w-lg items-center gap-3 rounded-xl border border-line bg-panel px-3.5 shadow-sm transition-shadow focus-within:border-brand-500/60 focus-within:ring-4 focus-within:ring-brand-500/15">
          <Icon name="search" size={17} className="text-subtle" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search recent requests, collections…"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          />
          <span className="flex gap-0.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-subtle">
          Speaks
          {protocols.map((p) => (
            <span key={p} className="rounded-md border border-line bg-panel px-2 py-0.5 text-muted">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="motion-safe:animate-fade-up" style={{ animationDelay: "150ms" }}>
        <RequestPreview />
      </div>
    </section>
  );
}
