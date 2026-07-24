"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Select from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  CornerDownRight,
  Flag,
  Link2,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  UserRoundX,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportReasonIcon } from "@/lib/report-reasons";
import { VerifiedMark } from "@/components/verified-badge";
import {
  commentErrorMessage,
  buildCommentTree,
  CommentArticle,
  CommentInlineForm,
  CommentLike,
  CommunityTextArea,
  PendingComment,
} from "./comment-parts";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export type ProfileComment = {
  id: string;
  public_id: string;
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
    verified: boolean;
  };
};

type CommentNode = ProfileComment & { replies: CommentNode[] };

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
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const router = useRouter();
  const tree = useMemo(
    () => buildCommentTree(comments) as CommentNode[],
    [comments],
  );
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
  const [removedReplyNotice, setRemovedReplyNotice] = useState(false);
  const [copiedComment, setCopiedComment] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<ProfileComment | null>(null);
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

  async function createComment(content: string, parentId: string | null) {
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
      if (
        parentId &&
        (createError.message.includes("parent comment removed") ||
          createError.message.includes("parent comment not found"))
      ) {
        setReplyTo(null);
        setReplyBody("");
        setRemovedReplyNotice(true);
        router.refresh();
      } else setError(commentErrorMessage(createError.message, lang));
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

  async function updateComment(commentId: string) {
    if (!editBody.trim() || pending) return;
    setPending(`edit-${commentId}`);
    setError(null);
    const { error: updateError } = await createClient().rpc(
      "update_profile_comment",
      { target_comment: commentId, comment_body: editBody },
    );
    if (updateError) setError(commentErrorMessage(updateError.message, lang));
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
      setError(
        tri(
          lang,
          "Não foi possível excluir.",
          "Could not delete.",
          "No se pudo eliminar.",
        ),
      );
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
        tri(
          lang,
          "Não foi possível enviar a denúncia.",
          "Could not send report.",
          "No se pudo enviar la denuncia.",
        ),
      );
    else {
      setReporting(null);
      setReportDetails("");
    }
    setPending(null);
  }

  async function copyCommentLink(commentId: string, publicId: string) {
    try {
      const url = new URL(window.location.href);
      url.hash = `comment-${publicId}`;
      await navigator.clipboard.writeText(url.toString());
      setCopiedComment(commentId);
      window.setTimeout(
        () =>
          setCopiedComment((current) =>
            current === commentId ? null : current,
          ),
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

  async function blockCommentAuthor() {
    if (!blocking || pending) return;
    setPending(`block-${blocking.author_id}`);
    setError(null);
    const { error: blockError } = await createClient().rpc("block_profile", {
      target_profile: blocking.author_id,
    });
    if (blockError) {
      setError(
        tri(
          lang,
          "Não foi possível bloquear este usuário.",
          "Could not block this user.",
          "No se pudo bloquear a este usuario.",
        ),
      );
    } else {
      setBlocking(null);
      router.refresh();
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
      setError(commentErrorMessage(likeError.message, lang));
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
        data-has-replies={comment.replies.length > 0 || undefined}
        key={comment.id}
      >
        <CommentArticle
          id={comment.public_id}
          trunk={comment.replies.length > 0}
          deleted={deleted}
          lang={lang}
          username={comment.author.username}
          name={name}
          avatarUrl={comment.author.avatar_url}
          createdAt={comment.created_at}
          edited={edited}
          badge={comment.author.verified ? <VerifiedMark size={13} /> : null}
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
                onSubmit={() => void updateComment(comment.id)}
              />
            ) : null
          }
          actions={
            !editing ? (
              <footer className="profile-comment-actions">
                {!deleted && (
                  <CommentLike
                    lang={lang}
                    count={commentLike.count}
                    liked={commentLike.liked}
                    canLike={
                      Boolean(viewerId) && viewerId !== comment.author_id
                    }
                    pending={commentLike.pending}
                    onToggle={() => void toggleLike(comment)}
                  />
                )}
                {canComment && !deleted && (
                  <button
                    className="profile-comment-reply-action"
                    type="button"
                    onClick={() => startReply(comment)}
                  >
                    <CornerDownRight size={13} /> {t.reply}
                  </button>
                )}
                {isAuthor && !deleted && (
                  <button type="button" onClick={() => startEdit(comment)}>
                    <Pencil size={13} /> {t.edit}
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
                {!deleted && (
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
                        {viewerId && viewerId !== comment.author_id && (
                          <>
                            <DropdownMenu.Item
                              onSelect={() => setReporting(comment)}
                            >
                              <Flag size={14} />
                              {tri(
                                lang,
                                "Denunciar comentário",
                                "Report comment",
                                "Denunciar comentario",
                              )}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              data-danger
                              onSelect={() => setBlocking(comment)}
                            >
                              <UserRoundX size={14} />
                              {tri(
                                lang,
                                "Bloquear usuário",
                                "Block user",
                                "Bloquear usuario",
                              )}
                            </DropdownMenu.Item>
                          </>
                        )}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                )}
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
            onSubmit={() => void createComment(replyBody, comment.id)}
          />
        )}
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
            <MessageCircle size={16} /> {t.comments}
          </h2>
          <p>
            {tri(
              lang,
              "Converse com respeito. Respostas, edições e denúncias ficam na mesma conversa.",
              "Keep it respectful. Replies, edits, and reports stay in the same conversation.",
              "Conversa con respeto. Respuestas, ediciones y denuncias quedan en la misma conversación.",
            )}
          </p>
        </div>
        <span>{comments.filter((comment) => !comment.deleted_at).length}</span>
      </header>

      {canComment && (
        <form
          className="profile-comment-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void createComment(body, null);
          }}
        >
          <CommunityTextArea
            id="profile-comment-body"
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
            onChange={setBody}
            action={
              <button type="submit" disabled={!body.trim() || Boolean(pending)}>
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
      )}

      {!canComment && (
        <p className="profile-comments-notice">
          {commentsClosed
            ? tri(
                lang,
                "Os comentários estão desativados neste perfil.",
                "Comments are disabled on this profile.",
                "Los comentarios están desactivados en este perfil.",
              )
            : viewerId
              ? tri(
                  lang,
                  "Somente seguidores podem comentar neste perfil.",
                  "Only followers can comment on this profile.",
                  "Solo los seguidores pueden comentar en este perfil.",
                )
              : tri(
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
        {tree.map((comment) => renderComment(comment))}
        {!tree.length && (
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

      <Dialog.Root
        open={Boolean(reporting)}
        onOpenChange={(open) => !open && setReporting(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="report-dialog-overlay" />
          <Dialog.Content className="report-dialog profile-comment-report">
            <header>
              <div>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Denunciar comentário",
                    "Report comment",
                    "Denunciar comentario",
                  )}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={17} />
              </Dialog.Close>
            </header>
            <form onSubmit={report}>
              <label>
                {tri(lang, "Motivo", "Reason", "Motivo")}
                <Select.Root
                  value={reportReason}
                  onValueChange={setReportReason}
                >
                  <Select.Trigger className="editor-select-trigger">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="editor-select-menu"
                      position="popper"
                      sideOffset={6}
                      collisionPadding={12}
                    >
                      <Select.Viewport>
                        {[
                          [
                            "HARASSMENT",
                            tri(lang, "Assédio", "Harassment", "Acoso"),
                          ],
                          [
                            "HATE_SPEECH",
                            tri(
                              lang,
                              "Discurso de ódio",
                              "Hate speech",
                              "Discurso de odio",
                            ),
                          ],
                          ["SPAM", "Spam"],
                          [
                            "CHILD_SAFETY",
                            tri(
                              lang,
                              "Segurança infantil",
                              "Child safety",
                              "Seguridad infantil",
                            ),
                          ],
                          ["PRIVACY", t.privacy],
                          ["OTHER", tri(lang, "Outro", "Other", "Otro")],
                        ].map(([value, label]) => {
                          const Icon = reportReasonIcon(value);
                          return (
                            <Select.Item
                              className="editor-select-option"
                              value={value}
                              key={value}
                            >
                              <Icon size={14} />
                              <Select.ItemText>{label}</Select.ItemText>
                              <Select.ItemIndicator>
                                <Check size={13} />
                              </Select.ItemIndicator>
                            </Select.Item>
                          );
                        })}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </label>
              <label>
                {tri(
                  lang,
                  "Detalhes (opcional)",
                  "Details (optional)",
                  "Detalles (opcional)",
                )}
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
                {tri(
                  lang,
                  "Enviar denúncia",
                  "Submit report",
                  "Enviar denuncia",
                )}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={removedReplyNotice}
        onOpenChange={setRemovedReplyNotice}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="report-dialog-overlay" />
          <Dialog.Content className="report-dialog profile-comment-report">
            <header>
              <div>
                <span>
                  {tri(
                    lang,
                    "CONVERSA ATUALIZADA",
                    "THREAD UPDATED",
                    "CONVERSACIÓN ACTUALIZADA",
                  )}
                </span>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Não é mais possível responder",
                    "This comment can no longer receive replies",
                    "Este comentario ya no admite respuestas",
                  )}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={17} />
              </Dialog.Close>
            </header>
            <div className="profile-comment-removed-notice">
              <Trash2 size={20} />
              <p>
                {tri(
                  lang,
                  "O comentário foi removido enquanto você escrevia. Conteúdos removidos não podem receber novas respostas.",
                  "The comment was removed while you were writing. Removed content cannot receive new replies.",
                  "El comentario se eliminó mientras escribías. El contenido eliminado no admite nuevas respuestas.",
                )}
              </p>
              <Dialog.Close>
                {tri(lang, "Entendi", "Got it", "Entendido")}
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(blocking)}
        onOpenChange={(open) => !open && !pending && setBlocking(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="report-dialog-overlay" />
          <Dialog.Content className="report-dialog profile-comment-report">
            <header>
              <div>
                <Dialog.Title>
                  {pt
                    ? `Bloquear @${blocking?.author.username ?? ""}?`
                    : `Block @${blocking?.author.username ?? ""}?`}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={17} />
              </Dialog.Close>
            </header>
            <div className="profile-comment-removed-notice">
              <UserRoundX size={20} />
              <p>
                {tri(
                  lang,
                  "Vocês deixarão de se seguir e não poderão ver o conteúdo nem interagir um com o outro.",
                  "You will unfollow each other and will no longer see or interact with each other's content.",
                  "Dejaréis de seguiros y no podréis ver el contenido ni interactuar entre vosotros.",
                )}
              </p>
              <footer>
                <Dialog.Close disabled={Boolean(pending)}>
                  {t.cancel}
                </Dialog.Close>
                <button
                  type="button"
                  data-danger
                  disabled={Boolean(pending)}
                  onClick={() => void blockCommentAuthor()}
                >
                  {pending?.startsWith("block-") && (
                    <LoaderCircle className="spin" size={14} />
                  )}
                  {pending?.startsWith("block-")
                    ? tri(lang, "Bloqueando…", "Blocking…", "Bloqueando…")
                    : t.block}
                </button>
              </footer>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
