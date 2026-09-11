import "server-only";
import { cookies, headers } from "next/headers";
import { orderedOrigins, sendApi, type Body } from "@/lib/api-origin";

/**
 * The website's way in to its own API, from a server component.
 *
 * The browser has it easy: a relative path, and `fetch` attaches the session
 * cookie itself. A server component has neither. It needs an absolute origin,
 * because there is no page to be relative to, and it has to carry the cookie
 * across by hand, because a request the server makes is nobody's browser.
 *
 * Finding that origin is `lib/api-origin.ts`, shared with the proxy, which
 * explains at length why it is found rather than chosen. This file is the half
 * that only a server component can do: read the cookie jar and the request
 * headers.
 */

export { apiReader } from "@/lib/api-origin";

/**
 * The addresses to try, best first.
 *
 * This reads the request, so it has to be called from the request and never
 * from inside `unstable_cache`, which forbids the dynamic APIs. Callers that
 * cache resolve the list out here and hand it to `apiReader`.
 */
export async function serverApiOrigins() {
  const heads = await headers();
  return orderedOrigins(heads.get("host") ?? heads.get("x-forwarded-host"));
}

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

  return sendApi<T>(await serverApiOrigins(), method, path, cookie, body, init);
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
