import type { StateStorage } from "zustand/middleware";
import { invokeCommand, isTauri } from "./tauri";

const WRITE_DELAY_MS = 400;

/**
 * Persists state to a JSON file in the app data directory (desktop) or to
 * localStorage (browser preview). Writes are debounced because the store
 * changes on every keystroke.
 */
function createStorage(): StateStorage & { flush: () => void } {
  const pending = new Map<string, string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const write = (key: string, value: string) => {
    if (isTauri()) {
      void invokeCommand("store_write", { key, value }).catch((err: unknown) =>
        console.error("Failed to save workspace", err),
      );
    } else {
      try {
        localStorage.setItem(`arioquest:${key}`, value);
      } catch (err) {
        console.error("Failed to save workspace", err);
      }
    }
  };

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    for (const [key, value] of pending) write(key, value);
    pending.clear();
  };

  return {
    getItem: async (key) => {
      if (isTauri()) return invokeCommand("store_read", { key });
      try {
        return localStorage.getItem(`arioquest:${key}`);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      pending.set(key, value);
      clearTimeout(timer);
      timer = setTimeout(flush, WRITE_DELAY_MS);
    },
    removeItem: (key) => {
      pending.delete(key);
      if (!isTauri()) localStorage.removeItem(`arioquest:${key}`);
    },
    flush,
  };
}

export const workspaceStorage = createStorage();

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => workspaceStorage.flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") workspaceStorage.flush();
  });
}
