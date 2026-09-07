import "server-only";
import { cookies, headers } from "next/headers";
import { ApiError } from "@/lib/api-client";

/**
 * The website's way in to its own API, from the server.
 *
 * The browser has it easy: a relative path and `fetch` attaches the session
 * cookie itself. A server component has neither. It needs an absolute origin,
 * because there is no page to be relative to, and it has to carry the cookie
 * across by hand, because a request the server makes is nobody's browser.
 *
 * The origin comes from the incoming request rather than from configuration.
 * A deploy behind a proxy, a preview build, and a machine running on 3100 all
 * answer on different hosts, and a base URL pinned in an environment variable
 * is the one that is wrong on two of the three.
 */

async function origin() {
  const heads = await headers();
  const host = heads.get("x-forwarded-host") ?? heads.get("host");
  if (!host)
    throw new Error(
      "The server API client needs a host header to build an absolute URL.",
    );
  const protocol =
    heads.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${protocol}://${host}`;
}

type Body = Record<string, unknown> | undefined;

async function call<T>(
  method: string,
  path: string,
  body?: Body,
  init?: { cache?: RequestCache; revalidate?: number },
): Promise<T> {
  const jar = await cookies();
  const cookie = jar
    .getAll()
    .map((one) => `${one.name}=${one.value}`)
    .join("; ");

  const response = await fetch(`${await origin()}/api/v1${path}`, {
    method,
    headers: {
      // Everything the route needs to know whose request this is. The routes
      // accept a session cookie or a key; the site holds a session, and this
      // hands the same one the page was rendered for.
      ...(cookie ? { cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    // A page's own data is per-request by definition: it is answered for the
    // cookie above, and caching it would serve one account's answer to the
    // next.
    cache: init?.cache ?? "no-store",
    ...(init?.revalidate === undefined
      ? {}
      : { next: { revalidate: init.revalidate } }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const { code, message, ...extra } = (payload?.error ?? {}) as {
      code?: string;
      message?: string;
    } & Record<string, unknown>;
    throw new ApiError(
      code ?? "internal",
      message ?? "The request could not be completed.",
      response.status,
      extra,
    );
  }
  return payload as T;
}

export const serverApi = {
  get: <T>(path: string, init?: { cache?: RequestCache; revalidate?: number }) =>
    call<T>("GET", path, undefined, init),
  post: <T>(path: string, body?: Body) => call<T>("POST", path, body),
  patch: <T>(path: string, body?: Body) => call<T>("PATCH", path, body),
  put: <T>(path: string, body?: Body) => call<T>("PUT", path, body),
  delete: <T>(path: string) => call<T>("DELETE", path),
};

/**
 * The `{ data, error }` shape, for pages that would rather branch than catch.
 *
 * A page reading four things in parallel wants a missing one to leave a hole,
 * not to take the render down with it.
 */
export async function settleServer<T>(
  call: Promise<T>,
): Promise<{ data: T | null; error: unknown }> {
  try {
    return { data: await call, error: null };
  } catch (reason) {
    return { data: null, error: reason };
  }
}
