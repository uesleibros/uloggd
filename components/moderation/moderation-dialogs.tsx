"use client";

import {
  Ban,
  Camera,
  Check,
  ChevronDown,
  LoaderCircle,
  MessageSquareOff,
  X,
} from "lucide-react";
import { useState } from "react";
import * as Dialog from "@/components/ui/dialog";
import * as Select from "@/components/ui/select";
import { VerifiedMark } from "@/components/verified-badge";
import { MODERATION_BAN_DURATIONS } from "@/lib/moderation";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import type {
  ModerationBan,
  ModerationProfile,
  ProfileAction,
  Removal,
} from "./types";

async function moderate(body: Record<string, unknown>) {
  const answer = await fetch("/api/moderation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { refused: !answer.ok };
}

/**
 * The two confirmations, and the only two places the console writes a reason.
 *
 * Both were inlined at the bottom of the console, three hundred lines below
 * the state they read. Together here because they are the same shape: a
 * sentence about what is permanent, a reason, and one button that cannot be
 * pressed until the reason is good enough.
 */
export function ModerationDialogs({
  lang,
  actorRole,
  profileTarget,
  removal,
  pending,
  error,
  onClose,
  onProfileDone,
  onBanChanged,
  onRemovalDone,
  setPending,
  setError,
}: {
  lang: UiLang;
  actorRole: "MODERATOR" | "ADMIN";
  profileTarget: { profile: ModerationProfile; action: ProfileAction } | null;
  removal: { removal: Removal; note: string | null } | null;
  pending: string | null;
  error: string | null;
  onClose: () => void;
  onProfileDone: (profile: ModerationProfile, action: ProfileAction) => void;
  onBanChanged: (profileId: string, ban: ModerationBan | null) => void;
  onRemovalDone: (reportId: string, note: string | null) => void;
  setPending: (value: string | null) => void;
  setError: (value: string | null) => void;
}) {
  const t = uiText(lang);
  // The drafts belong to the thing being decided, so they are keyed to it and
  // arrive fresh. Resetting them on open instead is how a reason written for
  // one account ends up in the audit log against another.
  const profileKey = profileTarget
    ? `${profileTarget.profile.id}:${profileTarget.action}`
    : "none";
  const removalKey = removal
    ? removal.removal.kind === "COMMENT"
      ? removal.removal.commentId
      : removal.removal.screenshotId
    : "none";
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("7");
  const [draftFor, setDraftFor] = useState("none");

  // One assignment during render, not in an effect: React re-renders with the
  // new value straight away instead of painting the old draft first.
  const activeKey = profileTarget ? profileKey : removal ? removalKey : "none";
  if (activeKey !== draftFor) {
    setDraftFor(activeKey);
    setReason(removal && !profileTarget ? (removal.note ?? "") : "");
    setDuration("7");
  }

  const busy = Boolean(pending);
  const action = profileTarget?.action;
  // A ban and an unban both go in the log forever, so both have to say why.
  // Verifying does not: the badge is its own evidence.
  const reasonRequired =
    action === "BAN" || action === "UNBAN" || action === "DEMOTE_ORGANIZATION";
  const reasonShort = reason.trim().length < 3;

  async function confirmProfile() {
    if (!profileTarget || busy) return;
    if (reasonRequired && reasonShort) return;
    setPending(`profile-${profileTarget.profile.id}`);
    setError(null);
    const days =
      profileTarget.action === "BAN" && duration !== "permanent"
        ? Number(duration)
        : null;
    const { refused } = await moderate({
      do: "profile",
      profile: profileTarget.profile.id,
      action: profileTarget.action,
      reason: reason.trim() || null,
      duration_days: days,
    });
    if (refused) {
      setError(
        tri(
          lang,
          "A ação foi recusada. Verifique sua permissão e o motivo.",
          "The action was refused. Check your permission and reason.",
          "La acción fue rechazada. Revisa tu permiso y el motivo.",
        ),
      );
      setPending(null);
      return;
    }
    if (profileTarget.action === "BAN") {
      onBanChanged(profileTarget.profile.id, {
        profile_id: profileTarget.profile.id,
        banned_at: new Date().toISOString(),
        banned_until: days
          ? new Date(Date.now() + days * 86_400_000).toISOString()
          : null,
        reason: reason.trim(),
      });
    } else if (profileTarget.action === "UNBAN") {
      onBanChanged(profileTarget.profile.id, null);
    }
    onProfileDone(profileTarget.profile, profileTarget.action);
    setPending(null);
    onClose();
  }

  async function confirmRemoval() {
    if (!removal || busy) return;
    const clean = reason.trim() || null;
    const one = removal.removal;
    setPending(
      one.kind === "COMMENT"
        ? `comment-${one.commentId}`
        : `screenshot-${one.screenshotId}`,
    );
    setError(null);
    const { refused } = await moderate(
      one.kind === "COMMENT"
        ? {
            do: "comment",
            comment: one.commentId,
            table: one.table,
            report: one.reportId,
            reason: clean,
          }
        : {
            do: "screenshot",
            screenshot: one.screenshotId,
            report: one.reportId,
            reason: clean,
          },
    );
    if (refused) {
      setError(
        one.kind === "COMMENT"
          ? tri(
              lang,
              "Não foi possível remover o comentário.",
              "Could not remove the comment.",
              "No se pudo quitar el comentario.",
            )
          : tri(
              lang,
              "Não foi possível remover a captura.",
              "Could not remove the screenshot.",
              "No se pudo quitar la captura.",
            ),
      );
      setPending(null);
      return;
    }
    onRemovalDone(one.reportId, clean);
    setPending(null);
    onClose();
  }

  function actionTitle(one: ProfileAction) {
    if (one === "BAN") return tri(lang, "Banir", "Ban", "Banear");
    if (one === "UNBAN") return tri(lang, "Desbanir", "Unban", "Desbanear");
    if (one === "VERIFY") return tri(lang, "Verificar", "Verify", "Verificar");
    if (one === "DEMOTE_ORGANIZATION")
      return tri(
        lang,
        "Revogar organização",
        "Revoke organization",
        "Revocar organización",
      );
    return tri(
      lang,
      "Retirar verificação",
      "Remove verification",
      "Quitar verificación",
    );
  }

  const durations = [
    ...MODERATION_BAN_DURATIONS.map(
      ({ value, days }) =>
        [
          value,
          tri(
            lang,
            `${days} ${days === 1 ? "dia" : "dias"}`,
            `${days} ${days === 1 ? "day" : "days"}`,
            `${days} ${days === 1 ? "día" : "días"}`,
          ),
        ] as const,
    ),
    // Only an admin can end an account for good.
    ...(actorRole === "ADMIN"
      ? ([
          ["permanent", tri(lang, "Permanente", "Permanent", "Permanente")],
        ] as const)
      : []),
  ];

  return (
    <>
      <Dialog.Root
        open={Boolean(profileTarget)}
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="moderation-dialog-overlay" />
          <Dialog.Content className="moderation-dialog">
            <header>
              <span data-danger={action === "BAN" || undefined}>
                {action === "BAN" || action === "UNBAN" ? (
                  <Ban size={18} aria-hidden />
                ) : (
                  <VerifiedMark size={18} />
                )}
              </span>
              <div>
                <Dialog.Title>
                  {profileTarget ? actionTitle(profileTarget.action) : ""}
                </Dialog.Title>
                <Dialog.Description>
                  {profileTarget
                    ? `@${profileTarget.profile.username ?? "?"}`
                    : ""}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={t.close} disabled={busy}>
                <X size={17} aria-hidden />
              </Dialog.Close>
            </header>

            {action === "BAN" && (
              <div className="moderation-field">
                <span id="moderation-duration-label">
                  {tri(lang, "Duração", "Duration", "Duración")}
                </span>
                <Select.Root value={duration} onValueChange={setDuration}>
                  <Select.Trigger
                    className="moderation-select-trigger"
                    aria-labelledby="moderation-duration-label"
                  >
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} aria-hidden />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="moderation-select-content"
                      position="popper"
                      sideOffset={6}
                      collisionPadding={12}
                    >
                      <Select.Viewport>
                        {durations.map(([value, label]) => (
                          <Select.Item
                            className="moderation-select-item"
                            value={value}
                            key={value}
                          >
                            <Select.ItemText>{label}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check size={13} aria-hidden />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}

            <label className="moderation-field">
              <span>
                {reasonRequired
                  ? tri(lang, "Motivo", "Reason", "Motivo")
                  : tri(
                      lang,
                      "Motivo (opcional)",
                      "Reason (optional)",
                      "Motivo (opcional)",
                    )}
              </span>
              <textarea
                value={reason}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                placeholder={tri(
                  lang,
                  "Fica na auditoria para sempre, com seu nome.",
                  "Stays in the audit log forever, under your name.",
                  "Queda en la auditoría para siempre, con tu nombre.",
                )}
              />
              {reasonRequired && reasonShort && (
                <small>
                  {tri(
                    lang,
                    "Pelo menos 3 caracteres.",
                    "At least 3 characters.",
                    "Al menos 3 caracteres.",
                  )}
                </small>
              )}
            </label>

            {error && (
              <p className="moderation-dialog-error" role="alert">
                {error}
              </p>
            )}

            <footer>
              <Dialog.Close disabled={busy}>{t.cancel}</Dialog.Close>
              <button
                type="button"
                data-danger={action === "BAN" || undefined}
                data-primary={action !== "BAN" || undefined}
                disabled={busy || (reasonRequired && reasonShort)}
                onClick={() => void confirmProfile()}
              >
                {busy && (
                  <LoaderCircle className="spin" size={14} aria-hidden />
                )}
                {busy
                  ? t.applying
                  : tri(lang, "Confirmar", "Confirm", "Confirmar")}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(removal)}
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="moderation-dialog-overlay" />
          <Dialog.Content className="moderation-dialog">
            <header>
              <span data-danger>
                {removal?.removal.kind === "SCREENSHOT" ? (
                  <Camera size={18} aria-hidden />
                ) : (
                  <MessageSquareOff size={18} aria-hidden />
                )}
              </span>
              <div>
                <Dialog.Title>
                  {removal?.removal.kind === "SCREENSHOT"
                    ? tri(
                        lang,
                        "Remover captura",
                        "Remove screenshot",
                        "Quitar captura",
                      )
                    : t.removeComment}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    "O autor é avisado, e a denúncia é dada por resolvida.",
                    "The author is notified, and the report is marked resolved.",
                    "Se avisa al autor, y la denuncia queda resuelta.",
                  )}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={t.close} disabled={busy}>
                <X size={17} aria-hidden />
              </Dialog.Close>
            </header>

            <label className="moderation-field">
              <span>
                {tri(
                  lang,
                  "Motivo (opcional)",
                  "Reason (optional)",
                  "Motivo (opcional)",
                )}
              </span>
              <textarea
                value={reason}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                placeholder={tri(
                  lang,
                  "Explique por que o conteúdo saiu do ar…",
                  "Explain why the content came down…",
                  "Explica por qué se retiró el contenido…",
                )}
              />
            </label>

            {error && (
              <p className="moderation-dialog-error" role="alert">
                {error}
              </p>
            )}

            <footer>
              <Dialog.Close disabled={busy}>{t.cancel}</Dialog.Close>
              <button
                type="button"
                data-danger
                disabled={busy}
                onClick={() => void confirmRemoval()}
              >
                {busy && (
                  <LoaderCircle className="spin" size={14} aria-hidden />
                )}
                {busy ? t.removing : t.remove}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
