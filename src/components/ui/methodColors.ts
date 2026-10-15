import type { HttpMethodName } from "@/core/types";

/** Text color per HTTP method, shared by badges and the method picker. */
export const methodTextClasses: Record<HttpMethodName, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
  PUT: "text-method-put",
  PATCH: "text-method-patch",
  DELETE: "text-method-delete",
  HEAD: "text-method-other",
  OPTIONS: "text-method-other",
};

/** Text color for an HTTP status code: 2xx green, 3xx blue, 4xx amber, 5xx red. */
export function statusTextClass(status: number): string {
  if (status >= 500) return "text-status-5xx";
  if (status >= 400) return "text-status-4xx";
  if (status >= 300) return "text-status-3xx";
  return "text-status-2xx";
}
