import { ApiError } from "@/lib/api-client";

/**
 * Finding our own API from inside our own process.
 *
 * Both the proxy and the server components render by asking our own HTTP API,
 * which means both need an absolute origin that reaches this process. Neither
 * can use the address the visitor typed: that one belongs to whatever sits in
 * front terminating TLS.
 *
 * Three deploys were lost learning that. The first built the origin from the
 * request host and assumed https for anything that was not localhost, which
 * opened a TLS handshake against Square Cloud's cleartext listener:
 * ERR_SSL_PACKET_LENGTH_TOO_LONG on every render. The second assumed the
 * loopback, and the process binds to its hostname rather than to every
 * interface, so nothing was listening: ECONNREFUSED on every render. The third
 * fixed the server components and left the proxy fetching
 * `request.nextUrl.origin`, which behind the edge is `https://uloggd.com`, so
 * the TLS error came back on every signed-in request while the pages were fine.
 *
 * Hence one module, imported by both, holding three rules:
 *
 *   - cleartext only, because the listener inside the container is cleartext
 *     everywhere this runs and whatever terminates TLS does it in front;
 *   - redirects are never followed, which is what makes the first rule
 *     enforceable rather than hopeful: a 3xx means that address belongs to a
 *     proxy and not to us, so it counts as a wrong address;
 *   - addresses are tried rather than chosen, most direct first, and the one
 *     that answers is remembered for the life of the worker.
 *
 * The proxy runs on the Node runtime as of Next 16, so `process.env` is the
 * same here as it is in a server component and this can be one implementation
 * rather than two that drift.
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
 * Always http. See the rules above: the scheme is not a decision this code gets
 * to make, and it is not the deployment's to tell us either.
 */
export function candidateOrigins(host: string | null) {
  const port = servingPort(host);
  const found: string[] = [];

  // The way out of guessing entirely. Nothing needs to set it, but a deployment
  // that knows its own internal address can say so and skip the search.
  const pinned = process.env.ULOGGD_INTERNAL_ORIGIN?.trim().replace(/\/$/, "");
  if (pinned) found.push(pinned);

  // What the server bound to, which is what Next prints on boot. On Square
  // Cloud that is the hostname rather than a wildcard, which is the whole
  // reason the loopback was refused.
  const bound = process.env.HOSTNAME?.trim();
  if (bound && bound !== "0.0.0.0" && bound !== "::")
    found.push(`http://${bound}:${port}`);

  // Both loopbacks, by address. `localhost` is left out on purpose: it resolves
  // to whichever family the resolver prefers, and picking the wrong one is how
  // a server that is plainly listening still refuses the connection.
  found.push(`http://127.0.0.1:${port}`);
  found.push(`http://[::1]:${port}`);

  // The address the request itself arrived on, downgraded to cleartext. Last,
  // because behind a proxy it is the public name and reaching ourselves through
  // the edge is a hop we do not need, but it is the one address we know routes.
  if (host) found.push(`http://${host}`);

  return [...new Set(found)];
}

/** The candidate that answered, remembered so the cost is paid once. */
let reachable: string | null = null;

/** The candidates, with whichever one worked last time moved to the front. */
export function orderedOrigins(host: string | null) {
  const found = candidateOrigins(host);
  return reachable
    ? [reachable, ...found.filter((one) => one !== reachable)]
    : found;
}

/** Whether a failure was the connection itself rather than an answer. */
function unreachable(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return (
    error instanceof TypeError ||
    cause?.code === "ECONNREFUSED" ||
    cause?.code === "ECONNRESET" ||
    cause?.code === "ENOTFOUND" ||
    cause?.code === "EAI_AGAIN" ||
    cause?.code === "EHOSTUNREACH" ||
    cause?.code === "ERR_SSL_PACKET_LENGTH_TOO_LONG" ||
    cause?.code === "ERR_SSL_WRONG_VERSION_NUMBER"
  );
}

/** The shortest true thing we can say about why an address did not work. */
function why(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code ?? (error as Error)?.message ?? "no reason given";
}

/**
 * Sends the request to the first address that answers as our own API.
 *
 * An HTTP error is an answer: a 404 from a route means the address is right and
 * the path is not, so it comes straight back. A redirect is not an answer, it is
 * a proxy in the way, and following it is what put TLS in front of a cleartext
 * port twice, so it moves on instead. Every rejection is logged with its reason,
 * because two outages were spent inferring this from silence.
 */
export async function reachApi(
  origins: string[],
  path: string,
  init: RequestInit & { next?: { revalidate: number } },
) {
  const refused: string[] = [];

  for (const origin of origins) {
    try {
      const response = await fetch(`${origin}${path}`, {
        ...init,
        // Never follow a redirect out of cleartext. This is the rule that makes
        // "http only" true rather than merely intended.
        redirect: "manual",
      });
      if (response.status >= 300 && response.status < 400) {
        const to = response.headers.get("location") ?? "somewhere else";
        refused.push(`${origin} redirected to ${to}`);
        continue;
      }
      reachable = origin;
      return response;
    } catch (error) {
      if (!unreachable(error)) throw error;
      refused.push(`${origin} (${why(error)})`);
    }
  }

  const detail = refused.join(", ");
  console.error(`[api-origin] no address answered for ${path}: ${detail}`);
  throw new Error(`The API did not answer at any address: ${detail}`);
}

export type Body = Record<string, unknown> | undefined;

/** One API call, against an address list rather than a single address. */
export async function sendApi<T>(
  origins: string[],
  method: string,
  path: string,
  cookie: string,
  body?: Body,
  init?: { cache?: RequestCache; revalidate?: number },
): Promise<T> {
  const response = await reachApi(origins, `/api/v1${path}`, {
    method,
    headers: {
      // Everything the route needs to know whose request this is. The routes
      // accept a session cookie or a key; the site holds a session, and this
      // hands over the same one the page was rendered for.
      ...(cookie ? { cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    // A page's own data is per-request by definition: it is answered for the
    // cookie above, and caching it would serve one account's answer to the next.
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

/**
 * A reader bound to an address list, for callers that hold no request context.
 *
 * The proxy has the request but not `headers()`, and a cached card has neither,
 * because `unstable_cache` forbids the dynamic APIs inside it. Both resolve the
 * list themselves and hand it in, and both still go through the retry above
 * rather than taking one address and hoping.
 */
export function apiReader(origins: string[], cookie = "") {
  return {
    get: <T>(
      path: string,
      init?: { cache?: RequestCache; revalidate?: number },
    ) => sendApi<T>(origins, "GET", path, cookie, undefined, init),
  };
}
