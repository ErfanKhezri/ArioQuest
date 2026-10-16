import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A cropped piece of the real ArioQuest interface. Inside it the app's own
 * conventions apply: interface text sizes, 1px control borders, mono for code.
 */
export function Fragment({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-ui className={cn("overflow-hidden rounded-md bg-panel text-sm text-fg", className)}>
      {children}
    </div>
  );
}

const JSON_COLORS = [
  { test: (p: string) => p.endsWith(":"), className: "text-[var(--syn-key)]" },
  { test: (p: string) => p.startsWith('"'), className: "text-[var(--syn-string)]" },
  { test: (p: string) => /^-?\d/.test(p), className: "text-[var(--syn-number)]" },
  { test: (p: string) => /^(true|false|null)$/.test(p), className: "text-[var(--syn-bool)]" },
];

/** One line of JSON, colored with the editor's syntax tokens. */
export function JsonLine({ text }: { text: string }) {
  const parts = text.split(/("[^"]*"\s*:|"[^"]*"|-?\d+(?:\.\d+)?|true|false|null)/g);
  return (
    <div className="truncate whitespace-pre">
      {parts.map((p, i) => (
        <span key={i} className={JSON_COLORS.find((c) => c.test(p))?.className ?? "text-muted"}>
          {p}
        </span>
      ))}
    </div>
  );
}

/** Text with `{{variables}}` highlighted the way the URL bar shows them. */
export function VarText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{\{[^}]*\}\}?)/g).map((p, i) =>
        p.startsWith("{{") ? (
          <span key={i} className="rounded-sm bg-accent/15 text-[var(--syn-key)]">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}
