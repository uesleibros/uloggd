"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  CornerDownRight,
  Flag,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Send,
  Heart,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProfileComment = {
  id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  like_count: number;
  liked_by_viewer: boolean;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

type CommentNode = ProfileComment & { replies: CommentNode[] };

function formatCommentTime(date: string, lang: "pt-BR" | "en") {
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

function PendingComment({ lang }: { lang: "pt-BR" | "en" }) {
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

function buildCommentTree(comments: ProfileComment[]) {
  const nodes = new Map<string, CommentNode>(
    comments.map((comment) => [comment.id, { ...comment, replies: [] }]),
  );
  const roots: CommentNode[] = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parent_id ? nodes.get(comment.parent_id) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  roots.sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const node of nodes.values())
    node.replies.sort((a, b) => a.created_at.localeCompare(b.created_at));
  function prune(items: CommentNode[]): CommentNode[] {
    return items.flatMap((item) => {
      const next = { ...item, replies: prune(item.replies) };
      return next.deleted_at && next.replies.length === 0 ? [] : [next];
    });
  }
  return prune(roots);
}

export function ProfileComments({
  profileId,
  viewerId,
  comments,
  canComment,
  commentsClosed,
  lang,
}: {
  profileId: string;
  viewerId: string | null;
  comments: ProfileComment[];
  canComment: boolean;
  commentsClosed: boolean;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const tree = useMemo(() => buildCommentTree(comments), [comments]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [awaitingCommentId, setAwaitingCommentId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<ProfileComment | null>(null);
  const [reportReason, setReportReason] = useState("HARASSMENT");
  const [reportDetails, setReportDetails] = useState("");
  const [likes, setLikes] = useState(() =>
    Object.fromEntries(
      comments.map((comment) => [
        comment.id,
        {
          count: comment.like_count,
          liked: comment.liked_by_viewer,
          pending: false,
        },
      ]),
    ),
  );

  useEffect(() => {
    if (
      awaitingCommentId &&
      comments.some((comment) => comment.id === awaitingCommentId)
    ) {
      const frame = window.requestAnimationFrame(() => {
        setAwaitingCommentId(null);
        setPending(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [awaitingCommentId, comments]);

  useEffect(() => {
    if (!awaitingCommentId) return;
    const fallback = window.setTimeout(() => {
      setAwaitingCommentId(null);
      setPending(null);
    }, 6000);
    return () => window.clearTimeout(fallback);
  }, [awaitingCommentId]);

  function actionError(message: string) {
    return message.includes("rate")
      ? pt
        ? "Você comentou muitas vezes. Aguarde um pouco."
        : "You are commenting too quickly. Please wait."
      : message.includes("depth")
        ? pt
          ? "Essa conversa atingiu o limite de respostas."
          : "This conversation reached its reply limit."
        : pt
          ? "Não foi possível concluir esta ação."
          : "Could not complete this action.";
  }

  async function createComment(
    event: React.FormEvent,
    content: string,
    parentId: string | null,
  ) {
    event.preventDefault();
    if (!content.trim() || pending) return;
    const pendingKey = parentId ? `reply-${parentId}` : "create";
    setPending(pendingKey);
    setError(null);
    const { data: created, error: createError } = await createClient().rpc(
      "create_profile_comment",
      {
        target_profile: profileId,
        comment_body: content,
        parent_comment: parentId,
      },
    );
    if (createError) {
      setError(actionError(createError.message));
      setPending(null);
    } else {
      if (parentId) {
        setReplyTo(null);
        setReplyBody("");
      } else setBody("");
      const createdComment = Array.isArray(created) ? created[0] : created;
      if (createdComment?.id) setAwaitingCommentId(createdComment.id);
      router.refresh();
      if (!createdComment?.id) setPending(null);
    }
  }

  async function updateComment(event: React.FormEvent, commentId: string) {
    event.preventDefault();
    if (!editBody.trim() || pending) return;
    setPending(`edit-${commentId}`);
    setError(null);
    const { error: updateError } = await createClient().rpc(
      "update_profile_comment",
      { target_comment: commentId, comment_body: editBody },
    );
    if (updateError) setError(actionError(updateError.message));
    else {
      setEditing(null);
      setEditBody("");
      router.refresh();
    }
    setPending(null);
  }

  async function remove(comment: ProfileComment) {
    if (pending) return;
    if (armedDelete !== comment.id) {
      setArmedDelete(comment.id);
      window.setTimeout(
        () =>
          setArmedDelete((current) =>
            current === comment.id ? null : current,
          ),
        4000,
      );
      return;
    }
    setArmedDelete(null);
    setPending(`delete-${comment.id}`);
    setError(null);
    const { data, error: deleteError } = await createClient().rpc(
      "delete_profile_comment",
      { target_comment: comment.id },
    );
    if (deleteError || data !== true)
      setError(pt ? "Não foi possível excluir." : "Could not delete.");
    else router.refresh();
    setPending(null);
  }

  async function report(event: React.FormEvent) {
    event.preventDefault();
    if (!viewerId || !reporting || pending) return;
    setPending(`report-${reporting.id}`);
    setError(null);
    const { error: reportError } = await createClient()
      .from("reports")
      .insert({
        reporter_id: viewerId,
        target_profile_id: reporting.author_id,
        content_type: "PROFILE_COMMENT",
        content_id: reporting.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
    if (reportError)
      setError(
        pt ? "Não foi possível enviar a denúncia." : "Could not send report.",
      );
    else {
      setReporting(null);
      setReportDetails("");
    }
    setPending(null);
  }

  function startReply(comment: ProfileComment) {
    setEditing(null);
    setReplyBody("");
    setReplyTo(comment.id);
  }

  function startEdit(comment: ProfileComment) {
    setReplyTo(null);
    setEditBody(comment.body);
    setEditing(comment.id);
  }

  async function toggleLike(comment: ProfileComment) {
    if (!viewerId || viewerId === comment.author_id) return;
    const current = likes[comment.id] ?? {
      count: comment.like_count,
      liked: comment.liked_by_viewer,
      pending: false,
    };
    if (current.pending) return;
    const optimistic = {
      liked: !current.liked,
      count: Math.max(0, current.count + (current.liked ? -1 : 1)),
      pending: true,
    };
    setLikes((value) => ({ ...value, [comment.id]: optimistic }));
    const { data, error: likeError } = await createClient().rpc(
      "toggle_content_like",
      { target_type: "profile_comment", target_id: comment.id },
    );
    if (likeError) {
      setLikes((value) => ({
        ...value,
        [comment.id]: { ...current, pending: false },
      }));
      setError(actionError(likeError.message));
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    setLikes((value) => ({
      ...value,
      [comment.id]: {
        liked: Boolean(result?.liked),
        count: Number(result?.like_count ?? optimistic.count),
        pending: false,
      },
    }));
  }

  function renderComment(comment: CommentNode, depth = 0): React.ReactNode {
    const name = comment.author.display_name || `@${comment.author.username}`;
    const canDelete = viewerId === comment.author_id || viewerId === profileId;
    const isAuthor = viewerId === comment.author_id;
    const deleted = Boolean(comment.deleted_at);
    const edited =
      !deleted &&
      new Date(comment.updated_at).getTime() -
        new Date(comment.created_at).getTime() >
        1000;
    const commentLike = likes[comment.id] ?? {
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
        <article data-deleted={deleted || undefined}>
          {!deleted && (
            <Link
              className="profile-comment-avatar"
              href={`/${lang}/u/${comment.author.username}`}
              aria-label={name}
            >
              {comment.author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={comment.author.avatar_url} alt="" />
              ) : (
                name.slice(0, 1).toUpperCase()
              )}
            </Link>
          )}
          <div>
            {!deleted && (
              <header>
                <Link href={`/${lang}/u/${comment.author.username}`}>
                  {name}
                </Link>
                <span>
                  <b aria-hidden>·</b>
                  <time dateTime={comment.created_at}>
                    {formatCommentTime(comment.created_at, lang)}
                  </time>
                  {edited && <i>{pt ? "editado" : "edited"}</i>}
                </span>
              </header>
            )}

            {editing === comment.id ? (
              <form
                className="profile-comment-inline-form"
                onSubmit={(event) => void updateComment(event, comment.id)}
              >
                <textarea
                  autoFocus
                  value={editBody}
                  maxLength={500}
                  rows={2}
                  onChange={(event) => setEditBody(event.target.value)}
                />
                <footer>
                  <small>{editBody.length}/500</small>
                  <button type="button" onClick={() => setEditing(null)}>
                    {pt ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={!editBody.trim() || Boolean(pending)}
                  >
                    {pending === `edit-${comment.id}` && (
                      <LoaderCircle className="spin" size={13} aria-hidden />
                    )}
                    {pt ? "Salvar" : "Save"}
                  </button>
                </footer>
              </form>
            ) : (
              <p data-deleted={deleted || undefined}>
                {deleted
                  ? pt
                    ? "Comentário removido"
                    : "Comment deleted"
                  : comment.body}
              </p>
            )}

            {!editing && (
              <footer className="profile-comment-actions">
                {!deleted &&
                  (viewerId && viewerId !== comment.author_id ? (
                    <button
                      className="profile-comment-like-action"
                      type="button"
                      aria-pressed={commentLike.liked}
                      data-liked={commentLike.liked || undefined}
                      disabled={commentLike.pending}
                      onClick={() => void toggleLike(comment)}
                      aria-label={
                        commentLike.liked
                          ? pt
                            ? "Remover curtida"
                            : "Remove like"
                          : pt
                            ? "Curtir comentário"
                            : "Like comment"
                      }
                    >
                      <Heart
                        size={13}
                        fill={commentLike.liked ? "currentColor" : "none"}
                      />
                      {commentLike.count > 0 && (
                        <span>{commentLike.count.toLocaleString(lang)}</span>
                      )}
                    </button>
                  ) : (
                    commentLike.count > 0 && (
                      <span className="profile-comment-like-static">
                        <Heart size={13} />
                        {commentLike.count.toLocaleString(lang)}
                      </span>
                    )
                  ))}
                {canComment && !deleted && (
                  <button
                    className="profile-comment-reply-action"
                    type="button"
                    onClick={() => startReply(comment)}
                  >
                    <CornerDownRight size={13} /> {pt ? "Responder" : "Reply"}
                  </button>
                )}
                {isAuthor && !deleted && (
                  <button type="button" onClick={() => startEdit(comment)}>
                    <Pencil size={13} /> {pt ? "Editar" : "Edit"}
                  </button>
                )}
                {canDelete && !deleted && (
                  <button
                    type="button"
                    disabled={Boolean(pending)}
                    data-armed={armedDelete === comment.id || undefined}
                    onClick={() => void remove(comment)}
                  >
                    {pending === `delete-${comment.id}` ? (
                      <LoaderCircle className="spin" size={13} aria-hidden />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    {pending === `delete-${comment.id}`
                      ? pt
                        ? "Excluindo…"
                        : "Deleting…"
                      : armedDelete === comment.id
                        ? pt
                          ? "Excluir mesmo?"
                          : "Really delete?"
                        : pt
                          ? "Excluir"
                          : "Delete"}
                  </button>
                )}
                {viewerId && viewerId !== comment.author_id && !deleted && (
                  <button type="button" onClick={() => setReporting(comment)}>
                    <Flag size={13} /> {pt ? "Denunciar" : "Report"}
                  </button>
                )}
              </footer>
            )}

            {replyTo === comment.id && (
              <form
                className="profile-comment-inline-form profile-reply-form"
                onSubmit={(event) =>
                  void createComment(event, replyBody, comment.id)
                }
              >
                <label>
                  {pt ? `Respondendo a ${name}` : `Replying to ${name}`}
                </label>
                <textarea
                  autoFocus
                  value={replyBody}
                  maxLength={500}
                  rows={2}
                  placeholder={
                    pt ? "Escreva sua resposta…" : "Write your reply…"
                  }
                  onChange={(event) => setReplyBody(event.target.value)}
                />
                <footer>
                  <small>{replyBody.length}/500</small>
                  <button type="button" onClick={() => setReplyTo(null)}>
                    {pt ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={!replyBody.trim() || Boolean(pending)}
                  >
                    {pending === `reply-${comment.id}` ? (
                      <LoaderCircle className="spin" size={13} aria-hidden />
                    ) : (
                      <Send size={13} />
                    )}
                    {pt ? "Responder" : "Reply"}
                  </button>
                </footer>
              </form>
            )}
          </div>
        </article>
        {comment.replies.length > 0 && (
          <div className="profile-comment-replies">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
            {pending === `reply-${comment.id}` && (
              <PendingComment lang={lang} />
            )}
          </div>
        )}
        {comment.replies.length === 0 && pending === `reply-${comment.id}` && (
          <div className="profile-comment-replies">
            <PendingComment lang={lang} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      className="profile-comments"
      aria-labelledby="profile-comments-title"
    >
      <header>
        <div>
          <h2 id="profile-comments-title">
            <MessageCircle size={16} /> {pt ? "Comentários" : "Comments"}
          </h2>
          <p>
            {pt
              ? "Converse com respeito. Respostas, edições e denúncias ficam na mesma conversa."
              : "Keep it respectful. Replies, edits, and reports stay in the same conversation."}
          </p>
        </div>
        <span>{comments.filter((comment) => !comment.deleted_at).length}</span>
      </header>

      {canComment && (
        <form
          className="profile-comment-composer"
          onSubmit={(event) => void createComment(event, body, null)}
        >
          <label htmlFor="profile-comment-body">
            {pt ? "Inicie uma conversa" : "Start a conversation"}
          </label>
          <textarea
            id="profile-comment-body"
            value={body}
            maxLength={500}
            rows={2}
            placeholder={
              pt
                ? "Adicione algo à conversa…"
                : "Add something to the conversation…"
            }
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
              {pt ? "Comentar" : "Comment"}
            </button>
          </footer>
        </form>
      )}

      {!canComment && (
        <p className="profile-comments-notice">
          {commentsClosed
            ? pt
              ? "Os comentários estão desativados neste perfil."
              : "Comments are disabled on this profile."
            : viewerId
              ? pt
                ? "Somente seguidores podem comentar neste perfil."
                : "Only followers can comment on this profile."
              : pt
                ? "Entre na sua conta para comentar."
                : "Sign in to leave a comment."}
        </p>
      )}

      {error && (
        <p className="profile-comments-error" role="alert">
          {error}
        </p>
      )}

      <div className="profile-comment-list">
        {pending === "create" && <PendingComment lang={lang} />}
        {tree.map((comment) => renderComment(comment))}
        {!tree.length && (
          <div className="profile-comments-empty">
            <MessageCircle size={20} />
            <span>{pt ? "Ainda não há comentários." : "No comments yet."}</span>
          </div>
        )}
      </div>

      <Dialog.Root
        open={Boolean(reporting)}
        onOpenChange={(open) => !open && setReporting(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="report-dialog-overlay" />
          <Dialog.Content className="report-dialog profile-comment-report">
            <header>
              <div>
                <span>{pt ? "SEGURANÇA" : "SAFETY"}</span>
                <Dialog.Title>
                  {pt ? "Denunciar comentário" : "Report comment"}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                <X size={17} />
              </Dialog.Close>
            </header>
            <form onSubmit={report}>
              <label>
                {pt ? "Motivo" : "Reason"}
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                >
                  <option value="HARASSMENT">
                    {pt ? "Assédio" : "Harassment"}
                  </option>
                  <option value="HATE_SPEECH">
                    {pt ? "Discurso de ódio" : "Hate speech"}
                  </option>
                  <option value="SPAM">Spam</option>
                  <option value="CHILD_SAFETY">
                    {pt ? "Segurança infantil" : "Child safety"}
                  </option>
                  <option value="PRIVACY">
                    {pt ? "Privacidade" : "Privacy"}
                  </option>
                  <option value="OTHER">{pt ? "Outro" : "Other"}</option>
                </select>
              </label>
              <label>
                {pt ? "Detalhes (opcional)" : "Details (optional)"}
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                />
              </label>
              <button type="submit" disabled={Boolean(pending)}>
                {pending?.startsWith("report-") && (
                  <LoaderCircle className="spin" size={14} aria-hidden />
                )}
                {pt ? "Enviar denúncia" : "Submit report"}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
