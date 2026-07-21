"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The pieces every comment thread on the platform shares.
 *
 * Profile conversations and comments on lists/reviews are different features
 * with different permissions, but a comment looks like a comment: same avatar,
 * same header, same like affordance, same relative time. Keeping those here
 * means the two cannot drift apart visually, which is exactly what happened
 * when the second one was written from scratch.
 */

export function formatCommentTime(date: string, lang: "pt-BR" | "en") {
  const seconds = Math.max(
    1,
    Math.floor((Date.now() - new Date(date).getTime()) / 1000),
  );
  const formatter = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (seconds < 60) return formatter.format(-seconds, "second");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return formatter.format(-days, "day");
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(
    new Date(date),
  );
}

export function CommentAvatar({
  lang,
  username,
  name,
  avatarUrl,
}: {
  lang: "pt-BR" | "en";
  username: string;
  name: string;
  avatarUrl: string | null;
}) {
  return (
    <Link
      className="profile-comment-avatar"
      href={`/${lang}/u/${username}`}
      aria-label={name}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </Link>
  );
}

export function CommentHeader({
  lang,
  username,
  name,
  createdAt,
  edited = false,
  badge,
}: {
  lang: "pt-BR" | "en";
  username: string;
  name: string;
  createdAt: string;
  edited?: boolean;
  badge?: ReactNode;
}) {
  return (
    <header>
      <Link href={`/${lang}/u/${username}`}>
        {name}
        {badge}
      </Link>
      <span>
        <b aria-hidden>·</b>
        <time dateTime={createdAt}>{formatCommentTime(createdAt, lang)}</time>
        {edited && <i>{lang === "pt-BR" ? "editado" : "edited"}</i>}
      </span>
    </header>
  );
}

/**
 * Interactive for anyone who may like, a plain count otherwise — including for
 * the author, who cannot like their own comment but should still see the total.
 */
export function CommentLike({
  lang,
  count,
  liked,
  canLike,
  pending = false,
  showEmpty = false,
  onToggle,
}: {
  lang: "pt-BR" | "en";
  count: number;
  liked: boolean;
  canLike: boolean;
  pending?: boolean;
  /** The author cannot like their own comment but still sees the affordance. */
  showEmpty?: boolean;
  onToggle: () => void;
}) {
  const pt = lang === "pt-BR";
  if (!canLike) {
    if (count <= 0 && !showEmpty) return null;
    return (
      <span
        className="profile-comment-like-static"
        aria-label={pt ? `${count} curtidas` : `${count} likes`}
      >
        <Heart size={13} />
        {count > 0 && <span>{count.toLocaleString(lang)}</span>}
      </span>
    );
  }
  return (
    <button
      className="profile-comment-like-action"
      type="button"
      aria-pressed={liked}
      data-liked={liked || undefined}
      disabled={pending}
      onClick={onToggle}
      aria-label={
        liked
          ? pt
            ? "Remover curtida"
            : "Remove like"
          : pt
            ? "Curtir comentário"
            : "Like comment"
      }
    >
      <Heart size={13} fill={liked ? "currentColor" : "none"} />
      {count > 0 && <span>{count.toLocaleString(lang)}</span>}
    </button>
  );
}

export function PendingComment({ lang }: { lang: "pt-BR" | "en" }) {
  return (
    <article
      className="profile-comment-pending"
      aria-label={
        lang === "pt-BR" ? "Publicando comentário" : "Posting comment"
      }
      aria-busy="true"
    >
      <span className="skeleton-block" />
      <div>
        <i className="skeleton-block" />
        <i className="skeleton-block" />
        <i className="skeleton-block" />
      </div>
    </article>
  );
}

/** Flat rows become a tree, keeping arrival order within each level. */
export function buildCommentTree<
  T extends { id: string; parent_id: string | null },
>(rows: T[]): Array<T & { replies: Array<T & { replies: unknown[] }> }> {
  type Node = T & { replies: Node[] };
  const nodes = new Map<string, Node>(
    rows.map((row) => [row.id, { ...row, replies: [] } as Node]),
  );
  const roots: Node[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parent_id ? nodes.get(row.parent_id) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}
