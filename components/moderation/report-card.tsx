"use client";

import {
  Check,
  Clock3,
  ExternalLink,
  Flag,
  LoaderCircle,
  MessageSquareOff,
  NotebookPen,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { RelativeTime } from "@/components/relative-time";
import {
  reportContentLabel,
  reportReasonLabel,
  reportStatusLabel,
} from "@/lib/moderation";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import type {
  ModerationComment,
  ModerationProfile,
  ModerationReport,
  ModerationScreenshot,
  Removal,
} from "./types";

/**
 * One report, and everything a moderator needs to decide it.
 *
 * Its own component because its own state belongs to it: the note being typed
 * and whether the note is open are this card's business and nobody else's.
 * They used to live in two dictionaries on the console keyed by report id,
 * which is the shape state takes when the thing it describes has no component
 * of its own.
 */
export function ReportCard({
  report,
  lang,
  target,
  reporter,
  comment,
  screenshot,
  busy,
  pendingKey,
  onDecide,
  onRemove,
}: {
  report: ModerationReport;
  lang: UiLang;
  target: ModerationProfile | undefined;
  reporter: ModerationProfile | undefined;
  comment: ModerationComment | undefined;
  screenshot: ModerationScreenshot | undefined;
  busy: boolean;
  pendingKey: string | null;
  onDecide: (
    reportId: string,
    status: "REVIEWING" | "RESOLVED" | "DISMISSED",
    note: string | null,
  ) => void;
  onRemove: (removal: Removal, note: string | null) => void;
}) {
  const t = uiText(lang);
  const [note, setNote] = useState(report.moderator_note ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(report.moderator_note));

  /**
   * A draft survives a refresh; somebody else's note replaces it.
   *
   * The draft has to outlive the refresh that follows every decision on the
   * page, which is the whole reason this card owns it. But it must not outlive
   * a real change: if the server sends a note this card has not seen, whoever
   * wrote it knew something, and a stale draft sitting on top of it would be
   * read as the decision's justification.
   */
  const serverNote = report.moderator_note ?? "";
  const [lastServerNote, setLastServerNote] = useState(serverNote);
  if (serverNote !== lastServerNote) {
    setLastServerNote(serverNote);
    setNote(serverNote);
    if (serverNote) setNoteOpen(true);
  }

  // RESOLVED and DISMISSED are end states. Leaving the buttons up let a
  // moderator dismiss a report someone else had already resolved, writing a
  // second audit entry over a closed case.
  const decided = report.status === "RESOLVED" || report.status === "DISMISSED";
  const commentTable =
    report.content_type === "PROFILE_COMMENT" ||
    report.content_type === "CONTENT_COMMENT"
      ? report.content_type
      : null;
  const trimmedNote = note.trim() || null;

  return (
    <article className="moderation-report-card" data-status={report.status}>
      <header>
        <span className="moderation-report-reason">
          <Flag size={13} aria-hidden />
          {reportReasonLabel(report.reason, lang)}
        </span>
        <span className="moderation-report-kind">
          {reportContentLabel(report.content_type, lang)}
        </span>
        <span className="moderation-status-chip" data-status={report.status}>
          {reportStatusLabel(report.status, lang)}
        </span>
        <RelativeTime value={report.created_at} lang={lang} />
      </header>

      {/* Who, on one line, at the top. It was a grey panel floating in the
          right half of the card, which made every card as tall as the panel
          however little the report itself said. */}
      <p className="moderation-report-parties">
        <Party lang={lang} profile={target} role="target" />
        <span aria-hidden>·</span>
        <Party lang={lang} profile={reporter} role="reporter" />
      </p>

      <div className="moderation-report-evidence">
        {comment && (
          <blockquote data-deleted={comment.deleted_at || undefined}>
            {comment.deleted_at
              ? tri(
                  lang,
                  "Comentário removido",
                  "Deleted comment",
                  "Comentario eliminado",
                )
              : comment.body}
          </blockquote>
        )}
        {screenshot && (
          <div
            className="moderation-report-screenshot"
            data-deleted={screenshot.deletedAt || undefined}
          >
            {screenshot.deletedAt ? (
              <p>
                {tri(
                  lang,
                  "Captura removida",
                  "Screenshot removed",
                  "Captura eliminada",
                )}
              </p>
            ) : screenshot.imageUrl ? (
              <Image
                src={screenshot.imageUrl}
                alt=""
                width={Math.min(screenshot.width, 420)}
                height={Math.round(
                  (screenshot.height / screenshot.width) *
                    Math.min(screenshot.width, 420),
                )}
                unoptimized
              />
            ) : (
              <p>
                {tri(
                  lang,
                  "Prévia indisponível",
                  "Preview unavailable",
                  "Vista previa no disponible",
                )}
              </p>
            )}
            {screenshot.description && !screenshot.deletedAt && (
              <blockquote>{screenshot.description}</blockquote>
            )}
            {screenshot.containsSpoilers && !screenshot.deletedAt && (
              <small className="moderation-report-flag">
                {tri(
                  lang,
                  "Marcada como spoiler",
                  "Marked as a spoiler",
                  "Marcada como spoiler",
                )}
              </small>
            )}
          </div>
        )}
        {report.details && (
          <p className="moderation-report-details">{report.details}</p>
        )}
        {!comment && !screenshot && !report.details && (
          <p className="moderation-report-details" data-empty>
            {tri(
              lang,
              "Denúncia sem conteúdo anexado.",
              "Report with no attached content.",
              "Denuncia sin contenido adjunto.",
            )}
          </p>
        )}
      </div>

      <div className="moderation-report-links">
        {target?.username && (
          <Link href={`/${lang}/u/${target.username}`} target="_blank">
            {tri(lang, "Abrir perfil", "Open profile", "Abrir perfil")}
            <ExternalLink size={12} aria-hidden />
          </Link>
        )}
        {screenshot && !screenshot.deletedAt && (
          <Link href={`/${lang}/shot/${screenshot.publicId}`} target="_blank">
            {tri(lang, "Abrir captura", "Open screenshot", "Abrir captura")}
            <ExternalLink size={12} aria-hidden />
          </Link>
        )}
        {report.reviewed_at && (
          <span>
            {tri(lang, "Revisada", "Reviewed", "Revisada")}{" "}
            <RelativeTime value={report.reviewed_at} lang={lang} />
          </span>
        )}
      </div>

      {/* Collapsed by default: forty open textareas is what made this queue
          read as a pile instead of a list. */}
      <details
        className="moderation-report-note"
        open={noteOpen}
        onToggle={(event) => setNoteOpen(event.currentTarget.open)}
      >
        <summary>
          <NotebookPen size={13} aria-hidden />
          {tri(lang, "Nota interna", "Internal note", "Nota interna")}
          {trimmedNote && <b aria-hidden />}
        </summary>
        <textarea
          value={note}
          maxLength={1000}
          readOnly={decided}
          aria-label={tri(
            lang,
            "Nota interna da decisão",
            "Internal decision note",
            "Nota interna de la decisión",
          )}
          placeholder={tri(
            lang,
            "Fica só para a equipe, e entra na auditoria com a decisão.",
            "Stays with the team, and joins the audit log with the decision.",
            "Queda solo para el equipo, y entra en la auditoría con la decisión.",
          )}
          onChange={(event) => setNote(event.target.value)}
        />
      </details>

      <footer>
        {decided ? (
          <p className="moderation-report-decided">
            <ShieldCheck size={13} aria-hidden />
            {reportStatusLabel(report.status, lang)}
          </p>
        ) : (
          <>
            {commentTable && comment && !comment.deleted_at && (
              <button
                type="button"
                data-danger
                disabled={busy}
                onClick={() =>
                  onRemove(
                    {
                      kind: "COMMENT",
                      table: commentTable,
                      reportId: report.id,
                      commentId: comment.id,
                    },
                    trimmedNote,
                  )
                }
              >
                <MessageSquareOff size={13} aria-hidden />
                {t.removeComment}
              </button>
            )}
            {report.content_type === "SCREENSHOT" &&
              screenshot &&
              !screenshot.deletedAt && (
                <button
                  type="button"
                  data-danger
                  disabled={busy}
                  onClick={() =>
                    onRemove(
                      {
                        kind: "SCREENSHOT",
                        reportId: report.id,
                        screenshotId: screenshot.id,
                      },
                      trimmedNote,
                    )
                  }
                >
                  <Trash2 size={13} aria-hidden />
                  {tri(
                    lang,
                    "Remover captura",
                    "Remove screenshot",
                    "Quitar captura",
                  )}
                </button>
              )}
            {report.status !== "REVIEWING" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecide(report.id, "REVIEWING", trimmedNote)}
              >
                {pendingKey === `report-${report.id}-REVIEWING` ? (
                  <LoaderCircle className="spin" size={13} aria-hidden />
                ) : (
                  <Clock3 size={13} aria-hidden />
                )}
                {tri(
                  lang,
                  "Assumir análise",
                  "Start review",
                  "Tomar la revisión",
                )}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(report.id, "DISMISSED", trimmedNote)}
            >
              {pendingKey === `report-${report.id}-DISMISSED` ? (
                <LoaderCircle className="spin" size={13} aria-hidden />
              ) : (
                <X size={13} aria-hidden />
              )}
              {tri(lang, "Descartar", "Dismiss", "Descartar")}
            </button>
            <button
              type="button"
              data-primary
              disabled={busy}
              onClick={() => onDecide(report.id, "RESOLVED", trimmedNote)}
            >
              {pendingKey === `report-${report.id}-RESOLVED` ? (
                <LoaderCircle className="spin" size={13} aria-hidden />
              ) : (
                <Check size={13} aria-hidden />
              )}
              {tri(lang, "Resolver", "Resolve", "Resolver")}
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

/**
 * One side of a report, named by handle.
 *
 * The console showed display names only, and display names are not unique: a
 * queue that says a report is about "Alex" cannot tell a moderator which Alex,
 * and gives them nothing to paste into the search box. When the account is
 * gone the row says so, rather than falling back to a made-up "@usuário".
 */
function Party({
  lang,
  profile,
  role,
}: {
  lang: UiLang;
  profile: ModerationProfile | undefined;
  role: "target" | "reporter";
}) {
  const label =
    role === "target"
      ? tri(lang, "Alvo", "Target", "Objetivo")
      : tri(lang, "De", "From", "De");
  return (
    <span className="moderation-report-party" data-role={role}>
      <UserRound size={12} aria-hidden />
      <b>{label}</b>
      {profile?.username ? (
        <Link href={`/${lang}/u/${profile.username}`} target="_blank">
          @{profile.username}
        </Link>
      ) : (
        <i>
          {tri(lang, "conta removida", "account deleted", "cuenta eliminada")}
        </i>
      )}
    </span>
  );
}
