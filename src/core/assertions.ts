import { getPath, stringifyValue } from "./jsonPath";
import type { ResponseView } from "./response";
import type {
  Assertion,
  AssertionOperator,
  AssertionSource,
  Extraction,
  TestResult,
} from "./types";

export const assertionSources: Array<{ value: AssertionSource; label: string }> = [
  { value: "status", label: "Status code" },
  { value: "grpcStatus", label: "gRPC status" },
  { value: "header", label: "Header" },
  { value: "jsonPath", label: "JSON body path" },
  { value: "body", label: "Body text" },
  { value: "responseTime", label: "Response time (ms)" },
];

export const assertionOperators: Array<{ value: AssertionOperator; label: string }> = [
  { value: "equals", label: "equals" },
  { value: "notEquals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "notContains", label: "does not contain" },
  { value: "exists", label: "exists" },
  { value: "notExists", label: "does not exist" },
  { value: "lessThan", label: "is less than" },
  { value: "greaterThan", label: "is greater than" },
  { value: "matches", label: "matches regex" },
];

export const operatorNeedsValue = (op: AssertionOperator) => op !== "exists" && op !== "notExists";
export const sourceNeedsProperty = (source: AssertionSource) =>
  source === "header" || source === "jsonPath";

const sourceLabel = (a: Assertion) => {
  switch (a.source) {
    case "status":
      return "Status code";
    case "grpcStatus":
      return "gRPC status";
    case "header":
      return `Header "${a.property}"`;
    case "jsonPath":
      return `Body ${a.property || "$"}`;
    case "body":
      return "Body";
    case "responseTime":
      return "Response time";
  }
};

export function describeAssertion(a: Assertion, expected = a.expected): string {
  const op = assertionOperators.find((o) => o.value === a.operator)?.label ?? a.operator;
  return operatorNeedsValue(a.operator)
    ? `${sourceLabel(a)} ${op} ${expected}`
    : `${sourceLabel(a)} ${op}`;
}

function actualValue(a: Assertion, response: ResponseView): unknown {
  switch (a.source) {
    case "status":
      return response.status;
    case "grpcStatus":
      return response.kind === "grpc" ? response.statusText : undefined;
    case "header":
      return response.headers[a.property.trim().toLowerCase()];
    case "body":
      return response.body;
    case "responseTime":
      return Math.round(response.timeMs);
    case "jsonPath": {
      let json: unknown;
      try {
        json = response.json();
      } catch {
        throw new Error("Response body is not valid JSON");
      }
      return getPath(json, a.property || "$");
    }
  }
}

/** Compares loosely: `"200"` equals `200`, `"true"` equals `true`. */
function looseEquals(actual: unknown, expected: string): boolean {
  if (typeof actual === "string") return actual === expected;
  if (actual === null || typeof actual !== "object") return String(actual) === expected.trim();
  try {
    return JSON.stringify(actual) === JSON.stringify(JSON.parse(expected));
  } catch {
    return false;
  }
}

function contains(actual: unknown, expected: string): boolean {
  if (Array.isArray(actual)) return actual.some((item) => looseEquals(item, expected));
  return stringifyValue(actual).includes(expected);
}

export function evaluateAssertion(
  a: Assertion,
  response: ResponseView,
  expected = a.expected,
): TestResult {
  const name = describeAssertion(a, expected);
  try {
    const actual = actualValue(a, response);
    const passed = compare(a.operator, actual, expected);
    return passed
      ? { name, passed }
      : { name, passed, message: `Actual value: ${truncate(stringifyValue(actual))}` };
  } catch (err) {
    return { name, passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}

function compare(op: AssertionOperator, actual: unknown, expected: string): boolean {
  switch (op) {
    case "equals":
      return looseEquals(actual, expected);
    case "notEquals":
      return !looseEquals(actual, expected);
    case "contains":
      return actual !== undefined && contains(actual, expected);
    case "notContains":
      return actual === undefined || !contains(actual, expected);
    case "exists":
      return actual !== undefined && actual !== null;
    case "notExists":
      return actual === undefined || actual === null;
    case "lessThan":
      return Number(actual) < Number(expected);
    case "greaterThan":
      return Number(actual) > Number(expected);
    case "matches":
      return new RegExp(expected).test(stringifyValue(actual));
  }
}

const truncate = (text: string, max = 200) => (text.length > max ? `${text.slice(0, max)}…` : text);

export interface ExtractedValue {
  variable: string;
  value?: string;
  error?: string;
}

export function runExtractions(list: Extraction[], response: ResponseView): ExtractedValue[] {
  return list
    .filter((e) => e.enabled && e.variable.trim())
    .map((e) => {
      const variable = e.variable.trim();
      try {
        let value: unknown;
        if (e.source === "status") value = response.status;
        else if (e.source === "header") value = response.headers[e.path.trim().toLowerCase()];
        else value = getPath(response.json(), e.path || "$");

        if (value === undefined) return { variable, error: `Nothing found at "${e.path}"` };
        return { variable, value: stringifyValue(value) };
      } catch {
        return { variable, error: "Response body is not valid JSON" };
      }
    });
}
