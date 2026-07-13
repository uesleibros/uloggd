"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emailSchema, passwordSchema } from "@/lib/auth-validation";
export function SecurityPanel({ lang }: { lang: "en" | "pt-BR" }) {
  const pt = lang === "pt-BR";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  async function reauth() {
    setError(null);
    const { error } = await supabase.auth.reauthenticate();
    setMessage(
      error
        ? null
        : pt
          ? "Enviamos um código para confirmar sua identidade."
          : "We sent a code to confirm your identity.",
    );
    if (error)
      setError(
        pt
          ? "Não foi possível iniciar a reautenticação."
          : "Could not start reauthentication.",
      );
  }
  async function update(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const d = new FormData(e.currentTarget);
    const email = String(d.get("email") || "").trim();
    const password = String(d.get("password") || "");
    const nonce = String(d.get("nonce") || "").trim();
    if (
      (email && !emailSchema.safeParse(email).success) ||
      (password && !passwordSchema.safeParse(password).success)
    ) {
      setError(pt ? "Confira os dados." : "Check the information.");
      return;
    }
    const attrs: { email?: string; password?: string; nonce?: string } = {};
    if (email) attrs.email = email;
    if (password) attrs.password = password;
    if (nonce) attrs.nonce = nonce;
    const { error } = await supabase.auth.updateUser(attrs);
    if (error) {
      setError(
        pt
          ? "Não foi possível atualizar a conta. Reautentique e tente novamente."
          : "Could not update the account. Reauthenticate and try again.",
      );
      return;
    }
    setMessage(
      email
        ? pt
          ? "Confira o novo endereço de e-mail para confirmar a alteração."
          : "Check the new email address to confirm the change."
        : pt
          ? "Senha atualizada."
          : "Password updated.",
    );
    e.currentTarget.reset();
  }
  return (
    <section className="settings-security-panel">
      <div className="login-panel-heading">
        <h1>{pt ? "Segurança da conta" : "Account security"}</h1>
        <p>
          {pt
            ? "Reautentique antes de alterar dados sensíveis."
            : "Reauthenticate before changing sensitive details."}
        </p>
      </div>
      <button className="auth-primary" onClick={reauth}>
        {pt ? "Reautenticar" : "Reauthenticate"}
      </button>
      <form className="auth-form" onSubmit={update}>
        <label>
          {pt ? "Código de reautenticação" : "Reauthentication code"}
          <input
            name="nonce"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </label>
        <label>
          {pt ? "Novo e-mail" : "New email"}
          <input name="email" type="email" autoComplete="email" />
        </label>
        <label>
          {pt ? "Nova senha" : "New password"}
          <input name="password" type="password" autoComplete="new-password" />
        </label>
        <button className="auth-primary">
          {pt ? "Salvar alteração" : "Save change"}
        </button>
      </form>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="auth-success" role="status">
          {message}
        </div>
      )}
    </section>
  );
}
