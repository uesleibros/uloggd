export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Body = Record<string, unknown> | FormData | undefined;

/**
 * The website's way in to its own API.
 *
 * The browser holds a session cookie rather than a key, and the routes accept
 * both, so nothing has to be attached here: `fetch` sends same-origin cookies
 * on its own. What this adds is the half every caller would otherwise repeat:
 * turning an error envelope back into something `catch` can read.
 */
async function call<T>(
  method: string,
  path: string,
  body?: Body,
  signal?: AbortSignal,
): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await fetch(`/api/v1${path}`, {
    method,
    signal,
    headers:
      body && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
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
 * Reads in flight, so two sections asking the same question ask it once.
 *
 * Sections fetch what they need rather than being handed it, which is what lets
 * each one fill in on its own. The cost is that neighbours often want the same
 * answer: the home page's two discovery shelves are both `/discovery/history`,
 * and the rail counter and the empty-library note are both the library summary.
 * Sharing the promise while it is open turns that back into one request without
 * anything having to coordinate.
 *
 * Only reads, and only while open: the entry is dropped the moment it settles,
 * so this never serves a stale answer. It is a request in progress, not a cache.
 */
const reading = new Map<string, Promise<unknown>>();

function share<T>(path: string, signal?: AbortSignal): Promise<T> {
  // A caller that can abort gets its own request. It would otherwise cancel the
  // shared one out from under everybody else waiting on it.
  if (signal) return call<T>("GET", path, undefined, signal);

  const open = reading.get(path);
  if (open) return open as Promise<T>;

  const started = call<T>("GET", path).finally(() => {
    if (reading.get(path) === started) reading.delete(path);
  });
  reading.set(path, started);
  return started;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => share<T>(path, signal),
  post: <T>(path: string, body?: Body) => call<T>("POST", path, body),
  patch: <T>(path: string, body?: Body) => call<T>("PATCH", path, body),
  put: <T>(path: string, body?: Body) => call<T>("PUT", path, body),
  delete: <T>(path: string) => call<T>("DELETE", path),
};

/**
 * The `{ data, error }` shape, for callers built around it.
 *
 * An optimistic control reverts on failure and adopts the answer on success,
 * so a thrown error partway through leaves it holding a state nobody chose.
 * These want the reason as a value, the way the database client handed it to
 * them before.
 */
export async function settle<T>(
  call: Promise<{ data: T }>,
): Promise<{ data: T | null; error: unknown }> {
  try {
    return { data: (await call).data, error: null };
  } catch (reason) {
    return { data: null, error: reason };
  }
}
