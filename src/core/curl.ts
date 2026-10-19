import { t } from "@/i18n";
import { newHttpRequest, newKeyValue } from "./factory";
import { buildHttpPayload } from "./http";
import { splitUrl, syncParamsFromUrl } from "./url";
import type { VariableResolver } from "./variables";
import { HTTP_METHODS, type FormField, type HttpMethodName, type HttpRequest } from "./types";
import { uid } from "@/lib/id";

/** Splits a shell command line into words (POSIX quoting, plus `^` line breaks from cmd.exe). */
export function shellSplit(input: string): string[] {
  const text = input.replace(/\\\r?\n/g, " ").replace(/\^\r?\n/g, " ");
  const words: string[] = [];
  let current = "";
  let inWord = false;
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quote === "'") {
      if (ch === "'") quote = null;
      else current += ch;
    } else if (quote === '"') {
      if (ch === '"') quote = null;
      else if (ch === "\\" && i + 1 < text.length && '"\\$`'.includes(text[i + 1] as string)) {
        current += text[++i];
      } else current += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      inWord = true;
    } else if (ch === "$" && text[i + 1] === "'") {
      // Bash ANSI-C quoting: $'...\n...'
      const end = text.indexOf("'", i + 2);
      const body = text.slice(i + 2, end < 0 ? undefined : end);
      current += body
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");
      inWord = true;
      i = end < 0 ? text.length : end;
    } else if (ch === "\\" && i + 1 < text.length) {
      current += text[++i];
      inWord = true;
    } else if (/\s/.test(ch)) {
      if (inWord) words.push(current);
      current = "";
      inWord = false;
    } else {
      current += ch;
      inWord = true;
    }
  }
  if (inWord) words.push(current);
  return words;
}

export const looksLikeCurl = (text: string) => /^\s*curl(\.exe)?\s/i.test(text);

const FLAG_WITH_VALUE = new Set([
  "-X",
  "--request",
  "-H",
  "--header",
  "-d",
  "--data",
  "--data-raw",
  "--data-binary",
  "--data-ascii",
  "--data-urlencode",
  "-F",
  "--form",
  "--form-string",
  "-u",
  "--user",
  "--url",
  "-A",
  "--user-agent",
  "-b",
  "--cookie",
  "-e",
  "--referer",
  "--json",
  "-m",
  "--max-time",
  "--connect-timeout",
  "-o",
  "--output",
  "-x",
  "--proxy",
  "-w",
  "--write-out",
  "--retry",
  "--cacert",
  "--cert",
  "--key",
  "--resolve",
]);

/** Converts a cURL command into a request. Throws if it is not a cURL command. */
export function parseCurl(command: string): HttpRequest {
  const words = shellSplit(command.trim());
  if (!words[0] || !/^curl(\.exe)?$/i.test(words[0])) throw new Error(t("errors.notCurl"));

  const request = newHttpRequest({ name: t("importers.fromCurl") });
  let method: string | undefined;
  let url = "";
  const data: string[] = [];
  const form: FormField[] = [];
  let forceGet = false;
  let isJson = false;
  let urlencodedData = false;

  for (let i = 1; i < words.length; i++) {
    let word = words[i] as string;
    let value: string | undefined;
    // --flag=value form
    if (word.startsWith("--") && word.includes("=")) {
      const eq = word.indexOf("=");
      value = word.slice(eq + 1);
      word = word.slice(0, eq);
    } else if (/^-[A-Za-z]./.test(word) && FLAG_WITH_VALUE.has(word.slice(0, 2))) {
      // -XPOST / -H'Accept: x'
      value = word.slice(2);
      word = word.slice(0, 2);
    }
    const next = () => value ?? words[++i] ?? "";

    switch (word) {
      case "-X":
      case "--request":
        method = next().toUpperCase();
        break;
      case "-H":
      case "--header": {
        const header = next();
        const colon = header.indexOf(":");
        if (colon > 0) {
          request.headers.push(
            newKeyValue(header.slice(0, colon).trim(), header.slice(colon + 1).trim()),
          );
        }
        break;
      }
      case "-d":
      case "--data":
      case "--data-raw":
      case "--data-binary":
      case "--data-ascii":
        data.push(next());
        break;
      case "--data-urlencode":
        urlencodedData = true;
        data.push(encodeDataUrlencode(next()));
        break;
      case "--json":
        isJson = true;
        data.push(next());
        break;
      case "-F":
      case "--form":
      case "--form-string": {
        const field = next();
        const eq = field.indexOf("=");
        const key = eq >= 0 ? field.slice(0, eq) : field;
        const val = eq >= 0 ? field.slice(eq + 1) : "";
        const isFile = word !== "--form-string" && val.startsWith("@");
        form.push({
          id: uid("kv"),
          key,
          value: isFile ? "" : val,
          enabled: true,
          type: isFile ? "file" : "text",
          // Files referenced by path must be re-attached by the user.
          description: isFile ? t("importers.attach", { file: val.slice(1) }) : undefined,
        });
        break;
      }
      case "-u":
      case "--user": {
        const creds = next();
        const colon = creds.indexOf(":");
        request.auth.type = "basic";
        request.auth.basic = {
          username: colon >= 0 ? creds.slice(0, colon) : creds,
          password: colon >= 0 ? creds.slice(colon + 1) : "",
        };
        break;
      }
      case "-A":
      case "--user-agent":
        request.headers.push(newKeyValue("User-Agent", next()));
        break;
      case "-b":
      case "--cookie":
        request.headers.push(newKeyValue("Cookie", next()));
        break;
      case "-e":
      case "--referer":
        request.headers.push(newKeyValue("Referer", next()));
        break;
      case "--url":
        url = next();
        break;
      case "-G":
      case "--get":
        forceGet = true;
        break;
      case "-I":
      case "--head":
        method = "HEAD";
        break;
      case "-k":
      case "--insecure":
        request.settings.verifyTls = false;
        break;
      case "-L":
      case "--location":
        request.settings.followRedirects = true;
        break;
      case "-m":
      case "--max-time":
        request.settings.timeoutMs =
          Math.round(Number(next()) * 1000) || request.settings.timeoutMs;
        break;
      default:
        if (FLAG_WITH_VALUE.has(word)) next();
        else if (/^-[A-Za-z]{2,}$/.test(word)) {
          // Bundled boolean flags such as -sSLk
          if (word.includes("k")) request.settings.verifyTls = false;
          if (word.includes("L")) request.settings.followRedirects = true;
          if (word.includes("I")) method = "HEAD";
          if (word.includes("G")) forceGet = true;
        } else if (!word.startsWith("-") && !url) url = word;
    }
  }

  if (forceGet && data.length > 0) {
    const { query } = splitUrl(url);
    url = `${url}${query ? "&" : "?"}${data.join("&")}`;
    data.length = 0;
  }

  if (form.length > 0) {
    request.body.mode = "formdata";
    request.body.formdata = form;
  } else if (data.length > 0) {
    const body = data.join("&");
    const contentType =
      request.headers.find((h) => h.key.toLowerCase() === "content-type")?.value.toLowerCase() ??
      "";
    if (isJson || contentType.includes("json") || (!contentType && looksLikeJson(body))) {
      request.body.mode = "json";
      request.body.raw = prettyJson(body);
      if (isJson && !contentType)
        request.headers.push(newKeyValue("Content-Type", "application/json"));
    } else if (contentType.includes("xml")) {
      request.body.mode = "xml";
      request.body.raw = body;
    } else if (urlencodedData || !contentType || contentType.includes("x-www-form-urlencoded")) {
      request.body.mode = "urlencoded";
      request.body.urlencoded = body.split("&").map((pair) => {
        const eq = pair.indexOf("=");
        const k = eq >= 0 ? pair.slice(0, eq) : pair;
        const v = eq >= 0 ? pair.slice(eq + 1) : "";
        return newKeyValue(safeDecode(k), safeDecode(v));
      });
      // The body mode adds this header itself.
      request.headers = request.headers.filter((h) => h.key.toLowerCase() !== "content-type");
    } else {
      request.body.mode = "text";
      request.body.raw = body;
    }
  }

  const resolvedMethod = (method ??
    (forceGet ? "GET" : data.length || form.length ? "POST" : "GET")) as HttpMethodName;
  request.method = HTTP_METHODS.includes(resolvedMethod) ? resolvedMethod : "GET";
  request.url = url;
  request.params = syncParamsFromUrl(url, []);
  request.name = nameFromUrl(url) ?? request.name;
  return request;
}

function encodeDataUrlencode(value: string): string {
  const eq = value.indexOf("=");
  if (eq < 0) return encodeURIComponent(value);
  return `${value.slice(0, eq)}=${encodeURIComponent(value.slice(eq + 1))}`;
}

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
};

const looksLikeJson = (s: string) => /^\s*[[{]/.test(s);

function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function nameFromUrl(url: string): string | undefined {
  const path = splitUrl(url).base.replace(/^[a-z]+:\/\/[^/]+/i, "");
  const segments = path.split("/").filter(Boolean);
  return segments.length ? segments.slice(-2).join("/") : undefined;
}

const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** Generates a cURL command equivalent to the request (variables resolved). */
export function toCurl(request: HttpRequest, resolve: VariableResolver): string {
  const payload = buildHttpPayload(request, resolve, "curl");
  const parts = ["curl"];
  if (payload.method !== "GET") parts.push(`-X ${payload.method}`);
  parts.push(shellQuote(payload.url));
  for (const h of payload.headers) parts.push(`-H ${shellQuote(`${h.key}: ${h.value}`)}`);

  const body = payload.body;
  if (body?.type === "text") parts.push(`--data-raw ${shellQuote(body.content)}`);
  else if (body?.type === "urlEncoded") {
    for (const f of body.fields)
      parts.push(`--data-urlencode ${shellQuote(`${f.key}=${f.value}`)}`);
  } else if (body?.type === "multipart") {
    for (const f of body.fields) {
      parts.push(`-F ${shellQuote(f.file ? `${f.key}=@${f.file.name}` : `${f.key}=${f.value}`)}`);
    }
  } else if (body?.type === "binary") {
    parts.push(`--data-binary @${shellQuote(request.body.binary?.name ?? "file")}`);
  }
  if (!payload.settings.verifyTls) parts.push("-k");
  if (payload.settings.followRedirects) parts.push("-L");
  return parts.join(" \\\n  ");
}

/** Generates a JavaScript `fetch` snippet. */
export function toFetch(request: HttpRequest, resolve: VariableResolver): string {
  const payload = buildHttpPayload(request, resolve, "fetch");
  const init: string[] = [`  method: ${JSON.stringify(payload.method)},`];
  if (payload.headers.length) {
    const headers = payload.headers.map(
      (h) => `    ${JSON.stringify(h.key)}: ${JSON.stringify(h.value)},`,
    );
    init.push(`  headers: {\n${headers.join("\n")}\n  },`);
  }
  const body = payload.body;
  if (body?.type === "text") init.push(`  body: ${JSON.stringify(body.content)},`);
  else if (body?.type === "urlEncoded") {
    const pairs = body.fields.map((f) => `[${JSON.stringify(f.key)}, ${JSON.stringify(f.value)}]`);
    init.push(`  body: new URLSearchParams([${pairs.join(", ")}]),`);
  }
  return `const response = await fetch(${JSON.stringify(payload.url)}, {\n${init.join("\n")}\n});\nconst data = await response.json();`;
}
