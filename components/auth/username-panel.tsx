"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, LogOut, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameSchema } from "@/lib/auth-validation";

const reserved = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "callback",
  "help",
  "legal",
  "login",
  "logout",
  "moderator",
  "onboarding",
  "privacy",
  "profile",
  "reset-password",
  "settings",
  "support",
  "terms",
  "uloggd",
  "www",
]);
export function UsernamePanel({
  lang,
  suggestion,
}: {
  lang: "en" | "pt-BR";
  suggestion?: string;
}) {
  const router = useRouter();
  const pt = lang === "pt-BR";
  const [value, setValue] = useState(suggestion || "");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = value.trim().toLowerCase();
  const valid =
    usernameSchema.safeParse(normalized).success && !reserved.has(normalized);
  const hint = useMemo(
    () =>
      !normalized
        ? pt
          ? "3–32 caracteres: letras minúsculas, números e _."
          : "3–32 characters: lowercase letters, numbers and _."
        : reserved.has(normalized)
          ? pt
            ? "Esse nome é reservado."
            : "This name is reserved."
          : !valid
            ? pt
              ? "Formato inválido."
              : "Invalid format."
            : available === false
              ? pt
                ? "Esse username já está em uso."
                : "That username is taken."
              : available === true
                ? pt
                  ? "Username disponível."
                  : "Username available."
                : pt
                  ? "Formato válido."
                  : "Valid format.",
    [normalized, valid, available, pt],
  );
  async function check(candidate: string) {
    const clean = candidate.trim().toLowerCase();
    if (!usernameSchema.safeParse(clean).success || reserved.has(clean)) {
      setAvailable(null);
      return;
    }
    const { data } = await createClient()
      .from("profiles")
      .select("id")
      .ilike("username", clean)
      .limit(1);
    setAvailable(!data?.length);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("claim_username", {
      candidate: normalized,
    });
    if (rpcError) {
      setError(
        rpcError.code === "23505"
          ? pt
            ? "Esse username acabou de ser escolhido. Tente outro."
            : "That username was just claimed. Try another."
          : pt
            ? "Não foi possível salvar. Confira o nome e tente novamente."
            : "Could not save it. Check the name and try again.",
      );
      setAvailable(false);
      setPending(false);
      return;
    }
    router.replace(`/${lang}/u/${normalized}`);
    router.refresh();
  }
  async function signOut() {
    await createClient().auth.signOut();
    router.replace(`/${lang}/login`);
    router.refresh();
  }
  return (
    <section className="login-panel username-panel">
      <div className="login-panel-heading">
        <h1>{pt ? "Escolha seu username" : "Choose your username"}</h1>
        <p>
          {pt
            ? "Este será seu endereço público no uloggd. Você poderá definir um nome de exibição depois."
            : "This will be your public uloggd address. You can add a display name later."}
        </p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          {pt ? "Username" : "Username"}
          <span className="username-input">
            <span>@</span>
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value.toLowerCase());
                setAvailable(null);
              }}
              onBlur={() => check(value)}
              maxLength={32}
              autoComplete="username"
              aria-describedby="username-hint"
            />
          </span>
        </label>
        <p
          id="username-hint"
          className={valid ? "field-success" : "field-hint"}
        >
          {available === true ? (
            <Check size={14} />
          ) : available === false ? (
            <X size={14} />
          ) : null}
          {hint}
        </p>
        <button
          className="auth-primary"
          disabled={!valid || available === false || pending}
        >
          {pending && <LoaderCircle className="spin" size={18} />}{" "}
          {pt ? "Continuar" : "Continue"}
        </button>
      </form>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      <button className="auth-text-button" onClick={signOut}>
        <LogOut size={15} />
        {pt ? "Sair da conta" : "Sign out"}
      </button>
    </section>
  );
}
