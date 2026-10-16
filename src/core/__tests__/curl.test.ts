import { describe, expect, it } from "vitest";
import { parseCurl, shellSplit, toCurl } from "../curl";
import { buildHttpPayload } from "../http";
import { exportCollectionV2, importJson } from "../importers";
import { newHttpRequest, newKeyValue } from "../factory";

describe("shellSplit", () => {
  it("handles quotes, escapes and line continuations", () => {
    expect(shellSplit(`curl -H 'A: b c' "x\\"y" a\\ b \\\n --data $'l1\\nl2'`)).toEqual([
      "curl",
      "-H",
      "A: b c",
      'x"y',
      "a b",
      "--data",
      "l1\nl2",
    ]);
  });
});

describe("parseCurl", () => {
  it("parses a JSON POST", () => {
    const r = parseCurl(
      `curl -X POST 'https://api.example.com/v1/orders?expand=items' -H 'Content-Type: application/json' -H "Authorization: Bearer t" --data-raw '{"qty":2}' -k`,
    );
    expect(r.method).toBe("POST");
    expect(r.url).toBe("https://api.example.com/v1/orders?expand=items");
    expect(r.params.map((p) => [p.key, p.value])).toEqual([["expand", "items"]]);
    expect(r.headers.map((h) => h.key)).toEqual(["Content-Type", "Authorization"]);
    expect(r.body.mode).toBe("json");
    expect(JSON.parse(r.body.raw)).toEqual({ qty: 2 });
    expect(r.settings.verifyTls).toBe(false);
    expect(r.name).toBe("v1/orders");
  });

  it("infers POST for form data and supports basic auth", () => {
    const r = parseCurl(`curl https://x.io/login -u admin:s3cret -d user=a%20b -d 'pass=1'`);
    expect(r.method).toBe("POST");
    expect(r.body.mode).toBe("urlencoded");
    expect(r.body.urlencoded.map((f) => [f.key, f.value])).toEqual([
      ["user", "a b"],
      ["pass", "1"],
    ]);
    expect(r.auth).toMatchObject({
      type: "basic",
      basic: { username: "admin", password: "s3cret" },
    });
  });

  it("handles multipart forms and -G", () => {
    const form = parseCurl(`curl -F name=x -F file=@/tmp/a.png https://x.io/up`);
    expect(form.body.mode).toBe("formdata");
    expect(form.body.formdata.map((f) => [f.key, f.type])).toEqual([
      ["name", "text"],
      ["file", "file"],
    ]);
    const get = parseCurl(`curl -G https://x.io/s -d q=1`);
    expect(get.method).toBe("GET");
    expect(get.url).toBe("https://x.io/s?q=1");
  });

  it("round-trips through toCurl", () => {
    const r = newHttpRequest({
      method: "PUT",
      url: "{{host}}/a",
      headers: [newKeyValue("X", "it's")],
    });
    r.body.mode = "json";
    r.body.raw = '{"a":1}';
    const curl = toCurl(r, (n) => (n === "host" ? "https://h" : undefined));
    const back = parseCurl(curl);
    expect(back.method).toBe("PUT");
    expect(back.url).toBe("https://h/a");
    expect(back.headers.find((h) => h.key === "X")?.value).toBe("it's");
  });
});

describe("buildHttpPayload", () => {
  it("applies auth, variables and default content types", () => {
    const r = newHttpRequest({ method: "POST", url: "{{base}}/x?a=1" });
    r.auth.type = "apikey";
    r.auth.apikey = { key: "api_key", value: "{{key}}", in: "query" };
    r.body.mode = "graphql";
    r.body.graphql = { query: "{ me { id } }", variables: '{"n": {{n}}}' };
    const vars: Record<string, string> = { base: "http://h", key: "k 1", n: "3" };
    const p = buildHttpPayload(r, (n) => vars[n], "id1");
    expect(p.url).toBe("http://h/x?a=1&api_key=k%201");
    expect(p.headers).toEqual([{ key: "Content-Type", value: "application/json" }]);
    expect(p.body).toEqual({
      type: "text",
      content: JSON.stringify({ query: "{ me { id } }", variables: { n: 3 } }),
    });
  });

  it("builds basic auth", () => {
    const r = newHttpRequest({ url: "http://h" });
    r.auth.type = "basic";
    r.auth.basic = { username: "u", password: "p" };
    expect(buildHttpPayload(r, () => undefined, "1").headers).toEqual([
      { key: "Authorization", value: "Basic dTpw" },
    ]);
  });
});

describe("v2.1 collection import/export", () => {
  const v2Collection = {
    info: {
      name: "Demo",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: { type: "bearer", bearer: [{ key: "token", value: "{{token}}" }] },
    variable: [{ key: "baseUrl", value: "https://demo.io" }],
    item: [
      {
        name: "Users",
        item: [
          {
            name: "Create user",
            event: [
              {
                listen: "test",
                script: { exec: ["pm.test('ok', () => pm.response.to.have.status(201));"] },
              },
            ],
            request: {
              method: "POST",
              header: [{ key: "X-Trace", value: "1", disabled: true }],
              url: { raw: "{{baseUrl}}/users?x=1", query: [{ key: "x", value: "1" }] },
              body: { mode: "raw", raw: '{"name":"a"}', options: { raw: { language: "json" } } },
            },
          },
        ],
      },
      { name: "Health", request: "https://demo.io/health" },
    ],
  };

  it("imports folders, auth, scripts and variables", () => {
    const result = importJson(JSON.stringify(v2Collection));
    const col = result.collections[0]!;
    expect(col.name).toBe("Demo");
    const folder = col.items[0]!;
    expect(folder.type).toBe("folder");
    const req =
      folder.type === "folder" && folder.items[0]?.type === "request"
        ? folder.items[0].request
        : null;
    expect(req?.kind === "http" && req.body.mode).toBe("json");
    expect(req?.kind === "http" && req.auth).toMatchObject({
      type: "bearer",
      bearer: { token: "{{token}}" },
    });
    expect(req?.testScript).toContain("pm.test");
    expect(req?.kind === "http" && req.headers[0]?.enabled).toBe(false);
    expect(result.environments[0]?.variables[0]).toMatchObject({
      key: "baseUrl",
      value: "https://demo.io",
    });

    const exported = JSON.parse(exportCollectionV2(col));
    expect(exported.item[0].item[0].request.method).toBe("POST");
    expect(importJson(JSON.stringify(exported)).collections[0]?.items).toHaveLength(2);
  });

  it("rejects unknown files", () => {
    expect(() => importJson("{}")).toThrow(/Unrecognized/);
    expect(() => importJson("nope")).toThrow(/not valid JSON/);
  });
});
