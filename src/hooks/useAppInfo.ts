import { useEffect, useState } from "react";
import { type AppInfo, invokeCommand, isTauri } from "@/lib/tauri";

interface AppInfoState {
  info: AppInfo | null;
  error: string | null;
}

const initialState = (): AppInfoState =>
  isTauri() ? { info: null, error: null } : { info: null, error: "Not running inside Tauri" };

/** Loads basic application metadata from the Rust backend. */
export function useAppInfo(): AppInfoState {
  const [state, setState] = useState<AppInfoState>(initialState);

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;

    invokeCommand("get_app_info")
      .then((info) => {
        if (!cancelled) setState({ info, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ info: null, error: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
