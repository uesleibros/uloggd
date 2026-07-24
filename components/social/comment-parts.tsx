"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { RelativeTime } from "@/components/relative-time";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { MentionText } from "./mention-text";

/**
 * The pieces every comment thread on the platform shares.
 *
 * Profile conversations and comments on lists/reviews are different features
 * with different permissions, but a comment looks like a comment: same avatar,
 * same header, same like affordance, same relative time. Keeping those here
 * means the two cannot drift apart visually, which is exactly what happened
 * when the second one was written from scratch.
 */

/**
 * Every one of these rules has a reason the person can act on, so saying only
 * "could not complete this action" turns a closed setting into what looks like
 * a broken button.
 */
export function commentErrorMessage(message: string, lang: UiLang) {
  if (message.includes("comments unavailable"))
    return tri(
      lang,
      "Quem publicou limitou quem pode comentar aqui.",
      "The author limited who can comment here.",
      "Quien lo publicó limitó quién puede comentar aquí.",
    );
  if (message.includes("interaction unavailable"))
    return tri(
      lang,
      "Vocês não podem interagir por causa de um bloqueio.",
      "You cannot interact because of a block.",
      "No pueden interactuar debido a un bloqueo.",
    );
  if (message.includes("rate") || message.includes("daily"))
    return tri(
      lang,
      "Você comentou muitas vezes. Aguarde um pouco.",
      "You are commenting too quickly. Please wait.",
      "Estás comentando demasiado rápido. Espera un poco.",
    );
  if (message.includes("depth"))
    return tri(
      lang,
      "Esta conversa atingiu o limite de respostas.",
      "This conversation reached its reply limit.",
      "Esta conversación alcanzó el límite de respuestas.",
    );
  if (message.includes("invalid comment"))
    return tri(
      lang,
      "Este comentário tem caracteres não aceitos ou passa de 500.",
      "This comment has unsupported characters or exceeds 500.",
      "Este comentario tiene caracteres no admitidos o supera los 500.",
    );
  return tri(
    lang,
    "Não foi possível concluir esta ação.",
    "Could not complete this action.",
    "No se pudo completar esta acción.",
  );
}

export function CommentAvatar({
  lang,
  username,
  name,
  avatarUrl,
}: {
  lang: UiLang;
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
  lang: UiLang;
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
        <RelativeTime value={createdAt} lang={lang} />
        {edited && <i>{tri(lang, "editado", "edited", "editado")}</i>}
      </span>
    </header>
  );
}

export function CommentArticle({
  id,
  deleted,
  lang,
  username,
  name,
  avatarUrl,
  createdAt,
  edited = false,
  badge,
  body,
  editor,
  actions,
}: {
  id: string;
  deleted: boolean;
  lang: UiLang;
  username: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  edited?: boolean;
  badge?: ReactNode;
  body: string;
  editor?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article
      id={`comment-${id}`}
      data-deleted={deleted || undefined}
      tabIndex={-1}
    >
      {!deleted && (
        <CommentAvatar
          lang={lang}
          username={username}
          name={name}
          avatarUrl={avatarUrl}
        />
      )}
      <div>
        {!deleted && (
          <CommentHeader
            lang={lang}
            username={username}
            name={name}
            createdAt={createdAt}
            edited={edited}
            badge={badge}
          />
        )}
        {editor ?? (
          <p data-deleted={deleted || undefined}>
            {deleted ? (
              tri(
                lang,
                "Comentário removido",
                "Comment deleted",
                "Comentario eliminado",
              )
            ) : (
              <MentionText text={body} lang={lang} />
            )}
          </p>
        )}
        {!editor && actions}
      </div>
    </article>
  );
}

export function CommentInlineForm({
  label,
  value,
  lang,
  pending,
  submitLabel,
  submitIcon,
  placeholder,
  onChange,
  onCancel,
  onSubmit,
}: {
  label?: string;
  value: string;
  lang: UiLang;
  pending: boolean;
  submitLabel: string;
  submitIcon?: ReactNode;
  placeholder?: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const t = uiText(lang);
  return (
    <form
      className="profile-comment-inline-form profile-reply-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {label && <label>{label}</label>}
      <textarea
        autoFocus
        value={value}
        maxLength={500}
        rows={2}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <footer>
        <small>{value.length}/500</small>
        <button type="button" onClick={onCancel}>
          {t.cancel}
        </button>
        <button type="submit" disabled={!value.trim() || pending}>
          {submitIcon}
          {submitLabel}
        </button>
      </footer>
    </form>
  );
}

export function CommunityTextArea({
  id,
  label,
  value,
  maxLength,
  rows = 2,
  placeholder,
  className,
  action,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  rows?: number;
  placeholder: string;
  className?: string;
  action?: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <footer>
        <small>
          {value.length}/{maxLength}
        </small>
        {action}
      </footer>
    </div>
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
  onToggle,
}: {
  lang: UiLang;
  count: number;
  liked: boolean;
  canLike: boolean;
  pending?: boolean;
  onToggle: () => void;
}) {
  if (!canLike) {
    // The like affordance always shows, even on your own content with no likes
    // yet — a like you can see is the whole point of the counter.
    return (
      <span
        className="profile-comment-like-static"
        aria-label={tri(
          lang,
          `${count} curtidas`,
          `${count} likes`,
          `${count} me gusta`,
        )}
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
          ? tri(lang, "Remover curtida", "Remove like", "Quitar me gusta")
          : tri(
              lang,
              "Curtir comentário",
              "Like comment",
              "Me gusta el comentario",
            )
      }
    >
      <Heart size={13} fill={liked ? "currentColor" : "none"} />
      {count > 0 && <span>{count.toLocaleString(lang)}</span>}
    </button>
  );
}

export function PendingComment({ lang }: { lang: UiLang }) {
  return (
    <article
      className="profile-comment-pending"
      aria-label={tri(
        lang,
        "Publicando comentário",
        "Posting comment",
        "Publicando comentario",
      )}
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

/** Flat rows become the same newest-thread/chronological-reply tree everywhere. */
export function buildCommentTree<
  T extends {
    id: string;
    parent_id: string | null;
    created_at: string;
    deleted_at: string | null;
  },
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
  roots.sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const node of nodes.values())
    node.replies.sort((a, b) => a.created_at.localeCompare(b.created_at));
  function prune(items: Node[]): Node[] {
    return items.flatMap((item) => {
      const next = { ...item, replies: prune(item.replies) } as Node;
      return next.deleted_at && next.replies.length === 0 ? [] : [next];
    });
  }
  return prune(roots);
}
