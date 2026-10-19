import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabDef<T extends string> {
  id: T;
  label: string;
  badge?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: Array<TabDef<T>>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
  trailing?: ReactNode;
}

/** Underlined tab strip. Badges show counts, e.g. "Headers 3". */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  trailing,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex h-8 shrink-0 items-stretch gap-4 border-b border-line px-3 text-sm",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "-mb-px flex items-center gap-1 border-b focus-visible:text-fg focus-visible:outline-none",
              active ? "border-accent text-fg" : "border-transparent text-subtle hover:text-fg",
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== null && tab.badge !== 0 && (
              <span className="text-xs text-subtle tabular-nums">{tab.badge}</span>
            )}
          </button>
        );
      })}
      {trailing && <div className="ms-auto flex items-center gap-1">{trailing}</div>}
    </div>
  );
}

/** Segmented control for small option sets. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap rounded-md border border-line", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-6 px-2 text-xs first:rounded-s-md last:rounded-e-md",
            o.value === value ? "bg-panel-2 text-fg" : "text-subtle hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
