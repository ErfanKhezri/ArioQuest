import { cn } from "@/lib/cn";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "WS" | "GQL";

const methodClasses: Record<HttpMethod, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-amber-600 dark:text-amber-400",
  PUT: "text-sky-600 dark:text-sky-400",
  PATCH: "text-violet-600 dark:text-violet-400",
  DELETE: "text-rose-600 dark:text-rose-400",
  WS: "text-teal-600 dark:text-teal-400",
  GQL: "text-pink-600 dark:text-pink-400",
};

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block w-12 shrink-0 font-mono text-[11px] font-bold tracking-wide",
        methodClasses[method],
        className,
      )}
    >
      {method === "DELETE" ? "DEL" : method}
    </span>
  );
}
