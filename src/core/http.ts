import {
  type HttpBodyPayload,
  type HttpRequestPayload,
  type WireKeyValue,
  invokeCommand,
  isTauri,
} from "@/lib/tauri";
import { type VariableResolver, interpolate } from "./variables";
import type { HttpRequest, HttpResponseData, KeyValue, SentRequestInfo } from "./types";

const enabled = (list: KeyValue[]) => list.filter((kv) => kv.enabled && kv.key.trim() !== "");

const defaultContentType: Partial<Record<HttpRequest["body"]["mode"], string>> = {
  json: "application/json",
  graphql: "application/json",
  text: "text/plain",
  xml: "application/xml",
  html: "text/html",
};

const hasHeader = (headers: WireKeyValue[], name: string) =>
  headers.some((h) => h.key.toLowerCase() === name.toLowerCase());

const toBase64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

/** Resolves variables, auth and body into the payload sent to the backend. */
export function buildHttpPayload(
  request: HttpRequest,
  resolve: VariableResolver,
  requestId: string,
): HttpRequestPayload {
  const v = (text: string) => interpolate(text, resolve);

  const headers: WireKeyValue[] = enabled(request.headers).map((h) => ({
    key: v(h.key).trim(),
    value: v(h.value),
  }));
  let url = v(request.url).trim();

  const { auth } = request;
  if (auth.type === "bearer" && auth.bearer.token && !hasHeader(headers, "authorization")) {
    headers.push({ key: "Authorization", value: `Bearer ${v(auth.bearer.token)}` });
  } else if (auth.type === "basic" && !hasHeader(headers, "authorization")) {
    const credentials = `${v(auth.basic.username)}:${v(auth.basic.password)}`;
    headers.push({ key: "Authorization", value: `Basic ${toBase64(credentials)}` });
  } else if (auth.type === "apikey" && auth.apikey.key) {
    const key = v(auth.apikey.key);
    const value = v(auth.apikey.value);
    if (auth.apikey.in === "header") {
      if (!hasHeader(headers, key)) headers.push({ key, value });
    } else {
      const pair = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      const hashIndex = url.indexOf("#");
      const [path, hash] =
        hashIndex >= 0 ? [url.slice(0, hashIndex), url.slice(hashIndex)] : [url, ""];
      url = `${path}${path.includes("?") ? "&" : "?"}${pair}${hash}`;
    }
  }

  const body = buildBody(request, v);
  const contentType = defaultContentType[request.body.mode];
  if (body && contentType && !hasHeader(headers, "content-type")) {
    headers.push({ key: "Content-Type", value: contentType });
  }
  if (
    request.body.mode === "binary" &&
    request.body.binary?.contentType &&
    !hasHeader(headers, "content-type")
  ) {
    headers.push({ key: "Content-Type", value: request.body.binary.contentType });
  }

  return {
    requestId,
    method: request.method,
    url,
    headers,
    body,
    settings: request.settings,
  };
}

function buildBody(request: HttpRequest, v: (s: string) => string): HttpBodyPayload | undefined {
  const { body } = request;
  switch (body.mode) {
    case "none":
      return undefined;
    case "json":
    case "text":
    case "xml":
    case "html":
      return { type: "text", content: v(body.raw) };
    case "graphql": {
      let variables: unknown = undefined;
      const rawVars = v(body.graphql.variables).trim();
      if (rawVars) {
        try {
          variables = JSON.parse(rawVars);
        } catch {
          throw new Error("GraphQL variables are not valid JSON");
        }
      }
      return { type: "text", content: JSON.stringify({ query: v(body.graphql.query), variables }) };
    }
    case "urlencoded":
      return {
        type: "urlEncoded",
        fields: enabled(body.urlencoded).map((f) => ({ key: v(f.key), value: v(f.value) })),
      };
    case "formdata":
      return {
        type: "multipart",
        fields: body.formdata
          .filter((f) => f.enabled && f.key.trim())
          .map((f) =>
            f.type === "file" && f.file
              ? {
                  key: v(f.key),
                  value: "",
                  file: {
                    name: f.file.name,
                    base64: f.file.base64,
                    contentType: f.file.contentType,
                  },
                }
              : { key: v(f.key), value: v(f.value) },
          ),
      };
    case "binary":
      return body.binary ? { type: "binary", base64: body.binary.base64 } : undefined;
  }
}

export function describeSent(payload: HttpRequestPayload): SentRequestInfo {
  const body = payload.body;
  let text: string | undefined;
  if (body?.type === "text") text = body.content;
  else if (body?.type === "urlEncoded")
    text = body.fields
      .map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
      .join("&");
  else if (body?.type === "multipart")
    text = body.fields
      .map((f) => `${f.key}: ${f.file ? `<file ${f.file.name}>` : f.value}`)
      .join("\n");
  else if (body?.type === "binary")
    text = `<binary ${Math.round((body.base64.length * 3) / 4)} bytes>`;
  return { method: payload.method, url: payload.url, headers: payload.headers, body: text };
}

export async function sendHttp(payload: HttpRequestPayload): Promise<HttpResponseData> {
  if (isTauri()) return invokeCommand("send_http_request", { payload });
  return sendWithFetch(payload);
}

export async function cancelRequest(requestId: string): Promise<void> {
  if (isTauri()) await invokeCommand("cancel_request", { requestId });
  else fetchControllers.get(requestId)?.abort();
}

const fetchControllers = new Map<string, AbortController>();

const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Browser fallback used by `pnpm dev` (subject to CORS, unlike the desktop app). */
async function sendWithFetch(payload: HttpRequestPayload): Promise<HttpResponseData> {
  const controller = new AbortController();
  fetchControllers.set(payload.requestId, controller);
  const timer =
    payload.settings.timeoutMs > 0
      ? setTimeout(() => controller.abort(), payload.settings.timeoutMs)
      : undefined;

  const headers = new Headers();
  payload.headers.forEach((h) => headers.append(h.key, h.value));

  let body: BodyInit | undefined;
  const b = payload.body;
  if (b?.type === "text") body = b.content;
  else if (b?.type === "urlEncoded")
    body = new URLSearchParams(b.fields.map((f) => [f.key, f.value]));
  else if (b?.type === "binary") body = base64ToBytes(b.base64);
  else if (b?.type === "multipart") {
    const form = new FormData();
    for (const f of b.fields) {
      if (f.file)
        form.append(
          f.key,
          new Blob([base64ToBytes(f.file.base64)], { type: f.file.contentType }),
          f.file.name,
        );
      else form.append(f.key, f.value);
    }
    headers.delete("content-type");
    body = form;
  }

  const url = /^[a-z]+:\/\//i.test(payload.url) ? payload.url : `http://${payload.url}`;
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: payload.method,
      headers,
      body,
      redirect: payload.settings.followRedirects ? "follow" : "manual",
      signal: controller.signal,
    });
    const buffer = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "";
    const isBinary = /^(image|audio|video)\/|octet-stream|pdf|zip/.test(contentType);
    let binary = "";
    if (isBinary) buffer.forEach((byte) => (binary += String.fromCharCode(byte)));
    return {
      status: res.status,
      statusText: res.statusText,
      httpVersion: "",
      url: res.url,
      headers: [...res.headers.entries()].map(([key, value]) => ({ key, value })),
      body: isBinary ? "" : new TextDecoder().decode(buffer),
      bodyBase64: isBinary ? btoa(binary) : null,
      isBinary,
      size: buffer.byteLength,
      timeMs: performance.now() - started,
    };
  } catch (err) {
    if (controller.signal.aborted)
      throw new Error("Request cancelled or timed out", { cause: err });
    throw new Error(
      `Request failed — ${err instanceof Error ? err.message : String(err)}. ` +
        "In the browser preview requests are limited by CORS; run the desktop app for full access.",
      { cause: err },
    );
  } finally {
    clearTimeout(timer);
    fetchControllers.delete(payload.requestId);
  }
}
