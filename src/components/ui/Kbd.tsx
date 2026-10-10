import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface KbdProps {
  children: ReactNode;
  className?: string;
}

/** Keyboard shortcut hint, e.g. `<Kbd>Ctrl</Kbd><Kbd>K</Kbd>`. */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-panel-2 px-1.5 font-sans text-[10px] font-medium text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
