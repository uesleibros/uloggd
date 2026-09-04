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

export function apiRoute(options: {
  scope?: string;
  bucket: RateBucket;
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
      return Response.json(body, { headers });
    } catch (error) {
      if (error instanceof ApiFailure)
        return apiError(error.code, error.detail, error.extra, headers);
      return apiError(
        "internal",
        "The request could not be completed.",
        undefined,
        headers,
      );
    }
  };
}
