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

/** Underlined tab strip, matching the request preview on the landing page. */
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
      className={cn("flex items-center gap-4 border-b border-line px-4 text-xs", className)}
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
              "-mb-px flex items-center gap-1 border-b-2 pt-2 pb-2 transition-colors focus-visible:outline-none",
              active
                ? "border-brand-500 font-medium text-fg"
                : "border-transparent text-subtle hover:text-fg",
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== null && tab.badge !== 0 && (
              <span className="text-[10px] text-subtle">{tab.badge}</span>
            )}
          </button>
        );
      })}
      {trailing && <div className="ml-auto flex items-center gap-1">{trailing}</div>}
    </div>
  );
}

/** Pill-style segmented control for small option sets. */
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
    <div className={cn("inline-flex flex-wrap gap-0.5 rounded-lg bg-panel-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            o.value === value
              ? "bg-panel text-fg shadow-sm ring-1 ring-line"
              : "text-subtle hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
