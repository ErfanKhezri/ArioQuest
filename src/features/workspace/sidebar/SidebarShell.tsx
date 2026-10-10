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
    <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-panel">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-line pr-2 pl-4">
        <h2 className="text-xs font-semibold">{title}</h2>
        <div className="flex items-center">{actions}</div>
      </header>
      {search && (
        <label className="mx-3 mt-3 flex h-8 items-center gap-2 rounded-md border border-line bg-panel-2/50 px-2.5 focus-within:border-brand-500/60">
          <Icon name="search" size={13} className="text-subtle" />
          <input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-subtle"
          />
        </label>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto py-2">{children}</div>
      {footer && <div className="border-t border-line p-3">{footer}</div>}
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
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onDone(cancelled.current ? null : e.target.value.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelled.current = true;
        if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
      }}
      className="h-6 min-w-0 flex-1 rounded border border-brand-500/60 bg-panel px-1.5 text-xs outline-none"
    />
  );
}
