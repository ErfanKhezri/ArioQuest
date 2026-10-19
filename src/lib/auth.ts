import { t } from "@/i18n";
import { isWebDemo } from "./demo";
import { invokeCommand, isTauri } from "./tauri";

/**
 * Sign-in for ArioQuest, backed by the API in backend/. The rest of the app only
 * uses these four functions and the `Session` / `AuthError` types.
 */

export interface Session {
  name: string;
  email: string;
  token: string;
}

type Field = "name" | "email" | "password";

/** An error the sign-in form shows under a field (or under the button). */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly field?: Field,
  ) {
    super(message);
  }
}

/** Set VITE_API_URL (e.g. in .env.local) to use a local backend while developing. */
const API_URL = import.meta.env.VITE_API_URL ?? "https://api.arioquest.ir";

const SESSION_KEY = "session";

async function readSession(): Promise<Session | null> {
  const raw = isTauri()
    ? await invokeCommand("store_read", { key: SESSION_KEY })
    : localStorage.getItem(`arioquest:${SESSION_KEY}`);
  return raw ? (JSON.parse(raw) as Session | null) : null;
}

async function writeSession(session: Session | null): Promise<void> {
  const value = JSON.stringify(session);
  if (isTauri()) await invokeCommand("store_write", { key: SESSION_KEY, value });
  else localStorage.setItem(`arioquest:${SESSION_KEY}`, value);
}

/** The web demo skips sign-in. */
const GUEST: Session = { name: "Guest", email: "guest", token: "web-demo" };

/**
 * The saved session, if it is still valid. A session the server no longer
 * accepts (expired, or signed out elsewhere) is dropped; when the server cannot
 * be reached, the saved session is kept so the app still opens offline.
 */
export async function getSession(): Promise<Session | null> {
  if (isWebDemo) return GUEST;
  const session = await readSession();
  if (!session) return null;
  try {
    await callApi("GET", "/me", undefined, session.token);
    return session;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await writeSession(null);
      return null;
    }
    return session;
  }
}

export async function signIn(email: string, password: string): Promise<Session> {
  const session = await authRequest("/auth/sign-in", { email, password });
  await writeSession(session);
  return session;
}

export async function signUp(name: string, email: string, password: string): Promise<Session> {
  const session = await authRequest("/auth/sign-up", { name, email, password });
  await writeSession(session);
  return session;
}

/** Ends the session on the server too. Signing out still works when offline. */
export async function signOut(): Promise<void> {
  const session = await readSession();
  if (session && !isWebDemo) {
    await callApi("POST", "/auth/sign-out", undefined, session.token).catch(() => undefined);
  }
  await writeSession(null);
}

/** Sends a sign-in or sign-up request and turns every failure into an AuthError. */
async function authRequest(path: string, body: object): Promise<Session> {
  try {
    return (await callApi("POST", path, body)) as Session;
  } catch (err) {
    if (err instanceof ApiError) throw new AuthError(messageFor(err), err.field);
    throw new AuthError(t("login.errors.network"));
  }
}

/** The JSON body the API sends with every error. */
interface ErrorBody {
  code?: string;
  error?: string;
  field?: Field;
}

/** An error response from the API (as opposed to the API being unreachable). */
class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: Field,
  ) {
    super(message);
  }
}

/**
 * Calls the API and returns the parsed JSON body (undefined when it is empty).
 * Throws an ApiError for an error response, and a TypeError when the server
 * cannot be reached.
 */
async function callApi(
  method: "GET" | "POST",
  path: string,
  body?: object,
  token?: string,
): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const error = (json ?? {}) as ErrorBody;
    throw new ApiError(response.status, error.code ?? "", error.error ?? "", error.field);
  }
  return json;
}

/** The message for an API error, in the user's language. */
function messageFor(err: ApiError): string {
  switch (err.code) {
    case "name_required":
      return t("login.errors.enterName");
    case "name_too_long":
      return t("login.errors.nameTooLong");
    case "email_invalid":
      return t("login.errors.invalidEmail");
    case "email_taken":
      return t("login.errors.emailTaken");
    case "password_too_short":
      return t("login.errors.shortPassword");
    case "password_too_long":
      return t("login.errors.passwordTooLong");
    case "invalid_credentials":
      return t("login.errors.wrongCredentials");
    default:
      return t("login.errors.generic");
  }
}
