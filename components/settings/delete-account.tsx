"use client";

import * as Dialog from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function DeleteAccount({
  username,
  lang,
}: {
  username: string;
  lang: UiLang;
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
            tri(
              lang,
              "Confirme a verificação em duas etapas e tente novamente.",
              "Complete two-factor authentication and try again.",
              "Completa la verificación en dos pasos e inténtalo de nuevo.",
            ),
          );
        } else if (result.error === "confirmation_mismatch") {
          setError(
            pt
              ? `Digite exatamente ${expected} para confirmar.`
              : `Enter ${expected} exactly to confirm.`,
          );
        } else {
          setError(
            tri(
              lang,
              "Não foi possível apagar sua conta agora. Tente novamente.",
              "Your account could not be deleted right now. Try again.",
              "No se pudo eliminar tu cuenta ahora. Inténtalo de nuevo.",
            ),
          );
        }
        setPending(false);
        return;
      }
      await createClient().auth.signOut({ scope: "local" });
      window.location.replace(`/${lang}`);
    } catch {
      setError(
        tri(
          lang,
          "A conexão falhou. Confira sua internet e tente novamente.",
          "The connection failed. Check your internet and try again.",
          "La conexión falló. Revisa tu internet e inténtalo de nuevo.",
        ),
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
          <small>
            {tri(lang, "ZONA DE PERIGO", "DANGER ZONE", "ZONA DE PELIGRO")}
          </small>
          <h2>
            {tri(lang, "Apagar conta", "Delete account", "Eliminar cuenta")}
          </h2>
          <p>
            {tri(
              lang,
              "Remove permanentemente seu perfil e todo o histórico associado ao uloggd.",
              "Permanently removes your profile and all history associated with uloggd.",
              "Elimina permanentemente tu perfil y todo el historial asociado a uloggd.",
            )}
          </p>
        </div>
      </div>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : reset())}
      >
        <Dialog.Trigger asChild>
          <button className="settings-delete-trigger" type="button">
            {tri(
              lang,
              "Apagar minha conta",
              "Delete my account",
              "Eliminar mi cuenta",
            )}
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
              {tri(
                lang,
                "Apagar sua conta?",
                "Delete your account?",
                "¿Eliminar tu cuenta?",
              )}
            </Dialog.Title>
            <Dialog.Description>
              {tri(
                lang,
                "Esta ação é permanente. Não será possível recuperar sua conta depois da confirmação.",
                "This action is permanent. Your account cannot be recovered after confirmation.",
                "Esta acción es permanente. No podrás recuperar tu cuenta tras confirmar.",
              )}
            </Dialog.Description>

            <div className="account-delete-summary">
              <strong>
                {tri(
                  lang,
                  "O que será apagado",
                  "What will be deleted",
                  "Qué se eliminará",
                )}
              </strong>
              <p>
                {tri(
                  lang,
                  "Perfil, biblioteca, avaliações, listas, conexões sociais e métodos de acesso.",
                  "Profile, library, reviews, lists, social connections, and sign-in methods.",
                  "Perfil, biblioteca, reseñas, listas, conexiones sociales y métodos de acceso.",
                )}
              </p>
            </div>

            <form onSubmit={removeAccount}>
              <label className="account-delete-confirmation">
                <span>
                  {tri(lang, "Digite", "Enter", "Escribe")}{" "}
                  <strong>{expected}</strong>{" "}
                  {tri(lang, "para confirmar", "to confirm", "para confirmar")}
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
                <Checkbox
                  checked={understood}
                  onCheckedChange={setUnderstood}
                  disabled={pending}
                />
                <p>
                  {tri(
                    lang,
                    "Entendo que todos os meus dados serão apagados permanentemente.",
                    "I understand that all my data will be permanently deleted.",
                    "Entiendo que todos mis datos se eliminarán permanentemente.",
                  )}
                </p>
              </label>
              {error && (
                <p className="account-delete-error" role="alert">
                  {error}
                </p>
              )}
              <div className="account-delete-actions">
                <button type="button" onClick={reset} disabled={pending}>
                  {tri(
                    lang,
                    "Manter minha conta",
                    "Keep my account",
                    "Mantener mi cuenta",
                  )}
                </button>
                <button type="submit" disabled={!ready}>
                  {pending && <LoaderCircle className="spin" size={16} />}
                  {pending
                    ? tri(lang, "Apagando...", "Deleting...", "Eliminando...")
                    : tri(
                        lang,
                        "Apagar permanentemente",
                        "Delete permanently",
                        "Eliminar permanentemente",
                      )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
