import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface KbdProps {
  /** Optional so translations can fill it in: `<kbd>Ctrl</kbd>` in a `Trans` string. */
  children?: ReactNode;
  className?: string;
}

/** Keyboard shortcut hint, e.g. `<Kbd>Ctrl</Kbd><Kbd>K</Kbd>`. */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-line px-1 font-sans text-2xs text-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
