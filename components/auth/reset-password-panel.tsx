"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/auth-validation";

export function ResetPasswordPanel({ lang }: { lang: "en" | "pt-BR" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pt = lang === "pt-BR";
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
        pt
          ? "Use pelo menos 8 caracteres, uma letra e um número; as senhas devem coincidir."
          : "Use at least 8 characters, a letter and a number; passwords must match.",
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
        pt
          ? "O link é inválido ou expirou. Solicite um novo."
          : "This link is invalid or expired. Request a new one.",
      );
      setPending(false);
      return;
    }
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setError(
        pt
          ? "Não foi possível atualizar a senha."
          : "The password could not be updated.",
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
        <h1>{pt ? "Defina uma nova senha" : "Set a new password"}</h1>
        <p>
          {pt
            ? "Escolha uma senha forte que você não usa em outros serviços."
            : "Choose a strong password you do not use elsewhere."}
        </p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          {pt ? "Nova senha" : "New password"}
          <input name="password" type="password" autoComplete="new-password" />
        </label>
        <label>
          {pt ? "Confirmar senha" : "Confirm password"}
          <input name="confirm" type="password" autoComplete="new-password" />
        </label>
        <button className="auth-primary" disabled={pending}>
          {pending && <LoaderCircle className="spin" size={18} />}{" "}
          {pt ? "Atualizar senha" : "Update password"}
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
