import type { HttpMethodName } from "@/core/types";

/** Text colour per HTTP method, shared by badges and the method picker. */
export const methodTextClasses: Record<HttpMethodName, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-amber-600 dark:text-amber-400",
  PUT: "text-sky-600 dark:text-sky-400",
  PATCH: "text-violet-600 dark:text-violet-400",
  DELETE: "text-rose-600 dark:text-rose-400",
  HEAD: "text-slate-500 dark:text-slate-400",
  OPTIONS: "text-fuchsia-600 dark:text-fuchsia-400",
};
