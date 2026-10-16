/**
 * A small assertion library for user scripts. Supports the common chai
 * style (`expect(x).to.equal(1)`, `pm.response.to.have.status(200)`)
 * as well as jest style (`expect(x).toBe(1)`).
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

/** Shape scripts see as `aq.response`; matched by `.status()` / `.header()`. */
export interface ResponseLike {
  code: number;
  headers: { get: (name: string) => string | undefined };
}

const isResponseLike = (v: unknown): v is ResponseLike =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as ResponseLike).code === "number" &&
  typeof (v as ResponseLike).headers?.get === "function";

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

export const show = (v: unknown): string => {
  if (typeof v === "string") return JSON.stringify(v);
  if (v === undefined) return "undefined";
  if (typeof v === "function") return "[function]";
  if (isResponseLike(v)) return `response(${v.code})`;
  try {
    const text = JSON.stringify(v);
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  } catch {
    return String(v);
  }
};

const typeOf = (v: unknown): string => {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
};

export class Expectation {
  private negated: boolean;
  private deep: boolean;

  constructor(
    private readonly actual: unknown,
    negated = false,
    deep = false,
  ) {
    this.negated = negated;
    this.deep = deep;
  }

  /* ---- language chains (no-ops) ---- */
  get to() {
    return this;
  }
  get be() {
    return this;
  }
  get been() {
    return this;
  }
  get is() {
    return this;
  }
  get that() {
    return this;
  }
  get which() {
    return this;
  }
  get and() {
    return this;
  }
  get has() {
    return this;
  }
  get have() {
    return this;
  }
  get with() {
    return this;
  }
  get does() {
    return this;
  }
  get not(): Expectation {
    return new Expectation(this.actual, !this.negated, this.deep);
  }
  get deeply(): Expectation {
    return new Expectation(this.actual, this.negated, true);
  }

  private check(passed: boolean, message: string, negatedMessage: string): this {
    if (passed === this.negated) {
      throw new AssertionError(this.negated ? negatedMessage : message);
    }
    return this;
  }

  /* ---- chai style ---- */
  equal(expected: unknown) {
    const passed = this.deep ? deepEqual(this.actual, expected) : Object.is(this.actual, expected);
    return this.check(
      passed,
      `expected ${show(this.actual)} to equal ${show(expected)}`,
      `expected ${show(this.actual)} to not equal ${show(expected)}`,
    );
  }
  equals(expected: unknown) {
    return this.equal(expected);
  }
  eq(expected: unknown) {
    return this.equal(expected);
  }
  eql(expected: unknown) {
    return this.check(
      deepEqual(this.actual, expected),
      `expected ${show(this.actual)} to deeply equal ${show(expected)}`,
      `expected ${show(this.actual)} to not deeply equal ${show(expected)}`,
    );
  }
  include(expected: unknown) {
    const a = this.actual;
    let passed = false;
    if (typeof a === "string") passed = a.includes(String(expected));
    else if (Array.isArray(a)) passed = a.some((item) => deepEqual(item, expected));
    else if (a && typeof a === "object" && expected && typeof expected === "object") {
      passed = Object.entries(expected).every(([k, v]) =>
        deepEqual((a as Record<string, unknown>)[k], v),
      );
    }
    return this.check(
      passed,
      `expected ${show(a)} to include ${show(expected)}`,
      `expected ${show(a)} to not include ${show(expected)}`,
    );
  }
  includes(expected: unknown) {
    return this.include(expected);
  }
  contain(expected: unknown) {
    return this.include(expected);
  }
  contains(expected: unknown) {
    return this.include(expected);
  }
  above(n: number) {
    return this.check(
      Number(this.actual) > n,
      `expected ${show(this.actual)} to be above ${n}`,
      `expected ${show(this.actual)} to be at most ${n}`,
    );
  }
  gt(n: number) {
    return this.above(n);
  }
  greaterThan(n: number) {
    return this.above(n);
  }
  below(n: number) {
    return this.check(
      Number(this.actual) < n,
      `expected ${show(this.actual)} to be below ${n}`,
      `expected ${show(this.actual)} to be at least ${n}`,
    );
  }
  lt(n: number) {
    return this.below(n);
  }
  lessThan(n: number) {
    return this.below(n);
  }
  least(n: number) {
    return this.check(
      Number(this.actual) >= n,
      `expected ${show(this.actual)} to be at least ${n}`,
      `expected ${show(this.actual)} to be below ${n}`,
    );
  }
  gte(n: number) {
    return this.least(n);
  }
  most(n: number) {
    return this.check(
      Number(this.actual) <= n,
      `expected ${show(this.actual)} to be at most ${n}`,
      `expected ${show(this.actual)} to be above ${n}`,
    );
  }
  lte(n: number) {
    return this.most(n);
  }
  within(min: number, max: number) {
    const v = Number(this.actual);
    return this.check(
      v >= min && v <= max,
      `expected ${show(this.actual)} to be within ${min}..${max}`,
      `expected ${show(this.actual)} to not be within ${min}..${max}`,
    );
  }
  a(type: string) {
    const actualType = typeOf(this.actual);
    return this.check(
      actualType === type.toLowerCase(),
      `expected ${show(this.actual)} to be a ${type} but got ${actualType}`,
      `expected ${show(this.actual)} to not be a ${type}`,
    );
  }
  an(type: string) {
    return this.a(type);
  }
  oneOf(list: unknown[]) {
    return this.check(
      list.some((item) => deepEqual(item, this.actual)),
      `expected ${show(this.actual)} to be one of ${show(list)}`,
      `expected ${show(this.actual)} to not be one of ${show(list)}`,
    );
  }
  match(re: RegExp | string) {
    const regex = typeof re === "string" ? new RegExp(re) : re;
    return this.check(
      regex.test(String(this.actual)),
      `expected ${show(this.actual)} to match ${regex}`,
      `expected ${show(this.actual)} to not match ${regex}`,
    );
  }
  property(name: string, ...value: unknown[]) {
    const obj = this.actual as Record<string, unknown> | null | undefined;
    const exists = obj !== null && obj !== undefined && name in Object(obj);
    if (value.length === 0 || !exists) {
      return this.check(
        exists,
        `expected ${show(obj)} to have property "${name}"`,
        `expected ${show(obj)} to not have property "${name}"`,
      );
    }
    const actual = obj?.[name];
    return this.check(
      deepEqual(actual, value[0]),
      `expected property "${name}" to be ${show(value[0])} but got ${show(actual)}`,
      `expected property "${name}" to not be ${show(value[0])}`,
    );
  }
  lengthOf(n: number) {
    const length = (this.actual as { length?: number } | null)?.length;
    return this.check(
      length === n,
      `expected length ${n} but got ${show(length)}`,
      `expected length to not be ${n}`,
    );
  }
  status(code: number) {
    const actual = isResponseLike(this.actual) ? this.actual.code : this.actual;
    return this.check(
      actual === code,
      `expected status ${code} but got ${show(actual)}`,
      `expected status to not be ${code}`,
    );
  }
  header(name: string, ...value: string[]) {
    if (!isResponseLike(this.actual)) throw new AssertionError("header() needs a response");
    const actual = this.actual.headers.get(name);
    if (value.length === 0 || actual === undefined) {
      return this.check(
        actual !== undefined,
        `expected response to have header "${name}"`,
        `expected response to not have header "${name}"`,
      );
    }
    return this.check(
      actual === value[0],
      `expected header "${name}" to be ${show(value[0])} but got ${show(actual)}`,
      `expected header "${name}" to not be ${show(value[0])}`,
    );
  }

  /* ---- property assertions (chai `.to.be.true`) ---- */
  get ok() {
    if (isResponseLike(this.actual)) {
      const code = this.actual.code;
      return this.check(
        code >= 200 && code < 300,
        `expected a 2xx status but got ${code}`,
        `expected a non-2xx status but got ${code}`,
      );
    }
    return this.check(
      Boolean(this.actual),
      `expected ${show(this.actual)} to be truthy`,
      `expected ${show(this.actual)} to be falsy`,
    );
  }
  get true() {
    return this.check(
      this.actual === true,
      `expected ${show(this.actual)} to be true`,
      `expected ${show(this.actual)} to not be true`,
    );
  }
  get false() {
    return this.check(
      this.actual === false,
      `expected ${show(this.actual)} to be false`,
      `expected ${show(this.actual)} to not be false`,
    );
  }
  get null() {
    return this.check(
      this.actual === null,
      `expected ${show(this.actual)} to be null`,
      `expected value to not be null`,
    );
  }
  get undefined() {
    return this.check(
      this.actual === undefined,
      `expected ${show(this.actual)} to be undefined`,
      `expected value to not be undefined`,
    );
  }
  get exist() {
    return this.check(
      this.actual !== null && this.actual !== undefined,
      `expected value to exist`,
      `expected ${show(this.actual)} to not exist`,
    );
  }
  get empty() {
    const a = this.actual;
    const isEmpty =
      a === "" ||
      (Array.isArray(a) && a.length === 0) ||
      (a !== null && typeof a === "object" && Object.keys(a).length === 0);
    return this.check(
      isEmpty,
      `expected ${show(a)} to be empty`,
      `expected ${show(a)} to not be empty`,
    );
  }

  /* ---- jest style ---- */
  toBe(expected: unknown) {
    return new Expectation(this.actual, this.negated).equal(expected);
  }
  toEqual(expected: unknown) {
    return this.eql(expected);
  }
  toStrictEqual(expected: unknown) {
    return this.eql(expected);
  }
  toContain(expected: unknown) {
    return this.include(expected);
  }
  toBeTruthy() {
    return new Expectation(this.actual, this.negated).ok;
  }
  toBeFalsy() {
    return new Expectation(this.actual, !this.negated).ok;
  }
  toBeNull() {
    return this.null;
  }
  toBeUndefined() {
    return this.undefined;
  }
  toBeDefined() {
    return new Expectation(this.actual, !this.negated).undefined;
  }
  toBeGreaterThan(n: number) {
    return this.above(n);
  }
  toBeGreaterThanOrEqual(n: number) {
    return this.least(n);
  }
  toBeLessThan(n: number) {
    return this.below(n);
  }
  toBeLessThanOrEqual(n: number) {
    return this.most(n);
  }
  toMatch(re: RegExp | string) {
    return this.match(re);
  }
  toHaveProperty(name: string, ...value: unknown[]) {
    return this.property(name, ...value);
  }
  toHaveLength(n: number) {
    return this.lengthOf(n);
  }
}

export const expect = (actual: unknown) => new Expectation(actual);
