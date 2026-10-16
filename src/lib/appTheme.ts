import { useSyncExternalStore } from "react";

export type AppMode = "dark" | "light";

/** The app's light/dark theme, read from `<html data-theme>` (set by the nav rail toggle). */
export const getAppMode = (): AppMode =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

export function subscribeAppMode(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export const useAppMode = () => useSyncExternalStore(subscribeAppMode, getAppMode);
