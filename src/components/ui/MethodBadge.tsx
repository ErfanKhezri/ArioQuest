import { cn } from "@/lib/cn";
import { methodTextClasses } from "./methodColors";

export type HttpMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "WS" | "GQL" | "GRPC";

const methodClasses: Record<HttpMethod, string> = {
  ...methodTextClasses,
  WS: "text-teal-600 dark:text-teal-400",
  GQL: "text-pink-600 dark:text-pink-400",
  GRPC: "text-cyan-600 dark:text-cyan-400",
};

const labels: Partial<Record<HttpMethod, string>> = { DELETE: "DEL", OPTIONS: "OPT" };

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
      {labels[method] ?? method}
    </span>
  );
}
