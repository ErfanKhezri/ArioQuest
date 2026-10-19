import { t } from "@/i18n";
import { uid } from "@/lib/id";
import type {
  ApiRequest,
  Assertion,
  CollectionItem,
  Extraction,
  GrpcRequest,
  HttpRequest,
  KeyValue,
} from "./types";

export const newKeyValue = (key = "", value = "", enabled = true): KeyValue => ({
  id: uid("kv"),
  key,
  value,
  enabled,
});

export const newAssertion = (partial: Partial<Assertion> = {}): Assertion => ({
  id: uid("as"),
  enabled: true,
  source: "status",
  property: "",
  operator: "equals",
  expected: "200",
  ...partial,
});

export const newExtraction = (partial: Partial<Extraction> = {}): Extraction => ({
  id: uid("ex"),
  enabled: true,
  variable: "",
  source: "jsonPath",
  path: "",
  ...partial,
});

export function newHttpRequest(partial: Partial<HttpRequest> = {}): HttpRequest {
  return {
    kind: "http",
    id: uid("req"),
    name: t("defaults.untitledRequest"),
    method: "GET",
    url: "",
    params: [],
    headers: [],
    body: {
      mode: "none",
      raw: "",
      urlencoded: [],
      formdata: [],
      graphql: { query: "", variables: "" },
    },
    auth: {
      type: "none",
      bearer: { token: "" },
      basic: { username: "", password: "" },
      apikey: { key: "X-API-Key", value: "", in: "header" },
    },
    settings: { timeoutMs: 30000, followRedirects: true, verifyTls: true },
    preScript: "",
    testScript: "",
    assertions: [],
    extractions: [],
    ...partial,
  };
}

export function newGrpcRequest(partial: Partial<GrpcRequest> = {}): GrpcRequest {
  return {
    kind: "grpc",
    id: uid("req"),
    name: t("defaults.untitledGrpc"),
    target: "localhost:50051",
    tls: false,
    source: { type: "reflection" },
    method: "",
    message: "{\n  \n}",
    metadata: [],
    timeoutMs: 30000,
    preScript: "",
    testScript: "",
    assertions: [],
    extractions: [],
    ...partial,
  };
}

/** Deep copy with fresh ids so the copy can live next to the original. */
export function cloneRequest<T extends ApiRequest>(request: T, name?: string): T {
  const copy = structuredClone(request);
  copy.id = uid("req");
  if (name !== undefined) copy.name = name;
  return copy;
}

export function cloneItem(item: CollectionItem): CollectionItem {
  if (item.type === "request") {
    return { type: "request", id: uid("item"), request: cloneRequest(item.request) };
  }
  return { ...item, id: uid("fld"), items: item.items.map(cloneItem) };
}

/** Fills in fields added in later versions so old saved data keeps working. */
export function normalizeRequest(request: ApiRequest): ApiRequest {
  if (request.kind === "grpc") {
    const base = newGrpcRequest();
    return { ...base, ...request, source: request.source ?? base.source };
  }
  const base = newHttpRequest();
  return {
    ...base,
    ...request,
    body: {
      ...base.body,
      ...request.body,
      graphql: { ...base.body.graphql, ...request.body?.graphql },
    },
    auth: {
      ...base.auth,
      ...request.auth,
      bearer: { ...base.auth.bearer, ...request.auth?.bearer },
      basic: { ...base.auth.basic, ...request.auth?.basic },
      apikey: { ...base.auth.apikey, ...request.auth?.apikey },
    },
    settings: { ...base.settings, ...request.settings },
  };
}
