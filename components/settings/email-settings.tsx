"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Changing the address this account signs in with.
 *
 * The address is the account's last way back in: whoever holds it can reset
 * the password. So this is deliberately not instant. Supabase sends a
 * confirmation to the old address as well as the new one, and neither side
 * moves until both are clicked, which means a stolen session cannot quietly
 * walk off with the account while its owner is away from the keyboard.
 *
 * Nothing here writes anything. The change lands when the links are followed,
 * so the message afterwards says "check your email", not "saved".
 */
export function EmailSettings({
  currentEmail,
  lang,
}: {
  currentEmail: string | null;
  lang: UiLang;
}) {
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") ?? "")
      .trim()
      .toLowerCase();
    const confirm = String(values.get("confirm") ?? "")
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError(
        tri(
          lang,
          "Digite um e-mail válido.",
          "Enter a valid email address.",
          "Escribe un correo válido.",
        ),
      );
      return;
    }
    // Typed twice because a typo here does not bounce, it silently sends the
    // only way back into this account to a stranger's inbox.
    if (email !== confirm) {
      setError(
        tri(
          lang,
          "Os dois e-mails precisam ser iguais.",
          "The two addresses must match.",
          "Los dos correos deben coincidir.",
        ),
      );
      return;
    }
    if (email === currentEmail?.toLowerCase()) {
      setError(
        tri(
          lang,
          "Esse já é o e-mail da sua conta.",
          "That is already your account's address.",
          "Ese ya es el correo de tu cuenta.",
        ),
      );
      return;
    }

    setPending(true);
    setError(null);
    setSentTo(null);
    const { error: authError } = await createClient().auth.updateUser(
      { email },
      {
        emailRedirectTo: `${window.location.origin}/${lang}/auth/callback?next=/${lang}/settings?tab=security`,
      },
    );
    if (authError)
      setError(
        // The one case worth naming: everything else is a transport failure
        // and reads the same to the person either way.
        /already|registered|exists/i.test(authError.message)
          ? tri(
              lang,
              "Esse e-mail já está em uso em outra conta.",
              "That address is already in use on another account.",
              "Ese correo ya está en uso en otra cuenta.",
            )
          : tri(
              lang,
              "Não foi possível iniciar a troca. Tente de novo.",
              "Could not start the change. Try again.",
              "No se pudo iniciar el cambio. Inténtalo de nuevo.",
            ),
      );
    else {
      setSentTo(email);
      form.reset();
    }
    setPending(false);
  }

  return (
    <section className="settings-security-card">
      <header>
        <span>
          <Mail size={20} />
        </span>
        <div>
          <h2>
            {tri(
              lang,
              "E-mail da conta",
              "Account email",
              "Correo de la cuenta",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "É por aqui que você recupera o acesso, então a troca só vale depois de confirmada nos dois endereços.",
              "This is how you get back in, so a change only takes effect after both addresses confirm it.",
              "Es por aquí que recuperas el acceso, así que el cambio solo vale tras confirmarse en ambas direcciones.",
            )}
          </p>
        </div>
      </header>

      <p className="settings-current-email">
        <small>
          {tri(lang, "E-mail atual", "Current email", "Correo actual")}
        </small>
        <strong>
          {currentEmail ??
            tri(
              lang,
              "Nenhum e-mail nesta conta",
              "No email on this account",
              "Ningún correo en esta cuenta",
            )}
        </strong>
      </p>

      <form className="settings-email-form" onSubmit={submit}>
        <label>
          {tri(lang, "Novo e-mail", "New email", "Nuevo correo")}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="voce@exemplo.com"
          />
        </label>
        <label>
          {tri(
            lang,
            "Confirme o novo e-mail",
            "Confirm the new email",
            "Confirma el nuevo correo",
          )}
          <input
            name="confirm"
            type="email"
            autoComplete="off"
            required
            maxLength={254}
            placeholder="voce@exemplo.com"
          />
        </label>
        <div className="settings-email-footer">
          <span
            className="settings-save-status"
            data-state={
              pending
                ? "saving"
                : error
                  ? "error"
                  : sentTo
                    ? "saved"
                    : undefined
            }
            role={error ? "alert" : "status"}
          >
            {pending ? (
              <>
                <LoaderCircle className="spin" size={13} aria-hidden />
                {tri(lang, "Enviando…", "Sending…", "Enviando…")}
              </>
            ) : error ? (
              <>
                <AlertTriangle size={13} aria-hidden />
                {error}
              </>
            ) : sentTo ? (
              <>
                <CheckCircle2 size={13} aria-hidden />
                {tri(
                  lang,
                  `Confirme nos dois endereços: ${currentEmail ?? "o atual"} e ${sentTo}.`,
                  `Confirm from both addresses: ${currentEmail ?? "the current one"} and ${sentTo}.`,
                  `Confirma en ambas direcciones: ${currentEmail ?? "la actual"} y ${sentTo}.`,
                )}
              </>
            ) : null}
          </span>
          <button type="submit" disabled={pending}>
            {tri(lang, "Trocar e-mail", "Change email", "Cambiar correo")}
          </button>
        </div>
      </form>
    </section>
  );
}
