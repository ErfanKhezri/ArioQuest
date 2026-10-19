import { useRef, useState, type ReactNode } from "react";
import { isRtl } from "@/i18n/language";
import { cn } from "@/lib/cn";

interface SplitPaneProps {
  direction: "vertical" | "horizontal";
  first: ReactNode;
  second: ReactNode;
  /** Initial size of the first pane, as a fraction of the container. */
  initial?: number;
  min?: number;
  className?: string;
}

/** Two panes separated by a draggable divider. */
export function SplitPane({
  direction,
  first,
  second,
  initial = 0.5,
  min = 0.15,
  className,
}: SplitPaneProps) {
  const [ratio, setRatio] = useState(initial);
  const containerRef = useRef<HTMLDivElement>(null);
  const vertical = direction === "vertical";

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Right-to-left, the first pane sits on the right.
    const rtl = isRtl();
    const onMove = (ev: PointerEvent) => {
      const pos = vertical
        ? (ev.clientY - rect.top) / rect.height
        : (rtl ? rect.right - ev.clientX : ev.clientX - rect.left) / rect.width;
      setRatio(Math.min(1 - min, Math.max(min, pos)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = vertical ? "row-resize" : "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={containerRef}
      className={cn("flex min-h-0 min-w-0", vertical ? "flex-col" : "flex-row", className)}
    >
      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={{ flexBasis: `${ratio * 100}%` }}
      >
        {first}
      </div>
      <div
        role="separator"
        aria-orientation={vertical ? "horizontal" : "vertical"}
        onPointerDown={startDrag}
        onDoubleClick={() => setRatio(initial)}
        className={cn(
          "group relative shrink-0 bg-line",
          vertical ? "h-px cursor-row-resize" : "w-px cursor-col-resize",
        )}
      >
        <span
          className={cn(
            "absolute z-10 group-hover:bg-accent/40",
            vertical ? "inset-x-0 -top-1 h-2" : "inset-y-0 -start-1 w-2",
          )}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{second}</div>
    </div>
  );
}
