"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Ban, Flag, LoaderCircle, ShieldOff, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShareButton } from "./share-button";

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
  lang: "pt-BR" | "en";
  viewerBlocked?: boolean;
  blockedByTarget?: boolean;
}) {
  const pt = lang === "pt-BR";
  const [reason, setReason] =
    useState<(typeof reasons)[number]>("IMPERSONATION");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockPending, setBlockPending] = useState(false);
  const router = useRouter();
  const labels: Record<(typeof reasons)[number], string> = {
    IMPERSONATION: pt ? "Falsa identidade" : "Impersonation",
    HARASSMENT: pt ? "Assédio" : "Harassment",
    HATE_SPEECH: pt ? "Discurso de ódio" : "Hate speech",
    SPAM: "Spam",
    PRIVACY: pt ? "Privacidade" : "Privacy",
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
  return (
    <div className="profile-secondary-actions">
      <ShareButton
        className="quiet-icon-action"
        title={`@${username} · uloggd`}
        text={pt ? "Veja este perfil no uloggd" : "See this profile on uloggd"}
        label={pt ? "Compartilhar" : "Share"}
        copiedLabel={pt ? "Link copiado" : "Link copied"}
        lang={lang}
      />
      {viewerId !== profileId &&
        !viewerBlocked &&
        !blockedByTarget &&
        (viewerId ? (
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="quiet-icon-action" type="button">
                <Flag size={15} />
                <span>{pt ? "Denunciar" : "Report"}</span>
              </button>
            </Dialog.Trigger>
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
                  <Dialog.Close>
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
        ) : (
          <Link
            className="quiet-icon-action"
            href={`/${lang}/login?next=/${lang}/u/${username}`}
          >
            <Flag size={15} />
            <span>{pt ? "Denunciar" : "Report"}</span>
          </Link>
        ))}
      {viewerId && viewerId !== profileId && !blockedByTarget && (
        <Dialog.Root open={blockOpen} onOpenChange={setBlockOpen}>
          <Dialog.Trigger asChild>
            <button className="quiet-icon-action" type="button">
              {viewerBlocked ? <ShieldOff size={15} /> : <Ban size={15} />}
              <span>
                {viewerBlocked
                  ? pt
                    ? "Desbloquear"
                    : "Unblock"
                  : pt
                    ? "Bloquear"
                    : "Block"}
              </span>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="recent-unfollow-overlay" />
            <Dialog.Content className="recent-unfollow-dialog block-profile-dialog">
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
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
                <Dialog.Close disabled={blockPending}>
                  {pt ? "Cancelar" : "Cancel"}
                </Dialog.Close>
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
      )}
      {error && (
        <span className="profile-action-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
