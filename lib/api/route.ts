import "server-only";
import type { PoolClient } from "pg";
import { identifyRequest, type ApiKeyIdentity } from "./auth";
import { apiError } from "./errors";
import {
  claimRate,
  rateHeaders,
  retryAfterSeconds,
  type RateBucket,
} from "./limit";
import { asOwner } from "./owner";

export type ApiContext = {
  request: Request;
  identity: ApiKeyIdentity;
  db: <T>(run: (client: PoolClient) => Promise<T>) => Promise<T>;
};

export class ApiFailure extends Error {
  constructor(
    readonly code: Parameters<typeof apiError>[0],
    readonly detail: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(detail);
  }
}

type PostgresError = { code?: string; message?: string; hint?: string };

/**
 * The database is where the rules live, so its refusals are answers, not
 * failures. Only the codes raised deliberately carry their message outward;
 * anything else stays `internal`, because an unplanned error message is a
 * description of the schema.
 */
function fromDatabase(error: unknown, headers: Record<string, string>) {
  const { code, message, hint } = (error ?? {}) as PostgresError;
  const said = (message ?? "").replace(/^[a-z_]+: /, "");
  if (code === "23505")
    return apiError("conflict", "That already exists.", undefined, headers);
  if (code === "22023" || code === "23514" || code === "23502")
    return apiError(
      "invalid_request",
      code === "22023" ? said : "That value is not allowed here.",
      undefined,
      headers,
    );
  if (code === "53400")
    return apiError(
      "rate_limited",
      "The account's own limit for this action is full.",
      { retry_after: Number(hint) || 60 },
      headers,
    );
  if (code === "42501")
    return apiError(
      "unauthorized",
      "The key's owner may not do that.",
      undefined,
      headers,
    );
  if (code === "P0002")
    return apiError("not_found", said || "Not found.", undefined, headers);
  return null;
}

export function apiRoute(options: {
  scope?: string;
  bucket: RateBucket;
  status?: number;
  handle: (context: ApiContext) => Promise<unknown>;
}) {
  return async function handler(request: Request) {
    const identity = await identifyRequest(request);
    if (!identity)
      return apiError(
        "invalid_key",
        "This key is unknown, revoked or expired.",
      );

    if (options.scope && !identity.scopes.includes(options.scope))
      return apiError(
        "insufficient_scope",
        `This key does not hold ${options.scope}.`,
        { scope: options.scope },
      );

    let verdict;
    try {
      verdict = await claimRate(identity.keyId, options.bucket);
    } catch {
      return apiError("internal", "The request could not be completed.");
    }

    const headers = rateHeaders(verdict);
    if (!verdict.allowed)
      return apiError(
        "rate_limited",
        "This key has used its allowance for now.",
        { retry_after: retryAfterSeconds(verdict) },
        headers,
      );

    try {
      const body = await options.handle({
        request,
        identity,
        db: (run) => asOwner(identity.profileId, run),
      });
      return Response.json(body, { status: options.status ?? 200, headers });
    } catch (error) {
      if (error instanceof ApiFailure)
        return apiError(error.code, error.detail, error.extra, headers);
      const translated = fromDatabase(error, headers);
      if (translated) return translated;
      return apiError(
        "internal",
        "The request could not be completed.",
        undefined,
        headers,
      );
    }
  };
}
