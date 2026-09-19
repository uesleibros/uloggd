import {
  jsonBody,
  optionalUuid,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import {
  COMMENTABLE,
  resolveTarget,
  type Commentable,
} from "@/lib/api/targets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What a conversation needs, tombstones included.
 *
 * Deleted comments used to be filtered out here. The thread is a tree, so a
 * removed comment that had replies has to stay in the list or its replies come
 * back as roots, and the count under the thread counted rows rather than
 * surviving ones. The body is the part that is actually gone: it is blanked
 * here rather than sent and hidden, because a deleted comment's text should not
 * leave the database at all.
 */
const SHAPE = `id, public_id, parent_id, author_id,
  case when deleted_at is null then body else '' end as body,
  deleted_at, created_at,
  updated_at, like_count, liked_by_viewer,
  username, display_name, avatar_url, verified, account_type`;

function target(url: URL) {
  const on = url.searchParams.get("on") ?? "";
  if (!(COMMENTABLE as readonly string[]).includes(on))
    throw new ApiFailure(
      "invalid_request",
      `on must be one of ${COMMENTABLE.join(", ")}.`,
    );
  const id = url.searchParams.get("id");
  if (!id) throw new ApiFailure("invalid_request", "id is required.");
  return { on: on as Commentable, id };
}

/**
 * A conversation, whatever it hangs from.
 *
 * The database keeps replies to a profile and replies to a post in two tables
 * with two sets of functions, which is an accident of the order they were
 * built in rather than a difference anybody reading them cares about. One
 * resource with an `on` covers both, and the split stays where it belongs.
 */
// Public, like what the comments hang from. The database decides who may read
// which thread: `get_content_comments` checks `content_comments_visible`, and
// profile comments have their own read policy for `anon`. This route asking
// for an identity first was the only thing standing between a visitor and the
// replies under a public review, and the review page drew them as a thread
// that never finished loading.
export const GET = apiRoute({
  public: true,
  scope: "comments.read",
  bucket: "read",
  handle: async ({ request, db }) => {
    const { on, id } = target(new URL(request.url));

    return await db(async (client) => {
      const targetId = await resolveTarget(client, on, id);

      if (on === "profile") {
        const { rows } = await client.query(
          `select comment.id, comment.public_id, comment.parent_id,
                  comment.author_id,
                  case when comment.deleted_at is null then comment.body
                       else '' end as body,
                  comment.deleted_at, comment.created_at,
                  comment.updated_at,
                  count(likes.profile_id)::int as like_count,
                  coalesce(bool_or(likes.profile_id = auth.uid()), false)
                    as liked_by_viewer,
                  author.username, author.display_name, author.avatar_url,
                  author.verified, author.account_type
             from public.profile_comments comment
             join public.profiles author on author.id = comment.author_id
             left join public.content_likes likes
               on likes.content_type = 'profile_comment'
              and likes.content_id = comment.id
            where comment.profile_id = $1
            group by comment.id, author.username, author.display_name,
                     author.avatar_url, author.verified, author.account_type
            order by comment.created_at`,
          [targetId],
        );
        return { data: rows };
      }

      const { rows } = await client.query(
        `select ${SHAPE} from public.get_content_comments(
           target_type => $1, target_id => $2)`,
        [on, targetId],
      );
      return { data: rows };
    });
  },
});

export const POST = apiRoute({
  scope: "comments.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const on = optionalOneOf(body, "on", COMMENTABLE);
    if (!on) throw new ApiFailure("invalid_request", "on is required.");
    const id = optionalText(body, "id", 64);
    if (!id) throw new ApiFailure("invalid_request", "id is required.");
    const said = optionalText(body, "body", 2000);
    if (!said) throw new ApiFailure("invalid_request", "body is required.");
    const parent = optionalUuid(body, "parent_id");

    return await db(async (client) => {
      const targetId = await resolveTarget(client, on, id);
      const { rows } =
        on === "profile"
          ? await client.query(
              `select id, public_id, parent_id, author_id, body, created_at
                 from public.create_profile_comment(
                   target_profile => $1, comment_body => $2,
                   parent_comment => $3)`,
              [targetId, said, parent],
            )
          : await client.query(
              `select id, public_id, parent_id, author_id, body, created_at
                 from public.create_content_comment(
                   target_type => $1, target_id => $2, comment_body => $3,
                   parent_comment => $4)`,
              [on, targetId, said, parent],
            );
      return { data: rows[0] ?? null };
    });
  },
});
