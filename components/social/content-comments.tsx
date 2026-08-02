"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidCommentBody, normalizeCommentBody } from "@/lib/comments";
import { OrganizationMark, VerifiedBadge } from "@/components/verified-badge";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import { useProfileLevels } from "@/lib/use-profile-levels";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { AnimatePresence } from "motion/react";
import {
  commentErrorMessage,
  buildCommentTree,
  CommentArticle,
  CommentInlineForm,
  CommentLike,
  CommunityTextArea,
  PendingComment,
} from "./comment-parts";

export type ContentComment = {
  id: string;
  public_id: string;
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
  account_type?: "PERSON" | "ORGANIZATION";
  like_count: number;
  liked_by_viewer: boolean;
};

type Node = ContentComment & { replies: Node[] };

export function ContentComments({
  contentType,
  contentId,
  ownerId,
  viewerId,
  canComment = Boolean(viewerId),
  commentsScope = "EVERYONE",
  lang,
}: {
  contentType: "list" | "review" | "screenshot" | "diary";
  contentId: string;
  ownerId: string;
  viewerId: string | null;
  canComment?: boolean;
  commentsScope?: "EVERYONE" | "FOLLOWERS" | "NOBODY";
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
  const [errorTarget, setErrorTarget] = useState<string | null>(null);

  const levels = useProfileLevels(
    useMemo(() => (rows ?? []).map((row) => row.author_id), [rows]),
  );

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
      setErrorTarget(null);
    }
  }, [fetchRows, t.couldNotLoad]);

  useEffect(() => {
    let active = true;
    fetchRows()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch(() => {
        if (active) {
          setError(t.couldNotLoad);
          setErrorTarget(null);
        }
      });
    return () => {
      active = false;
    };
  }, [fetchRows, t.couldNotLoad]);

  function clearTargetedError(target: string) {
    if (errorTarget !== target) return;
    setError(null);
    setErrorTarget(null);
  }

  async function submit(text: string, parentId: string | null) {
    const clean = normalizeCommentBody(text);
    if (!clean || pending) return;
    const pendingKey = parentId ? `reply-${parentId}` : "create";
    if (!isValidCommentBody(clean)) {
      setError(commentErrorMessage("invalid comment", lang));
      setErrorTarget(pendingKey);
      return;
    }
    setPending(pendingKey);
    setError(null);
    setErrorTarget(null);
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
      setErrorTarget(pendingKey);
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
    const clean = normalizeCommentBody(editBody);
    const pendingKey = `edit-${id}`;
    if (!clean || pending) return;
    if (!isValidCommentBody(clean)) {
      setError(commentErrorMessage("invalid comment", lang));
      setErrorTarget(pendingKey);
      return;
    }
    setPending(pendingKey);
    setError(null);
    setErrorTarget(null);
    const { error: updateError } = await createClient().rpc(
      "update_content_comment",
      { target_comment: id, comment_body: clean },
    );
    if (updateError) {
      setError(commentErrorMessage(updateError.message, lang));
      setErrorTarget(pendingKey);
    } else {
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
    setErrorTarget(null);
    const { error: deleteError } = await createClient().rpc(
      "delete_content_comment",
      { target_comment: id },
    );
    if (deleteError) {
      setError(t.couldNotRemove);
      setErrorTarget(null);
    } else await reload();
    setPending(null);
  }

  async function copyCommentLink(id: string, publicId: string) {
    try {
      const url = new URL(window.location.href);
      url.hash = `comment-${publicId}`;
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
      setErrorTarget(null);
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
          id={comment.public_id}
          deleted={deleted}
          lang={lang}
          username={comment.username}
          name={name}
          avatarUrl={comment.avatar_url}
          createdAt={comment.created_at}
          edited={edited}
          badge={
            <>
              {/* Level, check, then the organization mark, the same order as
                  every other name row. */}
              {levels.get(comment.author_id) && (
                <ProfileLevelBadge
                  lang={lang}
                  standing={levels.get(comment.author_id)!}
                  username={comment.username}
                />
              )}
              {comment.verified && (
                <VerifiedBadge lang={lang} profileId={comment.author_id} />
              )}
              {comment.account_type === "ORGANIZATION" && (
                <OrganizationMark lang={lang} />
              )}
            </>
          }
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
                onChange={(value) => {
                  setEditBody(value);
                  clearTargetedError(`edit-${comment.id}`);
                }}
                onCancel={() => {
                  clearTargetedError(`edit-${comment.id}`);
                  setEditing(null);
                }}
                onSubmit={() => void update(comment.id)}
                error={
                  errorTarget === `edit-${comment.id}`
                    ? (error ?? undefined)
                    : undefined
                }
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
                  canLike={Boolean(viewerId)}
                  pending={like.pending}
                  onToggle={() => void toggleLike(comment)}
                />
                {viewerId && depth < 2 && (
                  <button
                    className="profile-comment-reply-action"
                    type="button"
                    onClick={() => {
                      setError(null);
                      setErrorTarget(null);
                      setReplyBody("");
                      setReplyTo(replyTo === comment.id ? null : comment.id);
                    }}
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
                      setError(null);
                      setErrorTarget(null);
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
                        onSelect={() =>
                          void copyCommentLink(comment.id, comment.public_id)
                        }
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
            onChange={(value) => {
              setReplyBody(value);
              clearTargetedError(`reply-${comment.id}`);
            }}
            onCancel={() => {
              clearTargetedError(`reply-${comment.id}`);
              setReplyTo(null);
            }}
            onSubmit={() => void submit(replyBody, comment.id)}
            error={
              errorTarget === `reply-${comment.id}`
                ? (error ?? undefined)
                : undefined
            }
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
              : contentType === "review"
                ? tri(
                    lang,
                    "Converse sobre esta avaliação. Respostas ficam na mesma conversa.",
                    "Talk about this review. Replies stay in the same conversation.",
                    "Habla sobre esta reseña. Las respuestas quedan en la misma conversación.",
                  )
                : contentType === "screenshot"
                  ? tri(
                      lang,
                      "Converse sobre esta captura. Respostas ficam na mesma conversa.",
                      "Talk about this screenshot. Replies stay in the same conversation.",
                      "Habla sobre esta captura. Las respuestas quedan en la misma conversación.",
                    )
                  : tri(
                      lang,
                      "Converse sobre esta sessão. Respostas ficam na mesma conversa.",
                      "Talk about this session. Replies stay in the same conversation.",
                      "Habla sobre esta sesión. Las respuestas quedan en la misma conversación.",
                    )}
          </p>
        </div>
        <span>{total}</span>
      </header>

      {viewerId && canComment ? (
        <form
          className="profile-comment-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(body, null);
          }}
        >
          <CommunityTextArea
            id="content-comment-body"
            value={body}
            maxLength={500}
            rows={2}
            label={tri(
              lang,
              "Inicie uma conversa",
              "Start a conversation",
              "Inicia una conversación",
            )}
            placeholder={tri(
              lang,
              "Adicione algo à conversa…",
              "Add something to the conversation…",
              "Añade algo a la conversación…",
            )}
            onChange={(value) => {
              setBody(value);
              clearTargetedError("create");
            }}
            countCodePoints
            error={errorTarget === "create" ? (error ?? undefined) : undefined}
            action={
              <button
                type="submit"
                disabled={!isValidCommentBody(body) || Boolean(pending)}
              >
                {pending === "create" ? (
                  <LoaderCircle className="spin" size={14} aria-hidden />
                ) : (
                  <Send size={14} />
                )}
                {t.comment}
              </button>
            }
          />
        </form>
      ) : (
        <p className="profile-comments-notice">
          {!viewerId
            ? tri(
                lang,
                "Entre na sua conta para comentar.",
                "Sign in to leave a comment.",
                "Inicia sesión para comentar.",
              )
            : commentsScope === "NOBODY"
              ? tri(
                  lang,
                  "Os comentários estão desativados nesta publicação.",
                  "Comments are disabled on this post.",
                  "Los comentarios están desactivados en esta publicación.",
                )
              : tri(
                  lang,
                  "Somente seguidores podem comentar nesta publicação.",
                  "Only followers can comment on this post.",
                  "Solo los seguidores pueden comentar en esta publicación.",
                )}
        </p>
      )}

      {error && !errorTarget && (
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
          <AnimatePresence initial={false}>
            {tree.map((comment) => renderComment(comment))}
          </AnimatePresence>
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
