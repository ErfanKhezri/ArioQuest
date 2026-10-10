/**
 * Minimal path lookup for response bodies: `data.items[0].id`, `$.user.name`,
 * `items.length`, `["odd key"].value`. Returns undefined when any step is missing.
 */
export function getPath(root: unknown, path: string): unknown {
  const tokens = tokenize(path);
  if (tokens === null) return undefined;

  let current: unknown = root;
  for (const token of tokens) {
    if (current === null || current === undefined) return undefined;
    if (token === "length" && (Array.isArray(current) || typeof current === "string")) {
      current = current.length;
      continue;
    }
    if (Array.isArray(current)) {
      const index = Number(token);
      if (!Number.isInteger(index)) return undefined;
      current = current[index < 0 ? current.length + index : index];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[token];
    } else {
      return undefined;
    }
  }
  return current;
}

function tokenize(path: string): string[] | null {
  let rest = path.trim();
  if (rest.startsWith("$")) rest = rest.slice(1);
  const tokens: string[] = [];

  while (rest.length > 0) {
    if (rest.startsWith(".")) {
      rest = rest.slice(1);
      continue;
    }
    if (rest.startsWith("[")) {
      const quoted = rest.match(/^\[\s*(["'])(.*?)\1\s*\]/);
      if (quoted) {
        tokens.push(quoted[2] ?? "");
        rest = rest.slice(quoted[0].length);
        continue;
      }
      const index = rest.match(/^\[\s*(-?\d+)\s*\]/);
      if (!index) return null;
      tokens.push(index[1] ?? "");
      rest = rest.slice(index[0].length);
      continue;
    }
    const key = rest.match(/^[^.[]+/);
    if (!key) return null;
    tokens.push(key[0]);
    rest = rest.slice(key[0].length);
  }
  return tokens;
}

export function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** Renders a looked-up value the way users expect to see it in a table. */
export function stringifyValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
