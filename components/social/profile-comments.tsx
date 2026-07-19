"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Flag,
  LoaderCircle,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProfileComment = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

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
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<ProfileComment | null>(null);
  const [reportReason, setReportReason] = useState("HARASSMENT");
  const [reportDetails, setReportDetails] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || pending) return;
    setPending("create");
    setError(null);
    const { error: actionError } = await createClient().rpc(
      "create_profile_comment",
      { target_profile: profileId, comment_body: body },
    );
    if (actionError) {
      setError(
        actionError.message.includes("rate")
          ? pt
            ? "Você comentou muitas vezes. Aguarde um pouco."
            : "You are commenting too quickly. Please wait."
          : pt
            ? "Não foi possível publicar este comentário."
            : "Could not publish this comment.",
      );
    } else {
      setBody("");
      router.refresh();
    }
    setPending(null);
  }

  async function remove(comment: ProfileComment) {
    if (pending) return;
    setPending(comment.id);
    setError(null);
    const { error: actionError } = await createClient()
      .from("profile_comments")
      .delete()
      .eq("id", comment.id);
    if (actionError)
      setError(pt ? "Não foi possível excluir." : "Could not delete.");
    else router.refresh();
    setPending(null);
  }

  async function report(event: React.FormEvent) {
    event.preventDefault();
    if (!viewerId || !reporting || pending) return;
    setPending(`report-${reporting.id}`);
    setError(null);
    const { error: actionError } = await createClient()
      .from("reports")
      .insert({
        reporter_id: viewerId,
        target_profile_id: reporting.author_id,
        content_type: "PROFILE_COMMENT",
        content_id: reporting.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
    if (actionError)
      setError(
        pt ? "Não foi possível enviar a denúncia." : "Could not send report.",
      );
    else {
      setReporting(null);
      setReportDetails("");
    }
    setPending(null);
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
              ? "Converse com respeito. Comentários podem ser denunciados e removidos."
              : "Keep it respectful. Comments can be reported and removed."}
          </p>
        </div>
        <span>{comments.length}</span>
      </header>

      {canComment && (
        <form className="profile-comment-composer" onSubmit={submit}>
          <label htmlFor="profile-comment-body">
            {pt ? "Escreva um comentário" : "Write a comment"}
          </label>
          <textarea
            id="profile-comment-body"
            value={body}
            maxLength={500}
            rows={3}
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
        {comments.map((comment) => {
          const name =
            comment.author.display_name || `@${comment.author.username}`;
          const canDelete =
            viewerId === comment.author_id || viewerId === profileId;
          return (
            <article key={comment.id}>
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
              <div>
                <header>
                  <Link href={`/${lang}/u/${comment.author.username}`}>
                    {name}
                  </Link>
                  <time dateTime={comment.created_at}>
                    {new Intl.DateTimeFormat(lang, {
                      dateStyle: "medium",
                    }).format(new Date(comment.created_at))}
                  </time>
                </header>
                <p>{comment.body}</p>
                {(canDelete ||
                  (viewerId && viewerId !== comment.author_id)) && (
                  <footer>
                    {canDelete && (
                      <button
                        type="button"
                        disabled={Boolean(pending)}
                        onClick={() => void remove(comment)}
                      >
                        {pending === comment.id ? (
                          <LoaderCircle
                            className="spin"
                            size={13}
                            aria-hidden
                          />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        {pt ? "Excluir" : "Delete"}
                      </button>
                    )}
                    {viewerId && viewerId !== comment.author_id && (
                      <button
                        type="button"
                        onClick={() => setReporting(comment)}
                      >
                        <Flag size={13} /> {pt ? "Denunciar" : "Report"}
                      </button>
                    )}
                  </footer>
                )}
              </div>
            </article>
          );
        })}
        {!comments.length && (
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
                  rows={3}
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
