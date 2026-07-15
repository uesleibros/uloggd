"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Flag, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
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
}: {
  profileId: string;
  viewerId: string | null;
  username: string;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const [reason, setReason] =
    useState<(typeof reasons)[number]>("IMPERSONATION");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  return (
    <div className="profile-secondary-actions">
      <ShareButton
        className="quiet-icon-action"
        title={`@${username} · uloggd`}
        text={pt ? "Veja este perfil no uloggd" : "See this profile on uloggd"}
        label={pt ? "Compartilhar" : "Share"}
        copiedLabel={pt ? "Link copiado" : "Link copied"}
      />
      {viewerId !== profileId &&
        (viewerId ? (
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="quiet-icon-action" type="button">
                <Flag size={15} />
                <span>{pt ? "Denunciar" : "Report"}</span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="social-editor-overlay" />
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
    </div>
  );
}
