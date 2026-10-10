import { twMerge } from "tailwind-merge";

/**
 * Joins truthy class names. Conflicting Tailwind utilities are resolved in
 * favour of the later one, so `cn("w-12", className)` lets callers override.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
