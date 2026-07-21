"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Ban,
  Flag,
  LoaderCircle,
  MoreHorizontal,
  Share2,
  ShieldOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShareButton } from "./share-button";
import { uiText, type UiLang } from "@/lib/ui-text";

const reasons = [
  "IMPERSONATION",
  "HARASSMENT",
  "HATE_SPEECH",
  "SPAM",
  "PRIVACY",
  "OTHER",
] as const;

export function ProfileActions({
  profileId,
  viewerId,
  username,
  lang,
  viewerBlocked = false,
  blockedByTarget = false,
}: {
  profileId: string;
  viewerId: string | null;
  username: string;
  lang: UiLang;
  viewerBlocked?: boolean;
  blockedByTarget?: boolean;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const [reason, setReason] =
    useState<(typeof reasons)[number]>("IMPERSONATION");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockPending, setBlockPending] = useState(false);
  const router = useRouter();

  const isSelf = viewerId === profileId;
  const canReport = !isSelf && !viewerBlocked && !blockedByTarget;
  const canBlock = Boolean(viewerId) && !isSelf && !blockedByTarget;

  const labels: Record<(typeof reasons)[number], string> = {
    IMPERSONATION: pt ? "Falsa identidade" : "Impersonation",
    HARASSMENT: pt ? "Assédio" : "Harassment",
    HATE_SPEECH: pt ? "Discurso de ódio" : "Hate speech",
    SPAM: "Spam",
    PRIVACY: t.privacy,
    OTHER: pt ? "Outro" : "Other",
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!viewerId) return;
    setPending(true);
    setError(null);
    const { error: actionError } = await createClient()
      .from("reports")
      .insert({
        reporter_id: viewerId,
        target_profile_id: profileId,
        content_type: "PROFILE",
        reason,
        details: details.trim() || null,
      });
    if (actionError)
      setError(
        pt
          ? "Não foi possível enviar a denúncia."
          : "Could not submit the report.",
      );
    else setSent(true);
    setPending(false);
  }

  async function updateBlock() {
    if (!viewerId || blockPending) return;
    setBlockPending(true);
    const { error: actionError } = await createClient().rpc(
      viewerBlocked ? "unblock_profile" : "block_profile",
      { target_profile: profileId },
    );
    if (actionError)
      setError(
        pt
          ? "Não foi possível atualizar o bloqueio."
          : "Could not update the block.",
      );
    else {
      setBlockOpen(false);
      router.refresh();
    }
    setBlockPending(false);
  }

  // Reporting needs an account; signed-out visitors are sent to log in first.
  function openReport() {
    if (viewerId) setReportOpen(true);
    else router.push(`/${lang}/login?next=/${lang}/u/${username}`);
  }

  return (
    <div className="profile-secondary-actions">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="profile-more-trigger"
            type="button"
            aria-label={pt ? "Mais ações" : "More actions"}
          >
            <MoreHorizontal size={17} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="profile-more-menu"
            align="end"
            sideOffset={7}
            collisionPadding={12}
          >
            <DropdownMenu.Item onSelect={() => setShareOpen(true)}>
              <Share2 size={15} />
              {t.share}
            </DropdownMenu.Item>
            {canReport && (
              <DropdownMenu.Item onSelect={openReport}>
                <Flag size={15} />
                {pt ? "Denunciar" : "Report"}
              </DropdownMenu.Item>
            )}
            {canBlock && (
              <>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  data-danger={!viewerBlocked || undefined}
                  onSelect={() => setBlockOpen(true)}
                >
                  {viewerBlocked ? <ShieldOff size={15} /> : <Ban size={15} />}
                  {viewerBlocked
                    ? pt
                      ? "Desbloquear"
                      : "Unblock"
                    : pt
                      ? "Bloquear"
                      : "Block"}
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ShareButton
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={`@${username} · uloggd`}
        text={pt ? "Veja este perfil no uloggd" : "See this profile on uloggd"}
        label={t.share}
        copiedLabel={t.linkCopied}
        lang={lang}
      />

      <Dialog.Root open={reportOpen} onOpenChange={setReportOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="report-dialog-overlay" />
          <Dialog.Content className="report-dialog">
            <header>
              <div>
                <span>{pt ? "SEGURANÇA" : "SAFETY"}</span>
                <Dialog.Title>
                  {pt ? `Denunciar @${username}` : `Report @${username}`}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={17} />
              </Dialog.Close>
            </header>
            {sent ? (
              <div className="report-success">
                <Flag size={22} />
                <strong>{pt ? "Denúncia enviada" : "Report sent"}</strong>
                <p>
                  {pt
                    ? "A moderação analisará as informações."
                    : "Moderation will review the information."}
                </p>
              </div>
            ) : (
              <form onSubmit={submit}>
                <fieldset>
                  <legend>{pt ? "Motivo" : "Reason"}</legend>
                  {reasons.map((item) => (
                    <label key={item}>
                      <input
                        type="radio"
                        name="reason"
                        checked={reason === item}
                        onChange={() => setReason(item)}
                      />
                      {labels[item]}
                    </label>
                  ))}
                </fieldset>
                <label>
                  {pt ? "Detalhes (opcional)" : "Details (optional)"}
                  <textarea
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    maxLength={1000}
                    rows={4}
                  />
                </label>
                {error && <p role="alert">{error}</p>}
                <button type="submit" disabled={pending}>
                  {pending && <LoaderCircle className="spin" size={15} />}
                  {pt ? "Enviar denúncia" : "Submit report"}
                </button>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={blockOpen} onOpenChange={setBlockOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="recent-unfollow-overlay" />
          <Dialog.Content className="recent-unfollow-dialog block-profile-dialog">
            <Dialog.Close aria-label={t.close}>
              <X size={17} />
            </Dialog.Close>
            <span className="recent-unfollow-mark" aria-hidden>
              <Ban size={20} />
            </span>
            <Dialog.Title>
              {viewerBlocked
                ? pt
                  ? `Desbloquear @${username}?`
                  : `Unblock @${username}?`
                : pt
                  ? `Bloquear @${username}?`
                  : `Block @${username}?`}
            </Dialog.Title>
            <Dialog.Description>
              {viewerBlocked
                ? pt
                  ? "Essa pessoa poderá encontrar e interagir com você novamente. Seguir não será restaurado automaticamente."
                  : "This person will be able to find and interact with you again. Follows will not be restored automatically."
                : pt
                  ? "Vocês deixarão de se seguir. A pessoa não poderá seguir, comentar ou interagir com você, e não será avisada."
                  : "You will unfollow each other. They will not be able to follow, comment, or interact with you, and will not be notified."}
            </Dialog.Description>
            <footer>
              <Dialog.Close disabled={blockPending}>{t.cancel}</Dialog.Close>
              <button
                type="button"
                disabled={blockPending}
                onClick={() => void updateBlock()}
              >
                {blockPending && (
                  <LoaderCircle className="spin" size={15} aria-hidden />
                )}
                {viewerBlocked
                  ? pt
                    ? "Desbloquear"
                    : "Unblock"
                  : pt
                    ? "Bloquear"
                    : "Block"}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {error && !reportOpen && !blockOpen && (
        <span className="profile-action-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
