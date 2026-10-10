import { uuid } from "@/lib/id";

/** Resolves a variable name to its value, or undefined when unknown. */
export type VariableResolver = (name: string) => string | undefined;

const VARIABLE_RE = /\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const FIRST_NAMES = ["Ava", "Liam", "Noah", "Emma", "Sara", "Arian", "Mina", "Leo", "Nora", "Kian"];
const LAST_NAMES = ["Smith", "Rahimi", "Garcia", "Chen", "Novak", "Karimi", "Silva", "Berg"];
const pick = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)] as T;

/** Built-in `{{$name}}` variables, evaluated fresh on every use. */
export const dynamicVariables: Record<string, { description: string; value: () => string }> = {
  $guid: { description: "Random UUID v4", value: () => uuid() },
  $uuid: { description: "Random UUID v4", value: () => uuid() },
  $timestamp: {
    description: "Unix timestamp in seconds",
    value: () => String(Math.floor(Date.now() / 1000)),
  },
  $timestampMs: { description: "Unix timestamp in milliseconds", value: () => String(Date.now()) },
  $isoTimestamp: { description: "Current time, ISO 8601", value: () => new Date().toISOString() },
  $randomInt: { description: "Random integer 0–1000", value: () => String(randomInt(0, 1000)) },
  $randomBoolean: { description: "true or false", value: () => String(Math.random() < 0.5) },
  $randomFirstName: { description: "Random first name", value: () => pick(FIRST_NAMES) },
  $randomLastName: { description: "Random last name", value: () => pick(LAST_NAMES) },
  $randomEmail: {
    description: "Random email address",
    value: () => `${pick(FIRST_NAMES).toLowerCase()}.${randomInt(100, 9999)}@example.com`,
  },
};

const resolveOne = (name: string, resolve: VariableResolver): string | undefined =>
  name.startsWith("$") ? dynamicVariables[name]?.value() : resolve(name);

/**
 * Replaces `{{name}}` placeholders. Values may themselves reference other
 * variables (resolved up to a few levels deep); unknown names are left as-is.
 */
export function interpolate(input: string, resolve: VariableResolver, depth = 0): string {
  if (!input.includes("{{")) return input;
  const out = input.replace(VARIABLE_RE, (match, name: string) => {
    const value = resolveOne(name, resolve);
    if (value === undefined) return match;
    return depth < 4 ? interpolate(value, resolve, depth + 1) : value;
  });
  return out;
}

/** Lists the distinct variable names referenced in `input`. */
export function findVariables(input: string): string[] {
  const names = new Set<string>();
  for (const match of input.matchAll(VARIABLE_RE)) {
    if (match[1]) names.add(match[1]);
  }
  return [...names];
}

export function isResolvable(name: string, resolve: VariableResolver): boolean {
  return name.startsWith("$") ? name in dynamicVariables : resolve(name) !== undefined;
}

/** Deeply interpolates every string inside a JSON-compatible value. */
export function interpolateDeep<T>(value: T, resolve: VariableResolver): T {
  if (typeof value === "string") return interpolate(value, resolve) as T;
  if (Array.isArray(value)) return value.map((v) => interpolateDeep(v, resolve)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, interpolateDeep(v, resolve)]),
    ) as T;
  }
  return value;
}
