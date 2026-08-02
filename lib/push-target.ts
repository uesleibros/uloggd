import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushKind } from "@/lib/push-copy";

/**
 * Where a push notification should land.
 *
 * The notification centre already resolves this in the browser, but it does so
 * for a page of rows at once and with the reader's own permissions. Push has
 * one row and service credentials, so the logic is separate rather than shared:
 * trying to reuse the batched version would mean carrying its shape into a
 * place that has no use for it.
 *
 * `notifications` stores `target_id`, which is an internal id, while every
 * route is addressed by `public_id`. Resolving that is the whole job here.
 *
 * Every path falls back to the feed rather than throwing. A notification that
 * opens the wrong page is a nuisance; one that fails to open is a lost message.
 */
type Notification = {
  kind: PushKind;
  actor_id: string | null;
  target_id: string | null;
  /** Who the notification is for; some destinations are the recipient's own. */
  recipient_id: string | null;
};

/** Which route serves comments on each kind of post. */
const POST_ROUTE: Record<string, string> = {
  review: "review",
  list: "lists",
  screenshot: "shot",
  diary: "entry",
};

async function publicId(
  admin: SupabaseClient,
  table: string,
  id: string,
): Promise<string | null> {
  const { data } = await admin
    .from(table)
    .select("public_id")
    .eq("id", id)
    .maybeSingle();
  return (data as { public_id?: string } | null)?.public_id ?? null;
}

export async function resolvePushTarget(
  admin: SupabaseClient,
  notification: Notification,
  lang: string,
): Promise<string> {
  const feed = `/${lang}`;
  const actorProfile = async () => {
    if (!notification.actor_id) return feed;
    const { data } = await admin
      .from("profiles")
      .select("username")
      .eq("id", notification.actor_id)
      .maybeSingle();
    return data?.username ? `/${lang}/u/${data.username}` : feed;
  };

  const target = notification.target_id;
  switch (notification.kind) {
    case "follow":
      return actorProfile();

    case "mineral_transfer": {
      // Straight to what changed: the recipient's own wallet, where the
      // transfer sits at the top of the ledger.
      const { data: recipient } = await admin
        .from("profiles")
        .select("username")
        .eq("id", notification.recipient_id)
        .maybeSingle();
      return recipient?.username
        ? `/${lang}/wallet/${recipient.username}`
        : feed;
    }

    case "review_like": {
      if (!target) return feed;
      const id = await publicId(admin, "reviews", target);
      return id ? `/${lang}/review/${id}` : feed;
    }
    case "list_like": {
      if (!target) return feed;
      const id = await publicId(admin, "game_lists", target);
      return id ? `/${lang}/lists/${id}` : feed;
    }
    case "screenshot_like": {
      if (!target) return feed;
      const id = await publicId(admin, "screenshots", target);
      return id ? `/${lang}/shot/${id}` : feed;
    }
    case "journal_like": {
      if (!target) return feed;
      const id = await publicId(admin, "diary_entries", target);
      return id ? `/${lang}/entry/${id}` : feed;
    }

    case "profile_comment":
    case "profile_comment_like": {
      if (!target) return feed;
      // The wall it was written on, which is not always the recipient's: a like
      // on your comment can arrive from someone else's profile.
      const { data: comment } = await admin
        .from("profile_comments")
        .select("public_id,profile_id")
        .eq("id", target)
        .maybeSingle();
      if (!comment?.public_id) return feed;
      const { data: owner } = await admin
        .from("profiles")
        .select("username")
        .eq("id", comment.profile_id)
        .maybeSingle();
      return owner?.username
        ? `/${lang}/u/${owner.username}#comment-${comment.public_id}`
        : feed;
    }

    case "screenshot_comment":
    case "screenshot_comment_like":
    case "post_comment":
    case "post_comment_like": {
      if (!target) return feed;
      const { data: comment } = await admin
        .from("content_comments")
        .select("public_id,content_type,content_id")
        .eq("id", target)
        .maybeSingle();
      if (!comment?.public_id) return feed;
      const segment = POST_ROUTE[comment.content_type as string];
      if (!segment) return feed;
      const table =
        comment.content_type === "review"
          ? "reviews"
          : comment.content_type === "list"
            ? "game_lists"
            : comment.content_type === "screenshot"
              ? "screenshots"
              : "diary_entries";
      const postId = await publicId(admin, table, comment.content_id);
      return postId
        ? `/${lang}/${segment}/${postId}#comment-${comment.public_id}`
        : feed;
    }

    case "moderation_comment_removed":
      // Deliberately the feed: the removed comment has no page left to open,
      // and pointing at where it used to be would be worse than not pointing.
      return feed;
  }
}
