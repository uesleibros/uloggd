"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, LogOut, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameSchema } from "@/lib/auth-validation";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

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
        ? tri(
            lang,
            "3–32 caracteres: letras minúsculas, números e _.",
            "3–32 characters: lowercase letters, numbers and _.",
            "3–32 caracteres: letras minúsculas, números y _.",
          )
        : reserved.has(normalized)
          ? tri(
              lang,
              "Esse nome é reservado.",
              "This name is reserved.",
              "Ese nombre está reservado.",
            )
          : !valid
            ? t.invalidFormat
            : available === false
              ? tri(
                  lang,
                  "Esse username já está em uso.",
                  "That username is taken.",
                  "Ese nombre de usuario ya está en uso.",
                )
              : available === true
                ? tri(
                    lang,
                    "Username disponível.",
                    "Username available.",
                    "Nombre de usuario disponible.",
                  )
                : t.validFormat,
    [normalized, valid, available, lang, t.invalidFormat, t.validFormat],
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
        tri(
          lang,
          "Não foi possível verificar a disponibilidade agora. Tente novamente.",
          "Could not check availability right now. Try again.",
          "No se pudo verificar la disponibilidad ahora. Inténtalo de nuevo.",
        ),
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
          ? tri(
              lang,
              "Esse username acabou de ser escolhido. Tente outro.",
              "That username was just claimed. Try another.",
              "Ese nombre de usuario acaba de ser tomado. Prueba otro.",
            )
          : unavailableRpc
            ? tri(
                lang,
                "A escolha de username ainda não está disponível. A configuração do banco precisa ser aplicada.",
                "Username selection is not available yet. The database configuration must be applied.",
                "La elección de nombre de usuario todavía no está disponible. Falta aplicar la configuración de la base de datos.",
              )
            : tri(
                lang,
                "Não foi possível salvar o username. Tente novamente.",
                "Could not save the username. Try again.",
                "No se pudo guardar el nombre de usuario. Inténtalo de nuevo.",
              ),
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
        aria-label={tri(lang, "Etapa 1 de 2", "Step 1 of 2", "Paso 1 de 2")}
      >
        <span data-current>1</span>
        <i />
        <span>2</span>
      </div>
      <div className="login-panel-heading">
        <h1>
          {tri(
            lang,
            "Escolha seu username",
            "Choose your username",
            "Elige tu nombre de usuario",
          )}
        </h1>
        <p>
          {tri(
            lang,
            "Este será seu endereço público no uloggd. Você poderá definir um nome de exibição depois.",
            "This will be your public uloggd address. You can add a display name later.",
            "Esta será tu dirección pública en uloggd. Podrás definir un nombre visible después.",
          )}
        </p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          {tri(lang, "Username", "Username", "Nombre de usuario")}
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
          {tri(lang, "Continuar", "Continue", "Continuar")}
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
