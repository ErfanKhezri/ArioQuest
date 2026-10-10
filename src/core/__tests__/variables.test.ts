import { describe, expect, it } from "vitest";
import { findVariables, interpolate, interpolateDeep } from "../variables";
import { applyParamsToUrl, syncParamsFromUrl } from "../url";
import { newKeyValue } from "../factory";
import { getPath } from "../jsonPath";

const vars: Record<string, string> = {
  baseUrl: "https://api.test",
  id: "42",
  nested: "{{baseUrl}}/x",
};
const resolve = (name: string) => vars[name];

describe("interpolate", () => {
  it("replaces known variables and keeps unknown ones", () => {
    expect(interpolate("{{baseUrl}}/users/{{ id }}?q={{missing}}", resolve)).toBe(
      "https://api.test/users/42?q={{missing}}",
    );
  });

  it("resolves variables inside variable values", () => {
    expect(interpolate("{{nested}}", resolve)).toBe("https://api.test/x");
  });

  it("evaluates dynamic variables", () => {
    expect(interpolate("{{$guid}}", resolve)).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number(interpolate("{{$timestamp}}", resolve))).toBeGreaterThan(1_600_000_000);
  });

  it("finds variable names and interpolates deeply", () => {
    expect(findVariables("{{a}} {{b}} {{a}}")).toEqual(["a", "b"]);
    expect(interpolateDeep({ list: ["{{id}}"], n: 1 }, resolve)).toEqual({ list: ["42"], n: 1 });
  });
});

describe("url params", () => {
  it("parses the query into params, keeping disabled rows", () => {
    const disabled = { ...newKeyValue("debug", "1"), enabled: false };
    const params = syncParamsFromUrl("{{baseUrl}}/a?x=1&flag&y={{id}}#frag", [disabled]);
    expect(params.map((p) => [p.key, p.value, p.enabled])).toEqual([
      ["x", "1", true],
      ["flag", "", true],
      ["y", "{{id}}", true],
      ["debug", "1", false],
    ]);
  });

  it("rebuilds the URL from enabled params", () => {
    const params = [
      newKeyValue("a", "1"),
      { ...newKeyValue("b", "2"), enabled: false },
      newKeyValue("c", ""),
    ];
    expect(applyParamsToUrl("http://h/p?old=1#top", params)).toBe("http://h/p?a=1&c#top");
  });
});

describe("getPath", () => {
  const data = { data: { items: [{ id: 1 }, { id: 2 }], "odd key": true } };
  it("walks objects and arrays", () => {
    expect(getPath(data, "data.items[1].id")).toBe(2);
    expect(getPath(data, "$.data.items[-1].id")).toBe(2);
    expect(getPath(data, "data.items.length")).toBe(2);
    expect(getPath(data, 'data["odd key"]')).toBe(true);
    expect(getPath(data, "data.missing.deep")).toBeUndefined();
    expect(getPath([1, 2], "$")).toEqual([1, 2]);
  });
});
