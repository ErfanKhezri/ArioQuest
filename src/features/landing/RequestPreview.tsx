import { Icon } from "@/components/ui/Icon";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { cn } from "@/lib/cn";

type TokenKind = "punct" | "key" | "string" | "number" | "bool";

const tokenClasses: Record<TokenKind, string> = {
  punct: "text-subtle",
  key: "text-brand-600 dark:text-brand-300",
  string: "text-emerald-600 dark:text-emerald-400",
  number: "text-amber-600 dark:text-amber-400",
  bool: "text-pink-600 dark:text-pink-400",
};

type Line = { indent: number; tokens: Array<[TokenKind, string]> };

const response: Line[] = [
  { indent: 0, tokens: [["punct", "{"]] },
  {
    indent: 1,
    tokens: [
      ["key", '"id"'],
      ["punct", ": "],
      ["string", '"usr_8f2a91"'],
      ["punct", ","],
    ],
  },
  {
    indent: 1,
    tokens: [
      ["key", '"name"'],
      ["punct", ": "],
      ["string", '"Nova Explorer"'],
      ["punct", ","],
    ],
  },
  {
    indent: 1,
    tokens: [
      ["key", '"plan"'],
      ["punct", ": "],
      ["string", '"pro"'],
      ["punct", ","],
    ],
  },
  {
    indent: 1,
    tokens: [
      ["key", '"verified"'],
      ["punct", ": "],
      ["bool", "true"],
      ["punct", ","],
    ],
  },
  {
    indent: 1,
    tokens: [
      ["key", '"quests"'],
      ["punct", ": "],
      ["number", "42"],
      ["punct", ","],
    ],
  },
  {
    indent: 1,
    tokens: [
      ["key", '"roles"'],
      ["punct", ": ["],
      ["string", '"admin"'],
      ["punct", ", "],
      ["string", '"qa"'],
      ["punct", "]"],
    ],
  },
  { indent: 0, tokens: [["punct", "}"]] },
];

const requestTabs = ["Params", "Headers", "Body", "Auth", "Tests"];

export function RequestPreview() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-linear-135 from-brand-500/25 via-accent-500/10 to-transparent blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/10 dark:shadow-black/40">
        {/* Tab strip */}
        <div className="flex items-center gap-1 border-b border-line bg-panel-2/60 px-2 pt-2">
          <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-line bg-panel px-3 py-1.5 text-xs">
            <MethodBadge method="GET" className="w-auto" />
            <span className="font-medium">Get user profile</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-subtle">
            <MethodBadge method="POST" className="w-auto opacity-70" />
            <span>Create order</span>
          </div>
          <span className="ml-auto flex items-center gap-1.5 pr-2 pb-1 text-[11px] text-subtle">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Staging
          </span>
        </div>

        {/* URL bar */}
        <div className="flex items-center gap-2 p-3">
          <div className="flex h-9 flex-1 items-center gap-3 rounded-lg border border-line bg-panel-2/60 px-3 font-mono text-xs">
            <MethodBadge method="GET" className="w-auto" />
            <span className="truncate">
              <span className="rounded bg-brand-500/12 px-1 py-0.5 text-brand-600 dark:text-brand-300">
                {"{{baseUrl}}"}
              </span>
              <span className="text-muted">/v1/users/me</span>
            </span>
          </div>
          <div className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-medium text-white">
            <Icon name="send" size={14} />
            Send
          </div>
        </div>

        <div className="flex gap-4 border-b border-line px-4 text-xs text-subtle">
          {requestTabs.map((tab, i) => (
            <span
              key={tab}
              className={cn("pb-2", i === 1 && "border-b-2 border-brand-500 font-medium text-fg")}
            >
              {tab}
              {tab === "Headers" && <span className="ml-1 text-subtle">3</span>}
              {tab === "Tests" && <span className="ml-1 text-emerald-500">4</span>}
            </span>
          ))}
        </div>

        {/* Response */}
        <div className="flex items-center gap-3 px-4 pt-3 text-xs">
          <span className="font-medium text-muted">Response</span>
          <span className="rounded-md bg-emerald-500/12 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
            200 OK
          </span>
          <span className="text-subtle">142 ms</span>
          <span className="text-subtle">1.2 KB</span>
        </div>

        <pre className="px-4 py-3 font-mono text-[12.5px] leading-6">
          {response.map((line, i) => (
            <div
              key={i}
              className="flex motion-safe:animate-fade-up"
              style={{ animationDelay: `${300 + i * 70}ms` }}
            >
              <span className="w-7 shrink-0 text-right text-subtle/60 select-none">{i + 1}</span>
              <span style={{ paddingLeft: `${1 + line.indent * 1.25}rem` }}>
                {line.tokens.map(([kind, text], j) => (
                  <span key={j} className={tokenClasses[kind]}>
                    {text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </pre>

        <div className="flex items-center gap-2 border-t border-line bg-panel-2/60 px-4 py-2.5 text-xs">
          <Icon name="checkCircle" size={15} className="text-emerald-500" />
          <span className="font-medium">4 / 4 tests passed</span>
          <span className="ml-auto flex items-center gap-1 text-subtle">
            <Icon name="play" size={13} className="text-brand-500" />
            Run the whole collection
          </span>
        </div>
      </div>
    </div>
  );
}
