import { uid } from "@/lib/id";
import { evaluateAssertion, runExtractions } from "./assertions";
import { invokeGrpc, prepareGrpcCall } from "./grpc";
import { buildHttpPayload, describeSent, sendHttp } from "./http";
import { responseView } from "./response";
import { type ScriptRequest, type VariableStore, runScript } from "./script";
import { type VariableResolver, interpolate } from "./variables";
import { newKeyValue } from "./factory";
import type { ApiRequest, ProtoSet, RunOutcome, RunResult, SentRequestInfo } from "./types";

export interface RunContext {
  store: VariableStore;
  protoSets: ProtoSet[];
  /** Id the backend uses to cancel this call. */
  requestId?: string;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

function scriptRequestOf(request: ApiRequest): ScriptRequest {
  if (request.kind === "http") {
    return {
      name: request.name,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(
        request.headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value]),
      ),
      body: request.body.raw,
    };
  }
  return {
    name: request.name,
    method: request.method,
    url: request.target,
    headers: Object.fromEntries(
      request.metadata.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value]),
    ),
    body: request.message,
  };
}

/** Writes changes a pre-request script made to `aq.request` back onto a copy. */
function applyScriptRequest(request: ApiRequest, edited: ScriptRequest): ApiRequest {
  const copy = structuredClone(request);
  const rows = Object.entries(edited.headers ?? {}).map(([k, v]) => newKeyValue(k, String(v)));
  if (copy.kind === "http") {
    copy.url = edited.url;
    copy.method = (edited.method?.toUpperCase() as typeof copy.method) || copy.method;
    copy.body.raw = edited.body;
    // Keep disabled rows; replace enabled ones with the script's view.
    copy.headers = [...rows, ...copy.headers.filter((h) => !h.enabled)];
  } else {
    copy.target = edited.url;
    copy.message = edited.body;
    copy.metadata = [...rows, ...copy.metadata.filter((h) => !h.enabled)];
  }
  return copy;
}

/**
 * Runs one request end to end: pre-request script → variable resolution →
 * send → extractions → assertions and test script.
 */
export async function executeRequest(original: ApiRequest, ctx: RunContext): Promise<RunResult> {
  const startedAt = Date.now();
  const requestId = ctx.requestId ?? uid("run");
  const locals = new Map<string, string>();
  const resolve: VariableResolver = (name) =>
    locals.get(name) ?? ctx.store.get("environment", name) ?? ctx.store.get("globals", name);

  const logs: string[] = [];
  const tests: RunResult["tests"] = [];

  let request = original;
  if (original.preScript.trim()) {
    const scriptRequest = scriptRequestOf(original);
    const pre = await runScript(original.preScript, {
      phase: "pre",
      request: scriptRequest,
      store: ctx.store,
      locals,
    });
    logs.push(...pre.logs);
    tests.push(...pre.tests);
    request = applyScriptRequest(original, scriptRequest);
  }

  let outcome: RunOutcome;
  let sent: SentRequestInfo | undefined;
  try {
    if (request.kind === "http") {
      const payload = buildHttpPayload(request, resolve, requestId);
      sent = describeSent(payload);
      outcome = { kind: "http", response: await sendHttp(payload) };
    } else {
      const call = prepareGrpcCall(request, ctx.protoSets, resolve, requestId);
      sent = call.sent;
      outcome = { kind: "grpc", response: await invokeGrpc(call.payload) };
    }
  } catch (err) {
    outcome = { kind: "error", message: errorText(err) };
  }

  const view = responseView(outcome);
  if (view) {
    for (const extracted of runExtractions(request.extractions, view)) {
      if (extracted.value === undefined) {
        logs.push(`[warn] Could not set {{${extracted.variable}}}: ${extracted.error}`);
        continue;
      }
      const scope = ctx.store.hasEnvironment() ? "environment" : "globals";
      ctx.store.set(scope, extracted.variable, extracted.value);
      logs.push(`Set {{${extracted.variable}}} = ${truncate(extracted.value)}`);
    }

    for (const assertion of request.assertions.filter((a) => a.enabled)) {
      tests.push(evaluateAssertion(assertion, view, interpolate(assertion.expected, resolve)));
    }

    if (request.testScript.trim()) {
      const post = await runScript(request.testScript, {
        phase: "test",
        request: scriptRequestOf(request),
        response: view,
        store: ctx.store,
        locals,
      });
      logs.push(...post.logs);
      tests.push(...post.tests);
    }
  } else if (request.assertions.some((a) => a.enabled) || request.testScript.trim()) {
    tests.push({
      name: "Request completed",
      passed: false,
      message: (outcome as { message: string }).message,
    });
  }

  return { outcome, tests, logs, sent, startedAt };
}

const truncate = (text: string, max = 80) => (text.length > max ? `${text.slice(0, max)}…` : text);
