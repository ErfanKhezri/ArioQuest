import { t } from "@/i18n";
import { AssertionError, expect, show, type ResponseLike } from "./expect";
import type { ResponseView } from "./response";
import type { TestResult } from "./types";

export type VariableScopeName = "environment" | "globals";

export interface VariableStore {
  /** False when no environment is selected; environment writes then go to globals. */
  hasEnvironment(): boolean;
  get(scope: VariableScopeName, name: string): string | undefined;
  set(scope: VariableScopeName, name: string, value: string): void;
  unset(scope: VariableScopeName, name: string): void;
}

/** Mutable request view handed to pre-request scripts. */
export interface ScriptRequest {
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface ScriptContext {
  phase: "pre" | "test";
  request: ScriptRequest;
  response?: ResponseView;
  store: VariableStore;
  /** Variables scoped to a single run (`aq.variables.set`). */
  locals: Map<string, string>;
}

export interface ScriptOutput {
  tests: TestResult[];
  logs: string[];
}

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

const formatLog = (args: unknown[]) =>
  args.map((a) => (typeof a === "string" ? a : show(a))).join(" ");

const errorMessage = (err: unknown) =>
  err instanceof AssertionError || err instanceof Error ? err.message : String(err);

function scopeApi(store: VariableStore, scope: VariableScopeName) {
  return {
    get: (name: string) => store.get(scope, name),
    set: (name: string, value: unknown) =>
      store.set(scope, name, typeof value === "string" ? value : JSON.stringify(value)),
    unset: (name: string) => store.unset(scope, name),
    has: (name: string) => store.get(scope, name) !== undefined,
  };
}

function responseApi(view: ResponseView) {
  const headers = {
    get: (name: string) => view.headers[name.toLowerCase()],
    has: (name: string) => name.toLowerCase() in view.headers,
    toObject: () => ({ ...view.headers }),
  };
  const response: ResponseLike & Record<string, unknown> = {
    kind: view.kind,
    code: view.status,
    status: view.statusText,
    statusText: view.statusText,
    responseTime: view.timeMs,
    size: view.size,
    headers,
    text: () => view.body,
    json: () => view.json(),
  };
  Object.defineProperty(response, "to", { get: () => expect(response) });
  return response;
}

/**
 * Runs a user script with the `aq` API (also exposed as `pm`, so most
 * existing `pm` scripts work unchanged). Scripts may use `await`.
 */
export async function runScript(code: string, ctx: ScriptContext): Promise<ScriptOutput> {
  const tests: TestResult[] = [];
  const logs: string[] = [];
  if (!code.trim()) return { tests, logs };

  const pending: Array<Promise<void>> = [];
  const log =
    (level: string) =>
    (...args: unknown[]) =>
      logs.push(level === "log" ? formatLog(args) : `[${level}] ${formatLog(args)}`);

  const consoleShim = {
    log: log("log"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    debug: log("debug"),
  };

  const test = (name: string, fn: () => unknown) => {
    const record = (err?: unknown) => {
      tests.push(
        err === undefined
          ? { name, passed: true }
          : { name, passed: false, message: errorMessage(err) },
      );
    };
    try {
      const result = fn();
      if (result instanceof Promise) {
        pending.push(
          result.then(
            () => record(),
            (err: unknown) => record(err ?? "failed"),
          ),
        );
      } else {
        record();
      }
    } catch (err) {
      record(err ?? "failed");
    }
  };

  const variables = {
    get: (name: string) =>
      ctx.locals.get(name) ?? ctx.store.get("environment", name) ?? ctx.store.get("globals", name),
    set: (name: string, value: unknown) =>
      ctx.locals.set(name, typeof value === "string" ? value : JSON.stringify(value)),
    has: (name: string) => variables.get(name) !== undefined,
    unset: (name: string) => ctx.locals.delete(name),
  };

  const api = {
    test,
    expect,
    info: { phase: ctx.phase, requestName: ctx.request.name },
    request: ctx.request,
    response: ctx.response ? responseApi(ctx.response) : undefined,
    environment: scopeApi(ctx.store, "environment"),
    globals: scopeApi(ctx.store, "globals"),
    variables,
  };

  try {
    const fn = new AsyncFunction("aq", "pm", "console", "expect", code);
    await fn(api, api, consoleShim, expect);
    await Promise.all(pending);
  } catch (err) {
    const name = ctx.phase === "pre" ? t("errors.preScript") : t("errors.testScript");
    tests.push({ name, passed: false, message: errorMessage(err) });
  }
  return { tests, logs };
}
