import { invokeCommand, isTauri } from "./tauri";

/**
 * Sign-in for ArioQuest. The rest of the app only uses these four functions
 * and the `Session` / `AuthError` types, so the mock below can be replaced by
 * a real API without touching any screen.
 */

export interface Session {
  name: string;
  email: string;
  token: string;
}

/** An error the sign-in form shows under a field (or under the button). */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly field?: "name" | "email" | "password",
  ) {
    super(message);
  }
}

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

export const getSession = readSession;

export async function signIn(email: string, password: string): Promise<Session> {
  // TODO(auth): replace the mock with the real API, e.g.
  //   const res = await fetch(`${API_URL}/auth/sign-in`, { method: "POST", body: ... });
  //   map 401 to new AuthError("Wrong email or password.", "password").
  const session = await mockAuthenticate(email.split("@")[0] ?? email, email, password);
  await writeSession(session);
  return session;
}

export async function signUp(name: string, email: string, password: string): Promise<Session> {
  if (!name.trim()) throw new AuthError("Enter your name.", "name");
  // TODO(auth): replace the mock with the real sign-up endpoint.
  const session = await mockAuthenticate(name.trim(), email, password);
  await writeSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  // TODO(auth): also revoke the token on the server once there is one.
  await writeSession(null);
}

/** Accepts any valid email with a password of at least 8 characters. */
async function mockAuthenticate(name: string, email: string, password: string) {
  await new Promise((resolve) => setTimeout(resolve, 700));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new AuthError("Enter a valid email address.", "email");
  }
  if (password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", "password");
  }
  return { name, email: email.trim(), token: `mock-${crypto.randomUUID()}` };
}
