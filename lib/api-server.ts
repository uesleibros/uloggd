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
 * That origin is the loopback, never the public name.
 *
 * The first version built it from the request's own host and guessed the
 * scheme, defaulting to https for anything that was not localhost. On Square
 * Cloud the app answers plain HTTP on port 80, so every render opened a TLS
 * handshake against a listener that replied in cleartext and died with
 * ERR_SSL_PACKET_LENGTH_TOO_LONG. Production was down for it.
 *
 * Going out to the public name and back was wrong even when it worked: it is a
 * hop through DNS, the proxy and TLS to reach a route in this very process. The
 * loopback cannot get the scheme wrong, cannot be redirected, and does not
 * depend on the deployment telling us how it is fronted.
 */

/** The port this process is actually listening on. */
function servingPort(host: string | null) {
  // Every platform that runs this sets PORT, Square Cloud included.
  const fromEnv = process.env.PORT?.trim();
  if (fromEnv) return fromEnv;
  // `next start -p 3100` does not, so the host the request arrived on is the
  // next best witness: it carries the port whenever one was named.
  const fromHost = host?.split(":")[1]?.trim();
  if (fromHost) return fromHost;
  return "3000";
}

export async function serverApiOrigin() {
  const heads = await headers();
  const host = heads.get("x-forwarded-host") ?? heads.get("host");
  return `http://127.0.0.1:${servingPort(host)}`;
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

  const response = await fetch(`${await serverApiOrigin()}/api/v1${path}`, {
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
  get: <T>(
    path: string,
    init?: { cache?: RequestCache; revalidate?: number },
  ) => call<T>("GET", path, undefined, init),
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
