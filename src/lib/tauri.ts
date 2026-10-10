import { invoke } from "@tauri-apps/api/core";

/**
 * Typed contract for every Rust command exposed via `tauri::generate_handler!`.
 * Keep this in sync with `src-tauri/src/commands`.
 */
interface CommandMap {
  get_app_info: { args: undefined; result: AppInfo };
}

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

type CommandName = keyof CommandMap;

export function invokeCommand<C extends CommandName>(
  command: C,
  ...args: CommandMap[C]["args"] extends undefined ? [] : [CommandMap[C]["args"]]
): Promise<CommandMap[C]["result"]> {
  return invoke<CommandMap[C]["result"]>(command, args[0]);
}

/** True when running inside the Tauri webview (false in a plain browser). */
export const isTauri = (): boolean => "__TAURI_INTERNALS__" in window;
