"use client";

import { CornerDownRight, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VerifiedMark } from "@/components/verified-badge";
import { uiText } from "@/lib/ui-text";
import {
  buildCommentTree,
  CommentAvatar,
  CommentHeader,
  CommentLike,
  PendingComment,
} from "./comment-parts";

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
  const [likes, setLikes] = useState<
    Record<string, { count: number; liked: boolean; pending: boolean }>
  >({});
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

  const reload = useCallback(async () => {
    try {
      setRows(await fetchRows());
      setLikes({});
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
      await reload();
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
    else await reload();
    setPending(null);
  }

  async function toggleLike(comment: Node) {
    const current = likes[comment.id] ?? {
      count: comment.like_count,
      liked: comment.liked_by_viewer,
      pending: false,
    };
    if (current.pending || !viewerId) return;
    const next = !current.liked;
    // Optimistic, reverted below if the write fails.
    setLikes((state) => ({
      ...state,
      [comment.id]: {
        count: current.count + (next ? 1 : -1),
        liked: next,
        pending: true,
      },
    }));
    const client = createClient();
    const { error: likeError } = next
      ? await client
          .from("content_likes")
          .insert({ content_type: "content_comment", content_id: comment.id })
      : await client
          .from("content_likes")
          .delete()
          .eq("content_type", "content_comment")
          .eq("content_id", comment.id)
          .eq("profile_id", viewerId);
    setLikes((state) => ({
      ...state,
      [comment.id]: likeError
        ? { ...current, pending: false }
        : {
            count: current.count + (next ? 1 : -1),
            liked: next,
            pending: false,
          },
    }));
  }

  function renderComment(comment: Node, depth = 0): React.ReactNode {
    const name = comment.display_name || `@${comment.username}`;
    const deleted = Boolean(comment.deleted_at);
    const isAuthor = viewerId === comment.author_id;
    const canDelete = !deleted && (isAuthor || viewerId === ownerId);
    const like = likes[comment.id] ?? {
      count: comment.like_count,
      liked: comment.liked_by_viewer,
      pending: false,
    };

    return (
      <div
        className="profile-comment-thread"
        data-depth={Math.min(depth, 3)}
        key={comment.id}
      >
        <article
          id={`comment-${comment.id}`}
          data-deleted={deleted || undefined}
        >
          {!deleted && (
            <CommentAvatar
              lang={lang}
              username={comment.username}
              name={name}
              avatarUrl={comment.avatar_url}
            />
          )}
          <div>
            {!deleted && (
              <CommentHeader
                lang={lang}
                username={comment.username}
                name={name}
                createdAt={comment.created_at}
                badge={comment.verified ? <VerifiedMark size={13} /> : null}
              />
            )}
            <p data-deleted={deleted || undefined}>
              {deleted
                ? pt
                  ? "Comentário removido"
                  : "Comment deleted"
                : comment.body}
            </p>
            {!deleted && (
              <footer className="profile-comment-actions">
                <CommentLike
                  lang={lang}
                  count={like.count}
                  liked={like.liked}
                  canLike={Boolean(viewerId) && !isAuthor}
                  pending={like.pending}
                  onToggle={() => void toggleLike(comment)}
                />
                {viewerId && depth < 2 && (
                  <button
                    className="profile-comment-reply-action"
                    type="button"
                    onClick={() =>
                      setReplyTo(replyTo === comment.id ? null : comment.id)
                    }
                  >
                    <CornerDownRight size={13} />
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
                      <LoaderCircle className="spin" size={13} aria-hidden />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    {t.remove}
                  </button>
                )}
              </footer>
            )}
          </div>
        </article>

        {replyTo === comment.id && (
          <form
            className="profile-comment-inline-form profile-reply-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(replyBody, comment.id);
            }}
          >
            <textarea
              autoFocus
              value={replyBody}
              maxLength={500}
              rows={2}
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder={pt ? `Responder a ${name}…` : `Reply to ${name}…`}
            />
            <footer>
              <small>{replyBody.length}/500</small>
              <button type="button" onClick={() => setReplyTo(null)}>
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!replyBody.trim() || Boolean(pending)}
              >
                {pending === `reply-${comment.id}` && (
                  <LoaderCircle className="spin" size={13} aria-hidden />
                )}
                {pt ? "Responder" : "Reply"}
              </button>
            </footer>
          </form>
        )}

        {(comment.replies.length > 0 || pending === `reply-${comment.id}`) && (
          <div className="profile-comment-replies">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
            {pending === `reply-${comment.id}` && (
              <PendingComment lang={lang} />
            )}
          </div>
        )}
      </div>
    );
  }

  const tree = rows ? (buildCommentTree(rows) as Node[]) : [];
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
          <footer>
            <small>{body.length}/500</small>
            <button type="submit" disabled={!body.trim() || Boolean(pending)}>
              {pending === "create" && (
                <LoaderCircle className="spin" size={14} aria-hidden />
              )}
              {pt ? "Comentar" : "Comment"}
            </button>
          </footer>
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
        <div className="profile-comment-list">
          <PendingComment lang={lang} />
          <PendingComment lang={lang} />
        </div>
      ) : tree.length ? (
        <div className="profile-comment-list">
          {tree.map((comment) => renderComment(comment))}
          {pending === "create" && <PendingComment lang={lang} />}
        </div>
      ) : (
        <div className="content-comments-empty">
          {pt
            ? "Seja a primeira pessoa a comentar."
            : "Be the first to comment."}
        </div>
      )}
    </section>
  );
}
