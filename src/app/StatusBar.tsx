import { Icon } from "@/components/ui/Icon";
import { EnvironmentPicker } from "@/features/workspace/EnvironmentPicker";
import { useAppInfo } from "@/hooks/useAppInfo";
import { invokeCommand, isTauri } from "@/lib/tauri";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

export function StatusBar() {
  const { info, error } = useAppInfo();
  const running = useWorkspace((s) => Object.keys(s.running).length);

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-panel px-4 text-[11px] text-subtle">
      <span className="flex items-center gap-1.5">
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-500 motion-safe:animate-ping-slow" />
          <span className="relative size-1.5 rounded-full bg-emerald-500" />
        </span>
        Local workspace
      </span>
      <EnvironmentPicker compact />
      {running > 0 && (
        <span className="flex items-center gap-1.5 text-brand-500">
          <Icon name="bolt" size={12} />
          {running} request{running === 1 ? "" : "s"} in flight
        </span>
      )}
      {isTauri() && (
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-fg"
          title="Cookies set by responses are reused for later requests, like a browser"
          onClick={() =>
            void invokeCommand("clear_cookies").then(() => notify.success("Cookie jar cleared."))
          }
        >
          <Icon name="trash" size={11} />
          Clear cookies
        </button>
      )}
      <span className="ml-auto flex items-center gap-1.5">
        <Icon name="bolt" size={12} />
        {info ? `ArioQuest v${info.version} · ${info.platform}` : (error ?? "Loading…")}
      </span>
    </footer>
  );
}
