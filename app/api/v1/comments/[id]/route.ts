import { jsonBody, optionalText } from "@/lib/api/body";
import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import type { PoolClient } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which of the two tables this id belongs to.
 *
 * The caller does not say, and should not have to: an id is an id. Both are
 * uuids from the same generator, so one of the two lookups answers and the
 * other does not, and a collision between them is not a thing that happens.
 */
async function locate(client: PoolClient, id: string) {
  const { rows } = await client.query<{ kind: string }>(
    `select 'content' as kind from public.content_comments
      where id = $1 and deleted_at is null
      union all
     select 'profile' from public.profile_comments
      where id = $1 and deleted_at is null
      limit 1`,
    [id],
  );
  if (!rows[0]) throw new ApiFailure("not_found", "No comment with that id.");
  return rows[0].kind;
}

export const PATCH = apiRoute({
  scope: "comments.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "comment id", UUID);
    const body = await jsonBody(request);
    const said = optionalText(body, "body", 2000);
    if (!said) throw new ApiFailure("invalid_request", "body is required.");

    return await db(async (client) => {
      const kind = await locate(client, id);
      const { rows } = await client.query(
        kind === "profile"
          ? `select id, public_id, parent_id, author_id, body, updated_at
               from public.update_profile_comment(
                 target_comment => $1, comment_body => $2)`
          : `select id, public_id, parent_id, author_id, body, updated_at
               from public.update_content_comment(
                 target_comment => $1, comment_body => $2)`,
        [id, said],
      );
      return { data: rows[0] ?? null };
    });
  },
});

export const DELETE = apiRoute({
  scope: "comments.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "comment id", UUID);

    return await db(async (client) => {
      const kind = await locate(client, id);
      const { rows } = await client.query<{ done: boolean }>(
        kind === "profile"
          ? "select public.delete_profile_comment(target_comment => $1) as done"
          : "select public.delete_content_comment(target_comment => $1) as done",
        [id],
      );
      if (rows[0]?.done === false)
        throw new ApiFailure("not_found", "No comment of yours with that id.");
      return { data: { id, deleted: true } };
    });
  },
});
