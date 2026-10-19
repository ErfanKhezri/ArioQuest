import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "@/i18n";
import { AuthError, getSession, signIn, signOut, signUp } from "../auth";

/** Makes the next fetch calls answer with these responses, in order. */
function answerWith(...responses: Array<{ status: number; body?: unknown } | Error>) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else
      fetchMock.mockResolvedValueOnce(
        new Response(response.body === undefined ? null : JSON.stringify(response.body), {
          status: response.status,
        }),
      );
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const session = { name: "Erfan", email: "erfan@example.com", token: "TOKEN" };

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signIn", () => {
  it("returns and saves the session", async () => {
    answerWith({ status: 200, body: session });

    await expect(signIn("erfan@example.com", "secret123")).resolves.toEqual(session);

    answerWith({ status: 200, body: { name: "Erfan", email: "erfan@example.com" } });
    await expect(getSession()).resolves.toEqual(session);
  });

  it("shows a wrong password under the password field, in the user's language", async () => {
    answerWith({
      status: 401,
      body: { code: "invalid_credentials", error: "Wrong email or password.", field: "password" },
    });

    const error = await signIn("erfan@example.com", "nope").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(AuthError);
    expect(error).toMatchObject({
      field: "password",
      message: t("login.errors.wrongCredentials"),
    });
  });

  it("explains when the server cannot be reached", async () => {
    answerWith(new TypeError("Failed to fetch"));

    await expect(signIn("erfan@example.com", "secret123")).rejects.toMatchObject({
      field: undefined,
      message: t("login.errors.network"),
    });
  });
});

describe("signUp", () => {
  it("shows a taken email under the email field", async () => {
    answerWith({
      status: 409,
      body: {
        code: "email_taken",
        error: "An account with this email already exists.",
        field: "email",
      },
    });

    await expect(signUp("A", "a@b.co", "secret123")).rejects.toMatchObject({
      field: "email",
      message: t("login.errors.emailTaken"),
    });
  });
});

describe("getSession", () => {
  it("drops a session the server no longer accepts", async () => {
    answerWith({ status: 200, body: session });
    await signIn("erfan@example.com", "secret123");

    answerWith({ status: 401, body: { code: "unauthenticated", error: "Sign in to continue." } });
    await expect(getSession()).resolves.toBeNull();
  });

  it("keeps the session when the server cannot be reached", async () => {
    answerWith({ status: 200, body: session });
    await signIn("erfan@example.com", "secret123");

    answerWith(new TypeError("Failed to fetch"));
    await expect(getSession()).resolves.toEqual(session);
  });
});

describe("signOut", () => {
  it("ends the session on the server and forgets it locally", async () => {
    answerWith({ status: 200, body: session });
    await signIn("erfan@example.com", "secret123");

    const fetchMock = answerWith({ status: 204 });
    await signOut();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.arioquest.ir/auth/sign-out",
      expect.objectContaining({ headers: { Authorization: "Bearer TOKEN" } }),
    );
    await expect(getSession()).resolves.toBeNull();
  });

  it("still signs out when offline", async () => {
    answerWith({ status: 200, body: session });
    await signIn("erfan@example.com", "secret123");

    answerWith(new TypeError("Failed to fetch"));
    await signOut();

    await expect(getSession()).resolves.toBeNull();
  });
});
