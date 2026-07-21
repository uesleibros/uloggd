"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/auth-validation";
import { tri, type UiLang } from "@/lib/ui-text";

export function ResetPasswordPanel({ lang }: { lang: UiLang }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    if (
      !passwordSchema.safeParse(password).success ||
      password !== data.get("confirm")
    ) {
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
    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(
        tri(
          lang,
          "O link é inválido ou expirou. Solicite um novo.",
          "This link is invalid or expired. Request a new one.",
          "El enlace no es válido o caducó. Solicita uno nuevo.",
        ),
      );
      setPending(false);
      return;
    }
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setError(
        tri(
          lang,
          "Não foi possível atualizar a senha.",
          "The password could not be updated.",
          "No se pudo actualizar la contraseña.",
        ),
      );
      setPending(false);
      return;
    }
    router.replace(`/${lang}/login?reset=success`);
    router.refresh();
  }
  return (
    <section className="login-panel">
      <div className="login-panel-heading">
        <h1>
          {tri(
            lang,
            "Defina uma nova senha",
            "Set a new password",
            "Define una nueva contraseña",
          )}
        </h1>
        <p>
          {tri(
            lang,
            "Escolha uma senha forte que você não usa em outros serviços.",
            "Choose a strong password you do not use elsewhere.",
            "Elige una contraseña fuerte que no uses en otros servicios.",
          )}
        </p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          {tri(lang, "Nova senha", "New password", "Nueva contraseña")}
          <input name="password" type="password" autoComplete="new-password" />
        </label>
        <label>
          {tri(
            lang,
            "Confirmar senha",
            "Confirm password",
            "Confirmar contraseña",
          )}
          <input name="confirm" type="password" autoComplete="new-password" />
        </label>
        <button className="auth-primary" disabled={pending}>
          {pending && <LoaderCircle className="spin" size={18} />}{" "}
          {tri(
            lang,
            "Atualizar senha",
            "Update password",
            "Actualizar contraseña",
          )}
        </button>
      </form>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
