import type { GrpcResponseData, HttpResponseData, RunOutcome } from "./types";

/**
 * Protocol-neutral view of a response used by assertions, extractions and
 * scripts. For gRPC, `status` is the numeric status code and the body is the
 * JSON of the response message (or an array for streaming calls).
 */
export interface ResponseView {
  kind: "http" | "grpc";
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  size: number;
  json: () => unknown;
}

export function httpResponseView(response: HttpResponseData): ResponseView {
  return {
    kind: "http",
    status: response.status,
    statusText: response.statusText,
    headers: headerRecord(response.headers),
    body: response.body,
    timeMs: response.timeMs,
    size: response.size,
    json: () => JSON.parse(response.body),
  };
}

export function grpcResponseView(response: GrpcResponseData): ResponseView {
  const payload = response.messages.length === 1 ? response.messages[0] : response.messages;
  const body = response.messages.length === 0 ? "" : JSON.stringify(payload, null, 2);
  return {
    kind: "grpc",
    status: response.statusCode,
    statusText: response.statusName,
    headers: headerRecord([...response.headers, ...response.trailers]),
    body,
    timeMs: response.timeMs,
    size: new TextEncoder().encode(body).length,
    json: () => structuredClone(payload),
  };
}

export function responseView(outcome: RunOutcome): ResponseView | null {
  if (outcome.kind === "http") return httpResponseView(outcome.response);
  if (outcome.kind === "grpc") return grpcResponseView(outcome.response);
  return null;
}

function headerRecord(list: Array<{ key: string; value: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of list) {
    const k = key.toLowerCase();
    out[k] = k in out ? `${out[k]}, ${value}` : value;
  }
  return out;
}
