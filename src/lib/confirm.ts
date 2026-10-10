import { isTauri } from "./tauri";

/** Native confirmation prompt (Tauri dialog on desktop, window.confirm in the browser). */
export async function confirmAction(message: string, title = "ArioQuest"): Promise<boolean> {
  if (isTauri()) {
    const { ask } = await import("@tauri-apps/plugin-dialog");
    return ask(message, { title, kind: "warning" });
  }
  return window.confirm(message);
}
