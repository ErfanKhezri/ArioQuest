import { useEffect } from "react";
import { t } from "@/i18n";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

/** Global keyboard shortcuts (Ctrl on Windows/Linux, Cmd on macOS). */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const s = useWorkspace.getState();
      const key = e.key.toLowerCase();
      const tabId = s.activeTabId;
      const inWorkspace = s.view === "workspace";

      // While a dialog is open only the palette toggle applies.
      if (s.dialog && !(key === "k" && s.dialog.type === "palette")) return;

      let handled = true;
      if (key === "k") {
        if (s.dialog) s.closeDialog();
        else s.openDialog({ type: "palette" });
      } else if (key === "enter" && tabId && inWorkspace) {
        if (s.running[tabId]) s.cancelTab(tabId);
        else void s.sendTab(tabId);
      } else if (key === "s" && tabId && inWorkspace) {
        if (s.saveTab(tabId)) notify.success(t("notices.saved"));
      } else if (key === "n" && e.shiftKey) {
        s.createCollection(t("defaults.newCollection"));
        s.showSection("collections");
        notify.success(t("shortcuts.collectionCreated"));
      } else if (key === "n") {
        s.newTab("http");
      } else if (key === "w" && tabId && inWorkspace) {
        s.closeTab(tabId);
      } else if (key === "o") {
        s.openDialog({ type: "import" });
      } else if (key === "e") {
        // Cycle through environments, including "none".
        const ids = [null, ...s.environments.map((env) => env.id)];
        const next = ids[(ids.indexOf(s.activeEnvironmentId) + 1) % ids.length] ?? null;
        // The status bar shows the switch; no toast needed.
        s.setActiveEnvironment(next);
      } else if (key === "tab" && inWorkspace && s.tabs.length > 1) {
        const i = s.tabs.findIndex((t) => t.id === tabId);
        const next = s.tabs[(i + (e.shiftKey ? -1 : 1) + s.tabs.length) % s.tabs.length];
        if (next) s.activateTab(next.id);
      } else {
        handled = false;
      }
      if (handled) {
        // Capture phase + stopPropagation keeps editors (e.g. CodeMirror's
        // Ctrl+Enter "insert line") from also acting on the shortcut.
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
