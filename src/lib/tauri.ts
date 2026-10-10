import { invoke } from "@tauri-apps/api/core";
import type { GrpcResponseData, GrpcSchema, HttpResponseData, ProtoFile } from "@/core/types";

/**
 * Typed contract for every Rust command exposed via `tauri::generate_handler!`.
 * Keep this in sync with `src-tauri/src/commands`.
 */
interface CommandMap {
  get_app_info: { args: undefined; result: AppInfo };
  send_http_request: { args: { payload: HttpRequestPayload }; result: HttpResponseData };
  cancel_request: { args: { requestId: string }; result: boolean };
  clear_cookies: { args: undefined; result: void };
  grpc_describe: { args: { source: GrpcSchemaSource }; result: GrpcSchema };
  grpc_invoke: { args: { payload: GrpcInvokePayload }; result: GrpcResponseData };
  store_read: { args: { key: string }; result: string | null };
  store_write: { args: { key: string; value: string }; result: void };
  write_text_file: { args: { path: string; contents: string }; result: void };
}

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

export interface WireKeyValue {
  key: string;
  value: string;
}

export type HttpBodyPayload =
  | { type: "text"; content: string }
  | { type: "urlEncoded"; fields: WireKeyValue[] }
  | {
      type: "multipart";
      fields: Array<{
        key: string;
        value: string;
        file?: { name: string; base64: string; contentType?: string };
      }>;
    }
  | { type: "binary"; base64: string };

export interface HttpRequestPayload {
  requestId: string;
  method: string;
  url: string;
  headers: WireKeyValue[];
  body?: HttpBodyPayload;
  settings: { timeoutMs: number; followRedirects: boolean; verifyTls: boolean };
}

export type GrpcSchemaSource =
  | { kind: "protos"; files: ProtoFile[] }
  | { kind: "reflection"; target: string; tls: boolean; metadata: WireKeyValue[] };

export interface GrpcInvokePayload {
  requestId: string;
  target: string;
  tls: boolean;
  source: GrpcSchemaSource;
  method: string;
  body: string;
  metadata: WireKeyValue[];
  timeoutMs: number;
}

type CommandName = keyof CommandMap;

export function invokeCommand<C extends CommandName>(
  command: C,
  ...args: CommandMap[C]["args"] extends undefined ? [] : [CommandMap[C]["args"]]
): Promise<CommandMap[C]["result"]> {
  return invoke<CommandMap[C]["result"]>(command, args[0]);
}

/** True when running inside the Tauri webview (false in a plain browser). */
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
