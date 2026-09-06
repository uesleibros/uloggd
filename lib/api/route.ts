import "server-only";
import type { PoolClient } from "pg";
import { holdsScope, identifyRequest, type ApiIdentity } from "./auth";
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
  identity: ApiIdentity;
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

/** Refusals raised deliberately, whose wording is part of the answer. */
const SPOKEN = new Set([
  "comments unavailable",
  "interaction unavailable",
  "not the owner",
  "account is private",
]);

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
      "forbidden",
      // A block and a closed comment section are the target's rules, not a
      // secret: the website has always said which one it hit, and a 403 that
      // will not say why is a worse answer than one that will. Anything else
      // raised at this code was not planned for, and an unplanned message is
      // a description of the schema.
      SPOKEN.has(said) ? said : "The rules refuse this.",
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
  /**
   * Refuses a key outright, whatever it holds.
   *
   * For the handful of things that are the account rather than its contents:
   * the sessions it is signed in on, the providers it signs in with, its name,
   * everything it has ever written, and the keys themselves. A key that could
   * mint another key is a key that grants itself every scope, and a key that
   * could ask for the export is one leak away from the whole account. None of
   * it is anything an integration was given a key to do.
   */
  sessionOnly?: boolean;
  handle: (context: ApiContext) => Promise<unknown>;
}) {
  return async function handler(request: Request) {
    const identity = await identifyRequest(request);
    if (!identity)
      return request.headers.get("authorization")
        ? apiError("invalid_key", "This key is unknown, revoked or expired.")
        : apiError("unauthorized", "This request carries no identity.");

    if (options.sessionOnly && identity.kind !== "session")
      return apiError(
        "forbidden",
        "This is only reachable while signed in, never with a key.",
      );

    if (options.scope && !holdsScope(identity, options.scope))
      return apiError(
        "insufficient_scope",
        `This key does not hold ${options.scope}.`,
        { scope: options.scope },
      );

    // A session spends the account's own allowances, which the database
    // already counts on every write it guards. Charging it a second time
    // against a key's ceiling would only cap the website at the rate we sell
    // to integrations, and there is no key to name in the headers anyway.
    let headers: Record<string, string> = {};
    if (identity.kind === "key") {
      let verdict;
      try {
        verdict = await claimRate(identity.keyId, options.bucket);
      } catch {
        return apiError("internal", "The request could not be completed.");
      }

      headers = rateHeaders(verdict);
      if (!verdict.allowed)
        return apiError(
          "rate_limited",
          "This key has used its allowance for now.",
          { retry_after: retryAfterSeconds(verdict) },
          headers,
        );
    }

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
