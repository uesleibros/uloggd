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
 * That origin is always cleartext, and it is found by trying rather than by
 * guessing.
 *
 * Two deploys were lost to guessing. The first built it from the request's
 * host and assumed https for anything that was not localhost, which put a TLS
 * handshake in front of Square Cloud's cleartext listener on port 80:
 * ERR_SSL_PACKET_LENGTH_TOO_LONG on every render. The second assumed the
 * loopback, and Square Cloud binds the server to its hostname rather than to
 * every interface, so 127.0.0.1:80 had nothing listening:
 * ECONNREFUSED on every render.
 *
 * There is no single address that is right everywhere. `uloggd.com` is the
 * public name with TLS terminated at the edge, `squarecloud.app:80` is what
 * the process actually bound to, and a laptop is `localhost:3100`. So the
 * candidates are tried in order of how directly they reach this process, and
 * the first one that answers is kept for the life of the worker. A wrong guess
 * now costs one refused connection instead of the site.
 */

/** The port this process is listening on. */
function servingPort(host: string | null) {
  const fromEnv = process.env.PORT?.trim();
  if (fromEnv) return fromEnv;
  // `next start -p 3100` sets no PORT, so the host the request arrived on is
  // the next best witness: it carries the port whenever one was named.
  const fromHost = host?.split(":")[1]?.trim();
  return fromHost || "3000";
}

/**
 * Where this process might answer, most direct first.
 *
 * Always http: the listener inside the container is cleartext everywhere this
 * runs, because whatever terminates TLS does it in front.
 */
function candidateOrigins(host: string | null) {
  const port = servingPort(host);
  const bound = process.env.HOSTNAME?.trim();
  const found: string[] = [];

  // What the server bound to, which is what Next prints on boot. On Square
  // Cloud that is the hostname, not a wildcard, which is the whole reason the
  // loopback was refused.
  if (bound && bound !== "0.0.0.0" && bound !== "::")
    found.push(`http://${bound}:${port}`);

  found.push(`http://127.0.0.1:${port}`);

  // The address the request itself arrived on. Last because behind a proxy it
  // is the public name, and reaching ourselves through the edge is a hop we do
  // not need, but it is the one address we know routes.
  if (host) found.push(`http://${host}`);

  return [...new Set(found)];
}

/** The candidate that answered, remembered so the cost is paid once. */
let reachable: string | null = null;

export async function serverApiOrigin() {
  if (reachable) return reachable;
  const heads = await headers();
  return candidateOrigins(
    heads.get("host") ?? heads.get("x-forwarded-host"),
  )[0];
}

/** Whether a failure was the connection itself rather than an answer. */
function unreachable(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return (
    error instanceof TypeError ||
    cause?.code === "ECONNREFUSED" ||
    cause?.code === "ENOTFOUND" ||
    cause?.code === "EAI_AGAIN" ||
    cause?.code === "ERR_SSL_PACKET_LENGTH_TOO_LONG"
  );
}

/**
 * Sends the request to the first candidate that answers at all.
 *
 * An HTTP error is an answer: a 404 from the route means the address is right
 * and the path is not, so it comes straight back. Only a connection that never
 * completed moves on to the next address, and the winner is remembered.
 */
async function request(
  origins: string[],
  path: string,
  init: RequestInit & { next?: { revalidate: number } },
) {
  let last: unknown;
  for (const origin of origins) {
    try {
      const response = await fetch(`${origin}${path}`, init);
      reachable = origin;
      return response;
    } catch (error) {
      if (!unreachable(error)) throw error;
      last = error;
    }
  }
  throw new Error(
    `The API did not answer on any of ${origins.join(", ")}: ${
      (last as Error)?.message ?? "no reason given"
    }`,
    { cause: last },
  );
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

  const heads = await headers();
  const host = heads.get("host") ?? heads.get("x-forwarded-host");
  // The one that worked last time first, then the rest. After the first
  // request of a worker's life this list is one entry long.
  const origins = reachable
    ? [reachable, ...candidateOrigins(host).filter((one) => one !== reachable)]
    : candidateOrigins(host);

  const response = await request(origins, `/api/v1${path}`, {
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
