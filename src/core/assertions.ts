import { t } from "@/i18n";
import { getPath, stringifyValue } from "./jsonPath";
import type { ResponseView } from "./response";
import type {
  Assertion,
  AssertionOperator,
  AssertionSource,
  Extraction,
  TestResult,
} from "./types";

export const assertionSources: AssertionSource[] = [
  "status",
  "grpcStatus",
  "header",
  "jsonPath",
  "body",
  "responseTime",
];

export const assertionOperators: AssertionOperator[] = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "exists",
  "notExists",
  "lessThan",
  "greaterThan",
  "matches",
];

export const sourceLabel = (source: AssertionSource) => t(`assertions.sources.${source}`);
export const operatorLabel = (op: AssertionOperator) => t(`assertions.operators.${op}`);

export const operatorNeedsValue = (op: AssertionOperator) => op !== "exists" && op !== "notExists";
export const sourceNeedsProperty = (source: AssertionSource) =>
  source === "header" || source === "jsonPath";

/** What an assertion checks, e.g. `Header "content-type"`. */
const subject = (a: Assertion) =>
  t(`assertions.subject.${a.source}`, { name: a.property, path: a.property || "$" });

export function describeAssertion(a: Assertion, expected = a.expected): string {
  const op = operatorLabel(a.operator);
  return operatorNeedsValue(a.operator) ? `${subject(a)} ${op} ${expected}` : `${subject(a)} ${op}`;
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
        throw new Error(t("assertions.notJson"));
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
      : {
          name,
          passed,
          message: t("assertions.actualValue", { value: truncate(stringifyValue(actual)) }),
        };
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

        if (value === undefined) {
          return { variable, error: t("assertions.nothingFound", { path: e.path }) };
        }
        return { variable, value: stringifyValue(value) };
      } catch {
        return { variable, error: t("assertions.notJson") };
      }
    });
}
