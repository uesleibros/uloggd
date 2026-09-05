import "server-only";
import type { PoolClient } from "pg";
import { optionalOneOf } from "./body";
import { COMMENT_SCOPES } from "./enums";

export type CommentableKind = "review" | "list" | "screenshot" | "diary";

/**
 * Who may reply, saved with whatever else the caller sent.
 *
 * It is a column on each of the four tables rather than a resource of its own,
 * so it belongs in each PATCH rather than behind an endpoint that would only
 * ever set one field. The write goes through the definer function because that
 * is where the ownership check lives.
 */
export async function applyCommentsScope(
  client: PoolClient,
  kind: CommentableKind,
  id: string,
  body: Record<string, unknown>,
) {
  const next = optionalOneOf(body, "comments_scope", COMMENT_SCOPES);
  if (next === null) return;
  await client.query(
    `select public.set_content_comments_scope(
       target_type => $1, target_id => $2, next_scope => $3)`,
    [kind, id, next],
  );
}
