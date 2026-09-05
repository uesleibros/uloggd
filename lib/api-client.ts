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
 * on its own. What this adds is the half every caller would otherwise repeat —
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
    headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
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

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    call<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: Body) => call<T>("POST", path, body),
  patch: <T>(path: string, body?: Body) => call<T>("PATCH", path, body),
  put: <T>(path: string, body?: Body) => call<T>("PUT", path, body),
  delete: <T>(path: string) => call<T>("DELETE", path),
};
