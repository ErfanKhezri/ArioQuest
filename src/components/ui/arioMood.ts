import type { ArioMood } from "./Ario";

/** Ario's reaction to an HTTP status: 2xx happy, 3xx curious, 4xx sad, 5xx error. */
export function moodForHttpStatus(status: number): ArioMood {
  if (status >= 500) return "error";
  if (status >= 400) return "sad";
  if (status >= 300) return "curious";
  return "happy";
}

/** Server-side failures get the error face; caller mistakes (NOT_FOUND, …) a sad one. */
const GRPC_SERVER_ERRORS = new Set([
  "UNKNOWN",
  "INTERNAL",
  "UNAVAILABLE",
  "DATA_LOSS",
  "DEADLINE_EXCEEDED",
]);

export function moodForGrpcStatus(statusName: string): ArioMood {
  if (statusName === "OK") return "happy";
  return GRPC_SERVER_ERRORS.has(statusName) ? "error" : "sad";
}

/** Text color that goes with a mood, so color still only carries meaning. */
export const moodTextClass: Record<ArioMood, string> = {
  idle: "text-subtle",
  happy: "text-success",
  curious: "text-info",
  thinking: "text-accent",
  shy: "text-subtle",
  sad: "text-warning",
  error: "text-danger",
  sleepy: "text-subtle",
};
