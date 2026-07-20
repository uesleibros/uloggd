"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiText } from "@/lib/ui-text";

export function DeleteAccount({
  username,
  lang,
}: {
  username: string;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const expected = `@${username}`;
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = confirmation.trim() === expected && understood && !pending;

  function reset() {
    if (pending) return;
    setOpen(false);
    setConfirmation("");
    setUnderstood(false);
    setError(null);
  }

  async function removeAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (result.error === "mfa_required") {
          setError(
            pt
              ? "Confirme a verificação em duas etapas e tente novamente."
              : "Complete two-factor authentication and try again.",
          );
        } else if (result.error === "confirmation_mismatch") {
          setError(
            pt
              ? `Digite exatamente ${expected} para confirmar.`
              : `Enter ${expected} exactly to confirm.`,
          );
        } else {
          setError(
            pt
              ? "Não foi possível apagar sua conta agora. Tente novamente."
              : "Your account could not be deleted right now. Try again.",
          );
        }
        setPending(false);
        return;
      }
      await createClient().auth.signOut({ scope: "local" });
      window.location.replace(`/${lang}`);
    } catch {
      setError(
        pt
          ? "A conexão falhou. Confira sua internet e tente novamente."
          : "The connection failed. Check your internet and try again.",
      );
      setPending(false);
    }
  }

  return (
    <section className="settings-danger-zone">
      <div className="settings-danger-copy">
        <span aria-hidden="true">
          <Trash2 size={20} />
        </span>
        <div>
          <small>{pt ? "ZONA DE PERIGO" : "DANGER ZONE"}</small>
          <h2>{pt ? "Apagar conta" : "Delete account"}</h2>
          <p>
            {pt
              ? "Remove permanentemente seu perfil e todo o histórico associado ao uloggd."
              : "Permanently removes your profile and all history associated with uloggd."}
          </p>
        </div>
      </div>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : reset())}
      >
        <Dialog.Trigger asChild>
          <button className="settings-delete-trigger" type="button">
            {pt ? "Apagar minha conta" : "Delete my account"}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="account-delete-overlay" />
          <Dialog.Content className="account-delete-dialog">
            <Dialog.Close
              className="account-delete-close"
              aria-label={t.close}
              disabled={pending}
            >
              <X size={18} />
            </Dialog.Close>
            <span className="account-delete-alert" aria-hidden="true">
              <AlertTriangle size={24} />
            </span>
            <Dialog.Title>
              {pt ? "Apagar sua conta?" : "Delete your account?"}
            </Dialog.Title>
            <Dialog.Description>
              {pt
                ? "Esta ação é permanente. Não será possível recuperar sua conta depois da confirmação."
                : "This action is permanent. Your account cannot be recovered after confirmation."}
            </Dialog.Description>

            <div className="account-delete-summary">
              <strong>
                {pt ? "O que será apagado" : "What will be deleted"}
              </strong>
              <p>
                {pt
                  ? "Perfil, biblioteca, avaliações, listas, conexões sociais e métodos de acesso."
                  : "Profile, library, reviews, lists, social connections, and sign-in methods."}
              </p>
            </div>

            <form onSubmit={removeAccount}>
              <label className="account-delete-confirmation">
                <span>
                  {pt ? "Digite" : "Enter"} <strong>{expected}</strong>{" "}
                  {pt ? "para confirmar" : "to confirm"}
                </span>
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={expected}
                  disabled={pending}
                />
              </label>
              <label className="account-delete-understood">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(event) => setUnderstood(event.target.checked)}
                  disabled={pending}
                />
                <span aria-hidden="true" />
                <p>
                  {pt
                    ? "Entendo que todos os meus dados serão apagados permanentemente."
                    : "I understand that all my data will be permanently deleted."}
                </p>
              </label>
              {error && (
                <p className="account-delete-error" role="alert">
                  {error}
                </p>
              )}
              <div className="account-delete-actions">
                <button type="button" onClick={reset} disabled={pending}>
                  {pt ? "Manter minha conta" : "Keep my account"}
                </button>
                <button type="submit" disabled={!ready}>
                  {pending && <LoaderCircle className="spin" size={16} />}
                  {pending
                    ? pt
                      ? "Apagando..."
                      : "Deleting..."
                    : pt
                      ? "Apagar permanentemente"
                      : "Delete permanently"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
