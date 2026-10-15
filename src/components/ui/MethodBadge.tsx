import { cn } from "@/lib/cn";
import { methodTextClasses } from "./methodColors";

export type HttpMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "WS" | "GQL" | "GRPC";

const methodClasses: Record<HttpMethod, string> = {
  ...methodTextClasses,
  WS: "text-method-other",
  GQL: "text-method-other",
  GRPC: "text-fg",
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
        "inline-block w-10 shrink-0 font-mono text-2xs font-semibold",
        methodClasses[method],
        className,
      )}
    >
      {labels[method] ?? method}
    </span>
  );
}
