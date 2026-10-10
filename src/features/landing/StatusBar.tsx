import { Icon } from "@/components/ui/Icon";
import { useAppInfo } from "@/hooks/useAppInfo";

export function StatusBar() {
  const { info, error } = useAppInfo();

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-panel px-4 text-[11px] text-subtle">
      <span className="flex items-center gap-1.5">
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-500 motion-safe:animate-ping-slow" />
          <span className="relative size-1.5 rounded-full bg-emerald-500" />
        </span>
        Local workspace
      </span>
      <span className="flex items-center gap-1.5">
        <Icon name="globe" size={12} />
        No environment
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <Icon name="bolt" size={12} />
        {info ? `ArioQuest v${info.version} · ${info.platform}` : (error ?? "Loading…")}
      </span>
    </footer>
  );
}
