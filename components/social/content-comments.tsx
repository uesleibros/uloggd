"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  CornerDownRight,
  Link2,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VerifiedMark } from "@/components/verified-badge";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  commentErrorMessage,
  buildCommentTree,
  CommentArticle,
  CommentInlineForm,
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
  updated_at: string;
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
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [rows, setRows] = useState<ContentComment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const [copiedComment, setCopiedComment] = useState<string | null>(null);
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
      setError(t.couldNotLoad);
    }
  }, [fetchRows, t.couldNotLoad]);

  useEffect(() => {
    let active = true;
    fetchRows()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch(() => {
        if (active) setError(t.couldNotLoad);
      });
    return () => {
      active = false;
    };
  }, [fetchRows, t.couldNotLoad]);

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
      setError(commentErrorMessage(createError.message, lang));
    } else {
      if (parentId) {
        setReplyTo(null);
        setReplyBody("");
      } else setBody("");
      await reload();
    }
    setPending(null);
  }

  async function update(id: string) {
    if (!editBody.trim() || pending) return;
    setPending(`edit-${id}`);
    setError(null);
    const { error: updateError } = await createClient().rpc(
      "update_content_comment",
      { target_comment: id, comment_body: editBody },
    );
    if (updateError) setError(commentErrorMessage(updateError.message, lang));
    else {
      setEditing(null);
      setEditBody("");
      await reload();
    }
    setPending(null);
  }

  async function remove(id: string) {
    if (pending) return;
    if (armedDelete !== id) {
      setArmedDelete(id);
      window.setTimeout(
        () => setArmedDelete((current) => (current === id ? null : current)),
        4000,
      );
      return;
    }
    setArmedDelete(null);
    setPending(`delete-${id}`);
    setError(null);
    const { error: deleteError } = await createClient().rpc(
      "delete_content_comment",
      { target_comment: id },
    );
    if (deleteError) setError(t.couldNotRemove);
    else await reload();
    setPending(null);
  }

  async function copyCommentLink(id: string) {
    try {
      const url = new URL(window.location.href);
      url.hash = `comment-${id}`;
      await navigator.clipboard.writeText(url.toString());
      setCopiedComment(id);
      window.setTimeout(
        () => setCopiedComment((current) => (current === id ? null : current)),
        1800,
      );
    } catch {
      setError(
        tri(
          lang,
          "Não foi possível copiar o link.",
          "Could not copy the link.",
          "No se pudo copiar el enlace.",
        ),
      );
    }
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
    const edited =
      !deleted &&
      new Date(comment.updated_at).getTime() -
        new Date(comment.created_at).getTime() >
        1000;
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
        <CommentArticle
          id={comment.id}
          deleted={deleted}
          lang={lang}
          username={comment.username}
          name={name}
          avatarUrl={comment.avatar_url}
          createdAt={comment.created_at}
          edited={edited}
          badge={comment.verified ? <VerifiedMark size={13} /> : null}
          body={comment.body}
          editor={
            editing === comment.id ? (
              <CommentInlineForm
                value={editBody}
                lang={lang}
                pending={Boolean(pending)}
                submitLabel={t.save}
                submitIcon={
                  pending === `edit-${comment.id}` ? (
                    <LoaderCircle className="spin" size={13} aria-hidden />
                  ) : null
                }
                onChange={setEditBody}
                onCancel={() => setEditing(null)}
                onSubmit={() => void update(comment.id)}
              />
            ) : null
          }
          actions={
            !deleted && editing !== comment.id ? (
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
                    {t.reply}
                  </button>
                )}
                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(null);
                      setEditBody(comment.body);
                      setEditing(comment.id);
                    }}
                  >
                    <Pencil size={13} /> {t.edit}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    disabled={Boolean(pending)}
                    data-armed={armedDelete === comment.id || undefined}
                    onClick={() => void remove(comment.id)}
                  >
                    {pending === `delete-${comment.id}` ? (
                      <LoaderCircle className="spin" size={13} aria-hidden />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    {pending === `delete-${comment.id}`
                      ? tri(lang, "Excluindo…", "Deleting…", "Eliminando…")
                      : armedDelete === comment.id
                        ? tri(
                            lang,
                            "Excluir mesmo?",
                            "Really delete?",
                            "¿Eliminar de verdad?",
                          )
                        : t.delete}
                  </button>
                )}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="profile-comment-more"
                      type="button"
                      aria-label={tri(
                        lang,
                        "Mais ações do comentário",
                        "More comment actions",
                        "Más acciones del comentario",
                      )}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="profile-comment-action-menu"
                      sideOffset={6}
                      align="end"
                    >
                      <DropdownMenu.Item
                        onSelect={() => void copyCommentLink(comment.id)}
                      >
                        {copiedComment === comment.id ? (
                          <Check size={14} />
                        ) : (
                          <Link2 size={14} />
                        )}
                        {copiedComment === comment.id
                          ? t.linkCopied
                          : t.copyLink}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </footer>
            ) : null
          }
        />

        {replyTo === comment.id && (
          <CommentInlineForm
            label={tri(
              lang,
              `Respondendo a ${name}`,
              `Replying to ${name}`,
              `Respondiendo a ${name}`,
            )}
            value={replyBody}
            lang={lang}
            pending={Boolean(pending)}
            submitLabel={t.reply}
            submitIcon={
              pending === `reply-${comment.id}` ? (
                <LoaderCircle className="spin" size={13} aria-hidden />
              ) : (
                <Send size={13} />
              )
            }
            placeholder={tri(
              lang,
              "Escreva sua resposta…",
              "Write your reply…",
              "Escribe tu respuesta…",
            )}
            onChange={setReplyBody}
            onCancel={() => setReplyTo(null)}
            onSubmit={() => void submit(replyBody, comment.id)}
          />
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
    <section
      className="profile-comments content-comments"
      aria-labelledby="content-comments-title"
    >
      <header>
        <div>
          <h2 id="content-comments-title">
            <MessageCircle size={16} /> {t.comments}
          </h2>
          <p>
            {contentType === "list"
              ? tri(
                  lang,
                  "Converse sobre esta lista. Respostas ficam na mesma conversa.",
                  "Talk about this list. Replies stay in the same conversation.",
                  "Habla sobre esta lista. Las respuestas quedan en la misma conversación.",
                )
              : tri(
                  lang,
                  "Converse sobre esta avaliação. Respostas ficam na mesma conversa.",
                  "Talk about this review. Replies stay in the same conversation.",
                  "Habla sobre esta reseña. Las respuestas quedan en la misma conversación.",
                )}
          </p>
        </div>
        <span>{total}</span>
      </header>

      {viewerId ? (
        <form
          className="profile-comment-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(body, null);
          }}
        >
          <label htmlFor="content-comment-body">
            {tri(
              lang,
              "Inicie uma conversa",
              "Start a conversation",
              "Inicia una conversación",
            )}
          </label>
          <textarea
            id="content-comment-body"
            value={body}
            maxLength={500}
            rows={2}
            placeholder={tri(
              lang,
              "Adicione algo à conversa…",
              "Add something to the conversation…",
              "Añade algo a la conversación…",
            )}
            onChange={(event) => setBody(event.target.value)}
          />
          <footer>
            <small>{body.length}/500</small>
            <button type="submit" disabled={!body.trim() || Boolean(pending)}>
              {pending === "create" ? (
                <LoaderCircle className="spin" size={14} aria-hidden />
              ) : (
                <Send size={14} />
              )}
              {t.comment}
            </button>
          </footer>
        </form>
      ) : (
        <p className="profile-comments-notice">
          {tri(
            lang,
            "Entre na sua conta para comentar.",
            "Sign in to leave a comment.",
            "Inicia sesión para comentar.",
          )}
        </p>
      )}

      {error && (
        <p className="profile-comments-error" role="alert">
          {error}
        </p>
      )}

      <div className="profile-comment-list">
        {pending === "create" && <PendingComment lang={lang} />}
        {rows === null ? (
          <>
            <PendingComment lang={lang} />
            <PendingComment lang={lang} />
          </>
        ) : (
          tree.map((comment) => renderComment(comment))
        )}
        {rows !== null && !tree.length && (
          <div className="profile-comments-empty">
            <MessageCircle size={20} />
            <span>
              {tri(
                lang,
                "Ainda não há comentários.",
                "No comments yet.",
                "Todavía no hay comentarios.",
              )}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
