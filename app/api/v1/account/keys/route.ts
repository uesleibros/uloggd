import { jsonBody, optionalText } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHAPE = `id, name, prefix, scopes, last_used_at, expires_at, revoked_at,
  created_at`;

/**
 * The keys themselves, and only ever from a session.
 *
 * A key that could mint another key is a key that grants itself every scope
 * the owner has, which is the whole point of a scope undone in one call. There
 * is no scope that makes this safe, so there is none: signing in is the only
 * way in.
 */
export const GET = apiRoute({
  sessionOnly: true,
  bucket: "read",
  handle: async ({ identity, db }) => {
    const keys = await db(async (client) => {
      const { rows } = await client.query(
        `select ${SHAPE} from public.api_keys
          where profile_id = $1
          order by created_at desc`,
        [identity.profileId],
      );
      return rows;
    });
    return { data: keys };
  },
});

export const POST = apiRoute({
  sessionOnly: true,
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const name = optionalText(body, "name", 60)?.trim();
    if (!name) throw new ApiFailure("invalid_request", "name is required.");

    const scopes = body.scopes;
    if (
      !Array.isArray(scopes) ||
      scopes.some((one) => typeof one !== "string")
    )
      throw new ApiFailure("invalid_request", "scopes must be a list of names.");

    const days = body.expires_in_days;
    if (days !== undefined && days !== null && typeof days !== "number")
      throw new ApiFailure(
        "invalid_request",
        "expires_in_days must be a number of days, or null to never expire.",
      );

    // The token is returned once, by the function that generated it, and is
    // never readable again: only its hash is stored, in a column no role that
    // talks to this API is granted.
    const made = await db(async (client) => {
      const { rows } = await client.query(
        `select id, token, prefix, created_at
           from public.create_api_key(
             key_name => $1, key_scopes => $2::text[],
             key_expires => case when $3::numeric is null then null
                                 else now() + ($3 || ' days')::interval end)`,
        [name, scopes, days ?? null],
      );
      return rows[0] ?? null;
    });

    if (!made) throw new ApiFailure("internal", "The key was not created.");
    return { data: made };
  },
});
