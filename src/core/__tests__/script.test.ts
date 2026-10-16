import { describe, expect, it } from "vitest";
import { evaluateAssertion, runExtractions } from "../assertions";
import { newAssertion, newExtraction } from "../factory";
import { httpResponseView, grpcResponseView } from "../response";
import { runScript, type VariableStore } from "../script";
import type { HttpResponseData } from "../types";

const response: HttpResponseData = {
  status: 201,
  statusText: "Created",
  httpVersion: "HTTP/1.1",
  url: "http://x",
  headers: [{ key: "Content-Type", value: "application/json" }],
  body: JSON.stringify({ id: "abc", items: [1, 2, 3], ok: true }),
  bodyBase64: null,
  isBinary: false,
  size: 40,
  timeMs: 12.4,
};
const view = httpResponseView(response);

function memoryStore(): VariableStore & { env: Map<string, string>; globals: Map<string, string> } {
  const env = new Map<string, string>();
  const globals = new Map<string, string>();
  const pick = (s: string) => (s === "environment" ? env : globals);
  return {
    env,
    globals,
    hasEnvironment: () => true,
    get: (s, n) => pick(s).get(n),
    set: (s, n, v) => void pick(s).set(n, v),
    unset: (s, n) => void pick(s).delete(n),
  };
}

const ctx = (store = memoryStore()) => ({
  phase: "test" as const,
  request: { name: "r", method: "GET", url: "http://x", headers: {}, body: "" },
  response: view,
  store,
  locals: new Map<string, string>(),
});

describe("assertions", () => {
  it("evaluates status, headers, JSON paths and timing", () => {
    const results = [
      newAssertion({ source: "status", operator: "equals", expected: "201" }),
      newAssertion({
        source: "header",
        property: "content-type",
        operator: "contains",
        expected: "json",
      }),
      newAssertion({ source: "jsonPath", property: "items", operator: "contains", expected: "2" }),
      newAssertion({ source: "jsonPath", property: "ok", operator: "equals", expected: "true" }),
      newAssertion({ source: "jsonPath", property: "nope", operator: "notExists", expected: "" }),
      newAssertion({ source: "responseTime", operator: "lessThan", expected: "500" }),
    ].map((a) => evaluateAssertion(a, view));
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("explains failures", () => {
    const r = evaluateAssertion(
      newAssertion({ source: "jsonPath", property: "id", operator: "equals", expected: "xyz" }),
      view,
    );
    expect(r).toMatchObject({ passed: false, message: "Actual value: abc" });
  });

  it("extracts variables", () => {
    const out = runExtractions(
      [
        newExtraction({ variable: "itemId", path: "id" }),
        newExtraction({ variable: "ct", source: "header", path: "Content-Type" }),
        newExtraction({ variable: "missing", path: "nope" }),
      ],
      view,
    );
    expect(out).toEqual([
      { variable: "itemId", value: "abc" },
      { variable: "ct", value: "application/json" },
      { variable: "missing", error: 'Nothing found at "nope"' },
    ]);
  });

  it("checks gRPC status names", () => {
    const grpc = grpcResponseView({
      ok: false,
      statusCode: 5,
      statusName: "NOT_FOUND",
      statusMessage: "x",
      messages: [],
      headers: [],
      trailers: [],
      timeMs: 1,
    });
    expect(
      evaluateAssertion(newAssertion({ source: "grpcStatus", expected: "NOT_FOUND" }), grpc).passed,
    ).toBe(true);
    expect(evaluateAssertion(newAssertion({ source: "status", expected: "5" }), grpc).passed).toBe(
      true,
    );
  });
});

describe("runScript", () => {
  it("supports pm-style and jest-style tests", async () => {
    const store = memoryStore();
    const out = await runScript(
      `
      pm.test("status", () => pm.response.to.have.status(201));
      pm.test("header", () => pm.response.to.have.header("content-type"));
      pm.test("body", () => {
        const json = pm.response.json();
        pm.expect(json.items).to.have.lengthOf(3);
        pm.expect(json).to.have.property("id", "abc");
        pm.expect(json.ok).to.be.true;
        pm.expect(json.items).to.include(2).and.not.include(9);
      });
      aq.test("jest", () => expect(aq.response.code).toBeGreaterThan(200));
      aq.test("fails", () => expect(1).toBe(2));
      aq.test("async", async () => { await Promise.resolve(); expect("x").toMatch(/x/); });
      pm.environment.set("token", pm.response.json().id);
      console.log("done", { n: 1 });
      `,
      ctx(store),
    );
    expect(out.tests.map((t) => [t.name, t.passed])).toEqual([
      ["status", true],
      ["header", true],
      ["body", true],
      ["jest", true],
      ["fails", false],
      ["async", true],
    ]);
    expect(out.tests[4]?.message).toBe("expected 1 to equal 2");
    expect(store.env.get("token")).toBe("abc");
    expect(out.logs).toEqual(['done {"n":1}']);
  });

  it("reports script errors as failed tests", async () => {
    const out = await runScript("throw new Error('boom')", ctx());
    expect(out.tests).toEqual([{ name: "Test script error", passed: false, message: "boom" }]);
  });

  it("lets pre-request scripts edit the request", async () => {
    const c = { ...ctx(), phase: "pre" as const, response: undefined };
    await runScript(
      `aq.request.headers["X-Sig"] = "s1"; aq.request.url += "?a=1"; aq.variables.set("n", 5);`,
      c,
    );
    expect(c.request.headers).toEqual({ "X-Sig": "s1" });
    expect(c.request.url).toBe("http://x?a=1");
    expect(c.locals.get("n")).toBe("5");
  });
});
