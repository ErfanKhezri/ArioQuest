import { uid } from "@/lib/id";
import type { KeyValue } from "./types";

/**
 * Query helpers that work on raw text, so `{{variables}}` survive editing
 * without being percent-encoded.
 */

export function splitUrl(url: string): { base: string; query: string; hash: string } {
  const hashIndex = url.indexOf("#");
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const qIndex = withoutHash.indexOf("?");
  if (qIndex < 0) return { base: withoutHash, query: "", hash };
  return { base: withoutHash.slice(0, qIndex), query: withoutHash.slice(qIndex + 1), hash };
}

export function parseQuery(query: string): Array<{ key: string; value: string }> {
  if (!query) return [];
  return query
    .split("&")
    .filter((part) => part.length > 0)
    .map((part) => {
      const eq = part.indexOf("=");
      return eq < 0
        ? { key: part, value: "" }
        : { key: part.slice(0, eq), value: part.slice(eq + 1) };
    });
}

export function buildQuery(params: Array<Pick<KeyValue, "key" | "value" | "enabled">>): string {
  return params
    .filter((p) => p.enabled && (p.key || p.value))
    .map((p) => (p.value === "" ? p.key : `${p.key}=${p.value}`))
    .join("&");
}

/** Rebuilds the URL so its query string mirrors the enabled params. */
export function applyParamsToUrl(url: string, params: KeyValue[]): string {
  const { base, hash } = splitUrl(url);
  const query = buildQuery(params);
  return `${base}${query ? `?${query}` : ""}${hash}`;
}

/**
 * Re-derives the params table from an edited URL. Disabled params are kept
 * (they are not part of the URL), and existing rows keep their ids.
 */
export function syncParamsFromUrl(url: string, previous: KeyValue[]): KeyValue[] {
  const parsed = parseQuery(splitUrl(url).query);
  const enabledPrev = previous.filter((p) => p.enabled);
  const next: KeyValue[] = parsed.map((p, i) => {
    const prev = enabledPrev[i];
    return {
      id: prev?.id ?? uid("kv"),
      key: p.key,
      value: p.value,
      enabled: true,
      description: prev?.description,
    };
  });
  return [...next, ...previous.filter((p) => !p.enabled)];
}
