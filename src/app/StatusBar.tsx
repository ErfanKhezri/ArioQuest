import { EnvironmentPicker } from "@/features/workspace/EnvironmentPicker";
import { cn } from "@/lib/cn";
import { isWebDemo } from "@/lib/demo";
import { isTauri } from "@/lib/tauri";
import { useWorkspace } from "@/store/workspace";

/** Active environment on the left, connection state on the right. Nothing else. */
export function StatusBar() {
  const running = useWorkspace((s) => Object.keys(s.running).length);
  const desktop = isTauri();

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-line bg-panel px-2 text-xs text-subtle">
      <EnvironmentPicker />
      <span
        className="flex items-center gap-2"
        title={
          desktop
            ? undefined
            : "Browser preview: HTTP uses fetch (CORS applies), gRPC is unavailable"
        }
      >
        <span className={cn("size-1.5 rounded-full", desktop ? "bg-success" : "bg-warning")} />
        {running > 0
          ? `Sending ${running}…`
          : desktop
            ? "Ready"
            : isWebDemo
              ? "Web demo"
              : "Browser preview"}
      </span>
    </footer>
  );
}
