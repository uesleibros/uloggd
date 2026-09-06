import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: string;
  target_id: string | null;
  target_title: string | null;
  created_at: string;
  read_at: string | null;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  review_public_id: string | null;
  list_public_id: string | null;
  screenshot_public_id: string | null;
  entry_public_id: string | null;
  wall_public_id: string | null;
  wall_owner: string | null;
  wall_is_reply: boolean | null;
  post_comment_public_id: string | null;
  post_comment_is_reply: boolean | null;
  post_parent_kind: string | null;
  post_parent_public_id: string | null;
};

/**
 * Where a notification points, as one path.
 *
 * The browser used to work this out from eleven separate reads: the
 * notifications, then the rows they name, then the rows *those* name, because
 * a reply's address is its parent's address plus an anchor. All of it is a
 * join, and doing it here means the answer arrives resolved instead of the
 * page filling in over four round trips.
 *
 * The language prefix is left off. It belongs to whoever is reading, not to
 * the notification, and this API does not know which one they are in.
 */
function pathOf(row: Row) {
  const anchor = (route: string, publicId: string | null) =>
    publicId ? `${route}#comment-${publicId}` : route;

  switch (row.kind) {
    case "profile_comment":
    case "profile_comment_like":
      return row.wall_owner
        ? anchor(`u/${row.wall_owner}`, row.wall_public_id)
        : null;
    case "screenshot_comment":
    case "screenshot_comment_like":
      return row.post_parent_public_id
        ? anchor(
            `shot/${row.post_parent_public_id}`,
            row.post_comment_public_id,
          )
        : null;
    case "post_comment":
    case "post_comment_like": {
      const route =
        row.post_parent_kind === "review"
          ? "review"
          : row.post_parent_kind === "list"
            ? "lists"
            : row.post_parent_kind === "diary"
              ? "entry"
              : null;
      return route && row.post_parent_public_id
        ? anchor(
            `${route}/${row.post_parent_public_id}`,
            row.post_comment_public_id,
          )
        : null;
    }
    case "review_like":
      return row.review_public_id ? `review/${row.review_public_id}` : null;
    case "list_like":
      return row.list_public_id ? `lists/${row.list_public_id}` : null;
    case "screenshot_like":
      return row.screenshot_public_id
        ? `shot/${row.screenshot_public_id}`
        : null;
    case "journal_like":
      return row.entry_public_id ? `entry/${row.entry_public_id}` : null;
    default:
      return null;
  }
}

// Row level security applies to every join here, so a target the reader may no
// longer see comes back as nulls and the notification keeps its words without
// a link, rather than pointing at a page that would refuse them.
const QUERY = `
  select notification.id, notification.kind, notification.target_id,
         notification.target_title, notification.created_at,
         notification.read_at,
         actor.username as actor_username,
         actor.display_name as actor_display_name,
         actor.avatar_url as actor_avatar_url,
         liked_review.public_id as review_public_id,
         liked_list.public_id as list_public_id,
         liked_shot.public_id as screenshot_public_id,
         liked_entry.public_id as entry_public_id,
         wall.public_id as wall_public_id,
         wall_owner.username as wall_owner,
         (wall.parent_id is not null) as wall_is_reply,
         post_comment.public_id as post_comment_public_id,
         (post_comment.parent_id is not null) as post_comment_is_reply,
         post_comment.content_type as post_parent_kind,
         coalesce(parent_review.public_id, parent_list.public_id,
                  parent_entry.public_id, parent_shot.public_id)
           as post_parent_public_id
    from public.notifications notification
    left join public.profiles actor on actor.id = notification.actor_id
    left join public.reviews liked_review
      on liked_review.id = notification.target_id
     and notification.kind = 'review_like'
    left join public.game_lists liked_list
      on liked_list.id = notification.target_id
     and notification.kind = 'list_like'
    left join public.screenshots liked_shot
      on liked_shot.id = notification.target_id
     and notification.kind = 'screenshot_like'
    left join public.diary_entries liked_entry
      on liked_entry.id = notification.target_id
     and notification.kind = 'journal_like'
    left join public.profile_comments wall
      on wall.id = notification.target_id
    left join public.profiles wall_owner on wall_owner.id = wall.profile_id
    left join public.content_comments post_comment
      on post_comment.id = notification.target_id
    left join public.reviews parent_review
      on parent_review.id = post_comment.content_id
     and post_comment.content_type = 'review'
    left join public.game_lists parent_list
      on parent_list.id = post_comment.content_id
     and post_comment.content_type = 'list'
    left join public.diary_entries parent_entry
      on parent_entry.id = post_comment.content_id
     and post_comment.content_type = 'diary'
    left join public.screenshots parent_shot
      on parent_shot.id = post_comment.content_id
     and post_comment.content_type = 'screenshot'
   where notification.recipient_id = $1
   order by notification.created_at desc
   limit $2`;

const PREFERENCES = `follows_enabled, review_likes_enabled,
  list_likes_enabled, comments_enabled, screenshots_enabled,
  journal_likes_enabled`;

export const GET = apiRoute({
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const asked = Number(new URL(request.url).searchParams.get("limit") ?? 40);
    const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), 100) : 40;

    return await db(async (client) => {
      const [{ rows }, preferences] = await Promise.all([
        client.query<Row>(QUERY, [identity.profileId, limit]),
        client.query(
          `select ${PREFERENCES} from public.notification_preferences
            where profile_id = $1`,
          [identity.profileId],
        ),
      ]);

      return {
        data: rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          created_at: row.created_at,
          read_at: row.read_at,
          target_title: row.target_title,
          actor: row.actor_username
            ? {
                username: row.actor_username,
                display_name: row.actor_display_name,
                avatar_url: row.actor_avatar_url,
              }
            : null,
          path: pathOf(row),
          is_reply: Boolean(row.wall_is_reply || row.post_comment_is_reply),
        })),
        preferences: preferences.rows[0] ?? null,
      };
    });
  },
});

export const PATCH = apiRoute({
  scope: "profile.write",
  bucket: "write",
  handle: async ({ db }) => {
    await db((client) =>
      client.query("select public.mark_all_notifications_read()"),
    );
    return { data: { read_all: true } };
  },
});
