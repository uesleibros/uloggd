"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, LogOut, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameSchema } from "@/lib/auth-validation";
import { uiText, type UiLang } from "@/lib/ui-text";

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
export function UsernamePanel({ lang }: { lang: UiLang }) {
  const router = useRouter();
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const [value, setValue] = useState("");
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
            ? t.invalidFormat
            : available === false
              ? pt
                ? "Esse username já está em uso."
                : "That username is taken."
              : available === true
                ? pt
                  ? "Username disponível."
                  : "Username available."
                : t.validFormat,
    [normalized, valid, available, pt, t.invalidFormat, t.validFormat],
  );
  async function check(candidate: string) {
    const clean = candidate.trim().toLowerCase();
    if (!usernameSchema.safeParse(clean).success || reserved.has(clean)) {
      setAvailable(null);
      return;
    }
    const { data, error: checkError } = await createClient()
      .from("profiles")
      .select("id")
      .ilike("username", clean)
      .limit(1);
    if (checkError) {
      setAvailable(null);
      setError(
        pt
          ? "Não foi possível verificar a disponibilidade agora. Tente novamente."
          : "Could not check availability right now. Try again.",
      );
      return;
    }
    setError(null);
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
      const occupied = rpcError.code === "23505";
      const unavailableRpc =
        rpcError.code === "PGRST202" || rpcError.code === "42883";
      setError(
        occupied
          ? pt
            ? "Esse username acabou de ser escolhido. Tente outro."
            : "That username was just claimed. Try another."
          : unavailableRpc
            ? pt
              ? "A escolha de username ainda não está disponível. A configuração do banco precisa ser aplicada."
              : "Username selection is not available yet. The database configuration must be applied."
            : pt
              ? "Não foi possível salvar o username. Tente novamente."
              : "Could not save the username. Try again.",
      );
      setAvailable(occupied ? false : null);
      setPending(false);
      return;
    }
    router.replace(`/${lang}/onboarding/username`);
    router.refresh();
  }
  return (
    <section className="login-panel username-panel">
      <div
        className="onboarding-progress"
        aria-label={pt ? "Etapa 1 de 2" : "Step 1 of 2"}
      >
        <span data-current>1</span>
        <i />
        <span>2</span>
      </div>
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
      <form action={`/${lang}/auth/signout`} method="post">
        <button className="auth-text-button" type="submit">
          <LogOut size={15} />
          {t.signOut}
        </button>
      </form>
    </section>
  );
}
