import "server-only";
import type { PoolClient } from "pg";
import { ApiFailure } from "./route";

/**
 * What a comment or a like can be attached to.
 *
 * The database keeps these as a pair of columns rather than a foreign key per
 * kind, which is why the same five names appear in `content_likes`,
 * `content_comments` and every visibility function. Naming them once here
 * keeps a route from inventing a sixth.
 */
export const COMMENTABLE = [
  "review",
  "list",
  "screenshot",
  "diary",
  "profile",
] as const;

export const LIKEABLE = [
  "review",
  "list",
  "screenshot",
  "diary",
  "profile_comment",
  "content_comment",
] as const;

export type Commentable = (typeof COMMENTABLE)[number];

/**
 * The id a target is addressed by.
 *
 * Content carries an id this API already hands out. A profile does not: the
 * only name it has here is its username, so that is what `on=profile` takes,
 * and it is resolved to an id before anything else happens.
 */
export async function resolveTarget(
  client: PoolClient,
  on: Commentable,
  id: string,
) {
  if (on !== "profile") {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new ApiFailure("invalid_request", "id must be an id.");
    return id;
  }

  const { rows } = await client.query<{ id: string }>(
    "select id from public.profiles where lower(username) = lower($1)",
    [id],
  );
  if (!rows[0]) throw new ApiFailure("not_found", "No account with that name.");
  return rows[0].id;
}
