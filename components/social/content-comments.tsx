"use client";

import { LoaderCircle, MessageSquare, Reply, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VerifiedMark } from "@/components/verified-badge";
import { LikeButton } from "./like-button";
import { uiText } from "@/lib/ui-text";

export type ContentComment = {
  id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  deleted_at: string | null;
  created_at: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  like_count: number;
  liked_by_viewer: boolean;
};

type Node = ContentComment & { replies: Node[] };

/** Flat rows from the RPC become a tree, preserving arrival order per level. */
function toTree(rows: ContentComment[]): Node[] {
  const nodes = new Map<string, Node>();
  for (const row of rows) nodes.set(row.id, { ...row, replies: [] });
  const roots: Node[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parent_id ? nodes.get(row.parent_id) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

export function ContentComments({
  contentType,
  contentId,
  ownerId,
  viewerId,
  lang,
}: {
  contentType: "list" | "review";
  contentId: string;
  ownerId: string;
  viewerId: string | null;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const [rows, setRows] = useState<ContentComment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { data, error: loadError } = await createClient().rpc(
      "get_content_comments",
      { target_type: contentType, target_id: contentId },
    );
    if (loadError) throw loadError;
    return (data ?? []) as ContentComment[];
  }, [contentType, contentId]);

  // Reloads after writing, so a reply that the database rejected never shows
  // up locally as if it had been saved.
  const load = useCallback(async () => {
    try {
      setRows(await fetchRows());
    } catch {
      setError(pt ? "Não foi possível carregar." : "Could not load.");
    }
  }, [fetchRows, pt]);

  useEffect(() => {
    let active = true;
    fetchRows()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch(() => {
        if (active)
          setError(pt ? "Não foi possível carregar." : "Could not load.");
      });
    return () => {
      active = false;
    };
  }, [fetchRows, pt]);

  async function submit(text: string, parentId: string | null) {
    const clean = text.trim();
    if (!clean || pending) return;
    setPending(parentId ? `reply-${parentId}` : "create");
    setError(null);
    const { error: createError } = await createClient().rpc(
      "create_content_comment",
      {
        target_type: contentType,
        target_id: contentId,
        comment_body: clean,
        parent_comment: parentId,
      },
    );
    if (createError) {
      setError(
        createError.message.includes("depth")
          ? pt
            ? "Esta conversa atingiu o limite de respostas."
            : "This conversation reached its reply limit."
          : pt
            ? "Não foi possível comentar."
            : "Could not comment.",
      );
    } else {
      if (parentId) {
        setReplyTo(null);
        setReplyBody("");
      } else setBody("");
      await load();
    }
    setPending(null);
  }

  async function remove(id: string) {
    if (pending) return;
    setPending(`delete-${id}`);
    setError(null);
    const { error: deleteError } = await createClient().rpc(
      "delete_content_comment",
      { target_comment: id },
    );
    if (deleteError)
      setError(pt ? "Não foi possível remover." : "Could not remove.");
    else await load();
    setPending(null);
  }

  function renderComment(comment: Node, depth = 0): React.ReactNode {
    const name = comment.display_name || `@${comment.username}`;
    const deleted = Boolean(comment.deleted_at);
    const canDelete =
      !deleted && (viewerId === comment.author_id || viewerId === ownerId);
    return (
      <div
        className="profile-comment-thread"
        data-depth={Math.min(depth, 3)}
        key={comment.id}
      >
        <article data-deleted={deleted || undefined}>
          {!deleted && (
            <Link
              className="profile-comment-avatar"
              href={`/${lang}/u/${comment.username}`}
              aria-label={name}
            >
              {comment.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={comment.avatar_url} alt="" />
              ) : (
                name.slice(0, 1).toUpperCase()
              )}
            </Link>
          )}
          <div>
            {deleted ? (
              <p>{pt ? "Comentário removido" : "Comment removed"}</p>
            ) : (
              <>
                <header>
                  <Link href={`/${lang}/u/${comment.username}`}>
                    {name}
                    {comment.verified && <VerifiedMark size={13} />}
                  </Link>
                  <time dateTime={comment.created_at}>
                    {new Intl.DateTimeFormat(lang, {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(comment.created_at))}
                  </time>
                </header>
                <p>{comment.body}</p>
                <footer>
                  <LikeButton
                    lang={lang}
                    contentType="content_comment"
                    contentId={comment.id}
                    count={comment.like_count}
                    liked={comment.liked_by_viewer}
                    canLike={Boolean(viewerId)}
                  />
                  {viewerId && depth < 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTo(replyTo === comment.id ? null : comment.id)
                      }
                    >
                      <Reply size={13} />
                      {pt ? "Responder" : "Reply"}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      data-danger
                      onClick={() => void remove(comment.id)}
                    >
                      {pending === `delete-${comment.id}` ? (
                        <LoaderCircle className="spin" size={13} />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      {t.remove}
                    </button>
                  )}
                </footer>
              </>
            )}
          </div>
        </article>

        {replyTo === comment.id && (
          <form
            className="profile-comment-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(replyBody, comment.id);
            }}
          >
            <textarea
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              maxLength={500}
              rows={2}
              autoFocus
              placeholder={pt ? `Responder a ${name}…` : `Reply to ${name}…`}
            />
            <div>
              <button type="button" onClick={() => setReplyTo(null)}>
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!replyBody.trim() || Boolean(pending)}
              >
                {pending === `reply-${comment.id}` && (
                  <LoaderCircle className="spin" size={13} />
                )}
                {pt ? "Responder" : "Reply"}
              </button>
            </div>
          </form>
        )}

        {comment.replies.length > 0 && (
          <div className="profile-comment-replies">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const tree = rows ? toTree(rows) : [];
  const total = rows?.filter((row) => !row.deleted_at).length ?? 0;

  return (
    <section className="content-comments">
      <div className="social-section-title">
        <div>
          <h2>{pt ? "Comentários" : "Comments"}</h2>
          <p>
            {rows === null
              ? pt
                ? "Carregando…"
                : "Loading…"
              : total === 0
                ? pt
                  ? "Ninguém comentou ainda"
                  : "No comments yet"
                : `${total} ${
                    total === 1
                      ? pt
                        ? "comentário"
                        : "comment"
                      : pt
                        ? "comentários"
                        : "comments"
                  }`}
          </p>
        </div>
      </div>

      {viewerId ? (
        <form
          className="profile-comment-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(body, null);
          }}
        >
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder={pt ? "Escreva um comentário…" : "Write a comment…"}
          />
          <div>
            <span>{body.length}/500</span>
            <button type="submit" disabled={!body.trim() || Boolean(pending)}>
              {pending === "create" && (
                <LoaderCircle className="spin" size={14} />
              )}
              {pt ? "Comentar" : "Comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="content-comments-signed-out">
          <Link href={`/${lang}/login`}>
            {pt ? "Entre para comentar." : "Sign in to comment."}
          </Link>
        </p>
      )}

      {error && (
        <p className="content-comments-error" role="alert">
          {error}
        </p>
      )}

      {rows === null ? (
        <div className="content-comments-loading" aria-busy="true">
          {Array.from({ length: 2 }, (_, index) => (
            <span className="skeleton-block" key={index} />
          ))}
        </div>
      ) : tree.length ? (
        <div className="profile-comment-list">
          {tree.map((comment) => renderComment(comment))}
        </div>
      ) : (
        <div className="content-comments-empty">
          <MessageSquare size={20} aria-hidden />
          {pt
            ? "Seja a primeira pessoa a comentar."
            : "Be the first to comment."}
        </div>
      )}
    </section>
  );
}
