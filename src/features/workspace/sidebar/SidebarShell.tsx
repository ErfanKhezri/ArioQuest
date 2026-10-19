import { useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

interface SidebarShellProps {
  title: string;
  actions?: ReactNode;
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  children: ReactNode;
  footer?: ReactNode;
}

export function SidebarShell({ title, actions, search, children, footer }: SidebarShellProps) {
  return (
    <aside className="glass-panel flex w-64 shrink-0 flex-col overflow-hidden bg-panel">
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-line ps-3 pe-1">
        <h2 className="text-xs text-muted">{title}</h2>
        <div className="flex items-center">{actions}</div>
      </header>
      {search && (
        <label className="mx-2 mt-2 flex h-7 items-center gap-2 rounded-md border border-line px-2 focus-within:border-accent">
          <Icon name="search" size={12} className="text-subtle" />
          <input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            dir="auto"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          />
        </label>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto py-2">{children}</div>
      {footer && <div className="border-t border-line p-2">{footer}</div>}
    </aside>
  );
}

/** Inline text field used to rename items in place. */
export function RenameInput({
  initial,
  onDone,
}: {
  initial: string;
  onDone: (value: string | null) => void;
}) {
  const cancelled = useRef(false);
  return (
    <input
      autoFocus
      defaultValue={initial}
      dir="auto"
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onDone(cancelled.current ? null : e.target.value.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelled.current = true;
        if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
      }}
      className="h-6 min-w-0 flex-1 rounded-sm border border-accent bg-panel px-1 text-sm outline-none"
    />
  );
}
