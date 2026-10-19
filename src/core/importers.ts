import { t } from "@/i18n";
import { uid } from "@/lib/id";
import { newHttpRequest, newKeyValue, normalizeRequest } from "./factory";
import { syncParamsFromUrl } from "./url";
import {
  HTTP_METHODS,
  type ApiRequest,
  type Collection,
  type CollectionItem,
  type Environment,
  type HttpMethodName,
  type HttpRequest,
  type KeyValue,
  type ProtoSet,
} from "./types";

export interface ImportResult {
  collections: Collection[];
  environments: Environment[];
  protoSets: ProtoSet[];
  globals?: KeyValue[];
}

export const NATIVE_FORMAT = "arioquest";
export const NATIVE_VERSION = 1;

export interface NativeExport {
  format: typeof NATIVE_FORMAT;
  version: number;
  exportedAt: string;
  collections?: Collection[];
  environments?: Environment[];
  protoSets?: ProtoSet[];
  globals?: KeyValue[];
}

/** Detects the file type and converts it into workspace entities. */
export function importJson(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(t("errors.invalidJsonFile"));
  }
  if (!data || typeof data !== "object") throw new Error(t("errors.unsupportedFile"));
  const obj = data as Record<string, unknown>;

  if (obj.format === NATIVE_FORMAT) return importNative(obj as unknown as NativeExport);
  if (isV2Collection(obj)) return importV2Collection(obj);
  if (Array.isArray(obj.values) && typeof obj.name === "string") {
    return { collections: [], environments: [importV2Environment(obj)], protoSets: [] };
  }
  throw new Error(t("errors.unknownFormat"));
}

function importNative(data: NativeExport): ImportResult {
  const fixItems = (items: CollectionItem[]): CollectionItem[] =>
    items.map((item) =>
      item.type === "folder"
        ? { ...item, id: uid("fld"), items: fixItems(item.items) }
        : {
            type: "request",
            id: uid("item"),
            request: { ...normalizeRequest(item.request), id: uid("req") },
          },
    );
  return {
    collections: (data.collections ?? []).map((c) => ({
      ...c,
      id: uid("col"),
      items: fixItems(c.items),
    })),
    environments: (data.environments ?? []).map((e) => ({ ...e, id: uid("env") })),
    protoSets: (data.protoSets ?? []).map((p) => ({ ...p })),
    globals: data.globals,
  };
}

export function exportNative(
  parts: Omit<NativeExport, "format" | "version" | "exportedAt">,
): string {
  const payload: NativeExport = {
    format: NATIVE_FORMAT,
    version: NATIVE_VERSION,
    exportedAt: new Date().toISOString(),
    ...parts,
  };
  return JSON.stringify(payload, null, 2);
}

/* ---------------- Collection format v2.x ---------------- */

type PmKV = {
  key?: string;
  value?: unknown;
  disabled?: boolean;
  description?: unknown;
  type?: string;
  src?: unknown;
};

interface PmRequest {
  method?: string;
  header?: PmKV[];
  url?: string | { raw?: string; query?: PmKV[] };
  body?: {
    mode?: string;
    raw?: string;
    urlencoded?: PmKV[];
    formdata?: PmKV[];
    graphql?: { query?: string; variables?: string };
    options?: { raw?: { language?: string } };
  };
  auth?: PmAuth;
  description?: unknown;
}

type PmAuth = { type?: string } & Record<string, unknown>;

interface PmItem {
  name?: string;
  item?: PmItem[];
  request?: PmRequest | string;
  event?: Array<{ listen?: string; script?: { exec?: string[] | string } }>;
  auth?: PmAuth;
}

const isV2Collection = (obj: Record<string, unknown>) =>
  Array.isArray(obj.item) && typeof obj.info === "object";

const text = (v: unknown) =>
  typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);
const description = (v: unknown) =>
  typeof v === "string" ? v : (v as { content?: string })?.content;

const pmKvs = (list?: PmKV[]): KeyValue[] =>
  (list ?? []).map((kv) => ({
    ...newKeyValue(text(kv.key), text(kv.value), !kv.disabled),
    description: description(kv.description),
  }));

function authParams(auth: PmAuth, type: string): Record<string, string> {
  const raw = auth[type];
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((p: PmKV) => [text(p.key), text(p.value)]));
  }
  if (raw && typeof raw === "object") {
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, text(v)]));
  }
  return {};
}

function applyV2Auth(request: HttpRequest, auth: PmAuth | undefined) {
  if (!auth?.type) return;
  if (auth.type === "bearer") {
    request.auth.type = "bearer";
    request.auth.bearer.token = authParams(auth, "bearer").token ?? "";
  } else if (auth.type === "basic") {
    const p = authParams(auth, "basic");
    request.auth.type = "basic";
    request.auth.basic = { username: p.username ?? "", password: p.password ?? "" };
  } else if (auth.type === "apikey") {
    const p = authParams(auth, "apikey");
    request.auth.type = "apikey";
    request.auth.apikey = {
      key: p.key ?? "",
      value: p.value ?? "",
      in: p.in === "query" ? "query" : "header",
    };
  }
}

function convertV2Request(item: PmItem, inheritedAuth?: PmAuth): ApiRequest {
  const pm: PmRequest =
    typeof item.request === "string" ? { url: item.request } : (item.request ?? {});
  const method = (pm.method ?? "GET").toUpperCase() as HttpMethodName;
  const url = typeof pm.url === "string" ? pm.url : (pm.url?.raw ?? "");

  const request = newHttpRequest({
    name: item.name ?? t("importers.request"),
    method: HTTP_METHODS.includes(method) ? method : "GET",
    url,
    headers: pmKvs(pm.header),
    description: description(pm.description),
  });
  request.params =
    typeof pm.url === "object" && pm.url?.query ? pmKvs(pm.url.query) : syncParamsFromUrl(url, []);

  const body = pm.body;
  if (body?.mode === "raw") {
    const lang = body.options?.raw?.language;
    request.body.mode =
      lang === "json"
        ? "json"
        : lang === "xml"
          ? "xml"
          : lang === "html"
            ? "html"
            : /^\s*[[{]/.test(body.raw ?? "")
              ? "json"
              : "text";
    request.body.raw = body.raw ?? "";
  } else if (body?.mode === "urlencoded") {
    request.body.mode = "urlencoded";
    request.body.urlencoded = pmKvs(body.urlencoded);
  } else if (body?.mode === "formdata") {
    request.body.mode = "formdata";
    request.body.formdata = (body.formdata ?? []).map((f) => ({
      ...newKeyValue(text(f.key), f.type === "file" ? "" : text(f.value), !f.disabled),
      type: f.type === "file" ? "file" : "text",
      description:
        f.type === "file"
          ? t("importers.attach", { file: text(f.src) })
          : description(f.description),
    }));
  } else if (body?.mode === "graphql") {
    request.body.mode = "graphql";
    request.body.graphql = {
      query: body.graphql?.query ?? "",
      variables: body.graphql?.variables ?? "",
    };
  }

  applyV2Auth(request, pm.auth ?? inheritedAuth);

  for (const event of item.event ?? []) {
    const exec = event.script?.exec;
    const code = Array.isArray(exec) ? exec.join("\n") : (exec ?? "");
    if (event.listen === "prerequest") request.preScript = code;
    if (event.listen === "test") request.testScript = code;
  }
  return request;
}

function convertV2Items(items: PmItem[], auth?: PmAuth): CollectionItem[] {
  return items.map((item) =>
    Array.isArray(item.item)
      ? {
          type: "folder",
          id: uid("fld"),
          name: item.name ?? t("importers.folder"),
          items: convertV2Items(item.item, item.auth ?? auth),
        }
      : { type: "request", id: uid("item"), request: convertV2Request(item, auth) },
  );
}

function importV2Collection(obj: Record<string, unknown>): ImportResult {
  const info = (obj.info ?? {}) as { name?: string; description?: unknown };
  const name = info.name ?? t("importers.collection");
  const collection: Collection = {
    id: uid("col"),
    name,
    description: description(info.description),
    items: convertV2Items(obj.item as PmItem[], obj.auth as PmAuth | undefined),
  };
  const variables = pmKvs(obj.variable as PmKV[] | undefined);
  const environments = variables.length
    ? [{ id: uid("env"), name: t("importers.variables", { name }), variables }]
    : [];
  return { collections: [collection], environments, protoSets: [] };
}

function importV2Environment(obj: Record<string, unknown>): Environment {
  const values = (obj.values as Array<PmKV & { enabled?: boolean }>) ?? [];
  return {
    id: uid("env"),
    name: text(obj.name) || t("importers.environment"),
    variables: values.map((v) => newKeyValue(text(v.key), text(v.value), v.enabled !== false)),
  };
}

/** Exports a collection in the v2.1 collection format (HTTP requests only). */
export function exportCollectionV2(collection: Collection): string {
  const kv = (list: KeyValue[]) =>
    list.map((k) => ({ key: k.key, value: k.value, ...(k.enabled ? {} : { disabled: true }) }));

  const convert = (items: CollectionItem[]): unknown[] =>
    items.flatMap((item): unknown[] => {
      if (item.type === "folder") return [{ name: item.name, item: convert(item.items) }];
      const r = item.request;
      if (r.kind !== "http") return [];
      const events = [
        r.preScript && {
          listen: "prerequest",
          script: { type: "text/javascript", exec: r.preScript.split("\n") },
        },
        r.testScript && {
          listen: "test",
          script: { type: "text/javascript", exec: r.testScript.split("\n") },
        },
      ].filter(Boolean);

      let body: unknown;
      const b = r.body;
      if (["json", "text", "xml", "html"].includes(b.mode)) {
        body = {
          mode: "raw",
          raw: b.raw,
          options: { raw: { language: b.mode === "text" ? "text" : b.mode } },
        };
      } else if (b.mode === "urlencoded")
        body = { mode: "urlencoded", urlencoded: kv(b.urlencoded) };
      else if (b.mode === "formdata")
        body = {
          mode: "formdata",
          formdata: b.formdata.map((f) => ({ key: f.key, value: f.value, type: f.type })),
        };
      else if (b.mode === "graphql") body = { mode: "graphql", graphql: b.graphql };

      let auth: unknown;
      if (r.auth.type === "bearer")
        auth = { type: "bearer", bearer: [{ key: "token", value: r.auth.bearer.token }] };
      else if (r.auth.type === "basic")
        auth = {
          type: "basic",
          basic: [
            { key: "username", value: r.auth.basic.username },
            { key: "password", value: r.auth.basic.password },
          ],
        };
      else if (r.auth.type === "apikey")
        auth = {
          type: "apikey",
          apikey: [
            { key: "key", value: r.auth.apikey.key },
            { key: "value", value: r.auth.apikey.value },
            { key: "in", value: r.auth.apikey.in },
          ],
        };

      return [
        {
          name: r.name,
          event: events.length ? events : undefined,
          request: {
            method: r.method,
            header: kv(r.headers),
            url: { raw: r.url, query: kv(r.params) },
            body,
            auth,
            description: r.description,
          },
        },
      ];
    });

  return JSON.stringify(
    {
      info: {
        name: collection.name,
        description: collection.description,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: convert(collection.items),
    },
    null,
    2,
  );
}
