"use client";

import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/auth-validation";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Setting or changing this account's password.
 *
 * Works for accounts that never had one. Somebody who signed up through
 * Discord a year ago has no way back in if that Discord account goes; a
 * password is the fallback, and refusing to offer one because there is nothing
 * to "change" would be the wrong reading of the word.
 *
 * The confirmation code path exists because Supabase can be configured to
 * require a fresh proof of identity before a password moves. Rather than
 * guessing which setting is on, this asks for the password, and only if the
 * server says a code is needed does it send one and ask again. That also
 * avoids re-running a full sign-in here, which would drop a two-factor session
 * back down a level as a side effect of changing a password.
 */
export function PasswordSettings({
  hasPassword,
  lang,
}: {
  hasPassword: boolean;
  lang: UiLang;
}) {
  const [pending, setPending] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") ?? "");
    const confirm = String(values.get("confirm") ?? "");
    const nonce = String(values.get("nonce") ?? "").trim();

    if (!passwordSchema.safeParse(password).success || password !== confirm) {
      setError(
        tri(
          lang,
          "Use pelo menos 8 caracteres, uma letra e um número; as senhas devem coincidir.",
          "Use at least 8 characters, a letter and a number; passwords must match.",
          "Usa al menos 8 caracteres, una letra y un número; las contraseñas deben coincidir.",
        ),
      );
      return;
    }
    if (needsCode && !nonce) {
      setError(
        tri(
          lang,
          "Digite o código que enviamos para o seu e-mail.",
          "Enter the code we sent to your email.",
          "Escribe el código que enviamos a tu correo.",
        ),
      );
      return;
    }

    setPending(true);
    setError(null);
    setDone(false);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser(
      nonce ? { password, nonce } : { password },
    );

    if (authError) {
      // The server asking for a fresh proof is not a failure; it is the next
      // step. Send the code and say so, rather than showing "could not save"
      // over a request that was understood perfectly.
      if (/reauthentication|nonce/i.test(authError.message)) {
        await supabase.auth.reauthenticate();
        setNeedsCode(true);
        setError(
          tri(
            lang,
            "Enviamos um código para o seu e-mail. Digite abaixo e salve de novo.",
            "We sent a code to your email. Enter it below and save again.",
            "Enviamos un código a tu correo. Escríbelo abajo y guarda otra vez.",
          ),
        );
      } else
        setError(
          /same/i.test(authError.message)
            ? tri(
                lang,
                "A nova senha precisa ser diferente da atual.",
                "The new password must differ from the current one.",
                "La nueva contraseña debe ser distinta de la actual.",
              )
            : tri(
                lang,
                "Não foi possível salvar a senha. Tente de novo.",
                "Could not save the password. Try again.",
                "No se pudo guardar la contraseña. Inténtalo de nuevo.",
              ),
        );
      setPending(false);
      return;
    }

    setDone(true);
    setNeedsCode(false);
    form.reset();
    setPending(false);
  }

  return (
    <section className="settings-security-card">
      <header>
        <span>
          <KeyRound size={20} />
        </span>
        <div>
          <h2>
            {hasPassword
              ? tri(lang, "Senha", "Password", "Contraseña")
              : tri(
                  lang,
                  "Criar uma senha",
                  "Create a password",
                  "Crear una contraseña",
                )}
          </h2>
          <p>
            {hasPassword
              ? tri(
                  lang,
                  "Trocar a senha não desconecta suas outras sessões. Para isso, use a lista de sessões abaixo.",
                  "Changing your password does not sign out your other sessions. Use the session list below for that.",
                  "Cambiar la contraseña no cierra tus otras sesiones. Para eso, usa la lista de sesiones de abajo.",
                )
              : tri(
                  lang,
                  "Você entra por outro serviço. Uma senha é um caminho de volta se algum dia perder o acesso a ele.",
                  "You sign in through another service. A password is a way back if you ever lose access to it.",
                  "Entras por otro servicio. Una contraseña es una vuelta si algún día pierdes el acceso a él.",
                )}
          </p>
        </div>
      </header>

      <form className="settings-email-form" onSubmit={submit}>
        <label>
          {hasPassword
            ? tri(lang, "Nova senha", "New password", "Nueva contraseña")
            : tri(lang, "Senha", "Password", "Contraseña")}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <label>
          {tri(
            lang,
            "Confirme a senha",
            "Confirm password",
            "Confirma la contraseña",
          )}
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        {needsCode && (
          <label className="settings-nonce-field">
            {tri(
              lang,
              "Código enviado por e-mail",
              "Code sent by email",
              "Código enviado por correo",
            )}
            <input
              name="nonce"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
            />
          </label>
        )}
        <div className="settings-email-footer">
          <span
            className="settings-save-status"
            data-state={
              pending ? "saving" : error ? "error" : done ? "saved" : undefined
            }
            role={error ? "alert" : "status"}
          >
            {pending ? (
              <>
                <LoaderCircle className="spin" size={13} aria-hidden />
                {tri(lang, "Salvando…", "Saving…", "Guardando…")}
              </>
            ) : error ? (
              <>
                <AlertTriangle size={13} aria-hidden />
                {error}
              </>
            ) : done ? (
              <>
                <CheckCircle2 size={13} aria-hidden />
                {tri(
                  lang,
                  "Senha salva.",
                  "Password saved.",
                  "Contraseña guardada.",
                )}
              </>
            ) : null}
          </span>
          <button type="submit" disabled={pending}>
            {hasPassword
              ? tri(
                  lang,
                  "Trocar senha",
                  "Change password",
                  "Cambiar contraseña",
                )
              : tri(lang, "Criar senha", "Create password", "Crear contraseña")}
          </button>
        </div>
      </form>
    </section>
  );
}
