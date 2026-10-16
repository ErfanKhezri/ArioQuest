import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export interface MenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  /** Renders the trigger; call `toggle` from its onClick. */
  trigger: (props: { open: boolean; toggle: (e: React.MouseEvent) => void }) => ReactNode;
  align?: "start" | "end";
}

/** Small dropdown menu rendered in a portal so it is never clipped. */
export function Menu({ items, trigger, align = "end" }: MenuProps) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnchor(open ? null : (e.currentTarget as HTMLElement).getBoundingClientRect());
  };

  useLayoutEffect(() => {
    if (!anchor || !menuRef.current) {
      setPosition(null);
      return;
    }
    const menu = menuRef.current.getBoundingClientRect();
    let left = align === "end" ? anchor.right - menu.width : anchor.left;
    left = Math.max(8, Math.min(left, window.innerWidth - menu.width - 8));
    let top = anchor.bottom + 4;
    if (top + menu.height > window.innerHeight - 8) top = Math.max(8, anchor.top - menu.height - 4);
    setPosition({ top, left });
  }, [anchor, align]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setAnchor(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAnchor(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {trigger({ open, toggle })}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[60] min-w-44 glass rounded-md border border-line p-1"
            style={position ?? { top: -9999, left: -9999 }}
          >
            {items.map((item) => (
              <div key={item.label}>
                {item.separatorBefore && <div className="my-1 h-px bg-line" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnchor(null);
                    item.onSelect();
                  }}
                  className={cn(
                    "flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-panel-2 disabled:opacity-40",
                    item.danger ? "text-danger" : "text-fg",
                  )}
                >
                  {item.icon && (
                    <Icon name={item.icon} size={14} className={item.danger ? "" : "text-subtle"} />
                  )}
                  {item.label}
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
