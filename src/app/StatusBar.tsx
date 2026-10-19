import { useTranslation } from "react-i18next";
import { EnvironmentPicker } from "@/features/workspace/EnvironmentPicker";
import { cn } from "@/lib/cn";
import { isWebDemo } from "@/lib/demo";
import { isTauri } from "@/lib/tauri";
import { useWorkspace } from "@/store/workspace";

/** Active environment on the left, connection state on the right. Nothing else. */
export function StatusBar() {
  const { t } = useTranslation();
  const running = useWorkspace((s) => Object.keys(s.running).length);
  const desktop = isTauri();

  return (
    <footer className="-mb-1 flex h-6 shrink-0 items-center justify-between px-2 text-xs text-subtle">
      <EnvironmentPicker />
      <span
        className="flex items-center gap-2"
        title={desktop ? undefined : t("status.browserPreviewHint")}
      >
        <span className={cn("size-1.5 rounded-full", desktop ? "bg-success" : "bg-warning")} />
        {running > 0
          ? t("status.sending", { count: running })
          : desktop
            ? t("status.ready")
            : isWebDemo
              ? t("status.webDemo")
              : t("status.browserPreview")}
      </span>
    </footer>
  );
}
