"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Fingerprint, LoaderCircle, ShieldCheck } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { createClient } from "@/lib/supabase/client";
import {
  emailSchema,
  passwordSchema,
  safeInternalNext,
} from "@/lib/auth-validation";
import { DiscordIcon, GoogleIcon, TwitchIcon } from "./provider-icons";
import { AuthTurnstile } from "./turnstile";

const providers = [
  ["google", "Google", GoogleIcon],
  ["discord", "Discord", DiscordIcon],
  ["twitch", "Twitch", TwitchIcon],
] as const;

type Mode = "signin" | "signup" | "forgot" | "check-email";

export function LoginPanel({
  lang,
  dictionary: d,
}: {
  lang: Locale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup"
      ? "signup"
      : searchParams.get("mode") === "forgot"
        ? "forgot"
        : "signin",
  );
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? d.auth.callbackError : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const turnstile = useRef<TurnstileInstance>(null);
  const copy =
    lang === "pt-BR"
      ? {
          signin: "Entrar",
          signup: "Criar conta",
          forgot: "Esqueci a senha",
          email: "E-mail",
          password: "Senha",
          confirm: "Confirmar senha",
          submitSignin: "Entrar com e-mail",
          submitSignup: "Criar minha conta",
          submitForgot: "Enviar link de recuperação",
          terms: "Aceito os Termos de Uso e a Política de Privacidade.",
          invalid: "Confira os dados informados e tente novamente.",
          captcha: "Conclua a verificação de segurança.",
          mismatch: "As senhas não coincidem.",
          genericRecovery:
            "Se existir uma conta para este e-mail, enviaremos um link de recuperação.",
          checkTitle: "Confira seu e-mail",
          checkBody:
            "Se o cadastro puder ser concluído, você receberá um link de confirmação.",
          resend: "Reenviar confirmação",
          resent: "Se aplicável, uma nova confirmação foi enviada.",
          unconfirmed: "Confirme seu e-mail antes de entrar.",
          rate: "Muitas tentativas. Aguarde um pouco e tente novamente.",
        }
      : {
          signin: "Sign in",
          signup: "Create account",
          forgot: "Forgot password",
          email: "Email",
          password: "Password",
          confirm: "Confirm password",
          submitSignin: "Sign in with email",
          submitSignup: "Create my account",
          submitForgot: "Send recovery link",
          terms: "I accept the Terms of Use and Privacy Policy.",
          invalid: "Check the information and try again.",
          captcha: "Complete the security check.",
          mismatch: "Passwords do not match.",
          genericRecovery:
            "If an account exists for this email, we will send a recovery link.",
          checkTitle: "Check your email",
          checkBody:
            "If registration can be completed, you will receive a confirmation link.",
          resend: "Resend confirmation",
          resent: "If applicable, a new confirmation was sent.",
          unconfirmed: "Confirm your email before signing in.",
          rate: "Too many attempts. Wait a moment and try again.",
        };

  function resetCaptcha() {
    setCaptchaToken(null);
    turnstile.current?.reset();
  }
  function changeMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
    resetCaptcha();
  }

  async function signInWithOAuth(provider: Provider, label: string) {
    setPending(provider);
    setError(null);
    const next = safeInternalNext(searchParams.get("next"), lang);
    const redirectTo = `${window.location.origin}/${lang}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (authError) {
      setError(d.auth.oauthError.replace("{provider}", label));
      setPending(null);
    }
  }

  async function signInWithPasskey() {
    setPending("passkey");
    setError(null);
    if (!("PublicKeyCredential" in window)) {
      setError(d.auth.passkeyUnsupported);
      setPending(null);
      return;
    }
    const { error: authError } = await createClient().auth.signInWithPasskey();
    if (!authError) {
      router.replace(`/${lang}/onboarding/username`);
      router.refresh();
      return;
    }
    setError(
      authError.code === "passkey_disabled"
        ? d.auth.passkeyDisabled
        : d.auth.passkeyCancelled,
    );
    setPending(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const submittedEmail = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (mode === "signup" && data.get("terms") !== "on") {
      setError(copy.invalid);
      return;
    }
    if (
      !emailSchema.safeParse(submittedEmail).success ||
      (mode !== "forgot" && !passwordSchema.safeParse(password).success)
    ) {
      setError(copy.invalid);
      return;
    }
    if (
      mode === "signup" &&
      password !== String(data.get("confirmPassword") || "")
    ) {
      setError(copy.mismatch);
      return;
    }
    if (!captchaToken) {
      setError(copy.captcha);
      return;
    }
    setPending(mode);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: submittedEmail,
          password,
          options: { captchaToken },
        });
        if (authError) {
          setError(
            authError.code === "email_not_confirmed"
              ? copy.unconfirmed
              : authError.status === 429
                ? copy.rate
                : copy.invalid,
          );
          return;
        }
        router.replace(safeInternalNext(searchParams.get("next"), lang));
        router.refresh();
      } else if (mode === "signup") {
        const redirect = `${window.location.origin}/${lang}/auth/callback`;
        await supabase.auth.signUp({
          email: submittedEmail,
          password,
          options: { captchaToken, emailRedirectTo: redirect },
        });
        setEmail(submittedEmail);
        setMode("check-email");
      } else {
        await supabase.auth.resetPasswordForEmail(submittedEmail, {
          redirectTo: `${window.location.origin}/${lang}/auth/callback?next=/${lang}/auth/reset-password`,
          captchaToken,
        });
        setMessage(copy.genericRecovery);
      }
    } catch {
      setError(copy.invalid);
    } finally {
      setPending(null);
      resetCaptcha();
    }
  }

  async function resend() {
    if (cooldown) return;
    setPending("resend");
    setError(null);
    try {
      await createClient().auth.resend({
        type: "signup",
        email,
        options: captchaToken ? { captchaToken } : undefined,
      });
      setMessage(copy.resent);
      setCooldown(true);
      window.setTimeout(() => setCooldown(false), 60_000);
    } catch {
      setMessage(copy.resent);
    } finally {
      setPending(null);
      resetCaptcha();
    }
  }

  if (mode === "check-email")
    return (
      <section className="login-panel auth-state" aria-live="polite">
        <ShieldCheck size={30} />
        <h1>{copy.checkTitle}</h1>
        <p>{copy.checkBody}</p>
        <AuthTurnstile
          ref={turnstile}
          language={lang}
          onToken={setCaptchaToken}
        />
        <button
          className="auth-primary"
          onClick={resend}
          disabled={pending !== null || cooldown}
        >
          {pending === "resend" && <LoaderCircle className="spin" size={18} />}{" "}
          {cooldown ? "60s" : copy.resend}
        </button>
        {message && <div className="auth-success">{message}</div>}
        <button
          className="auth-text-button"
          onClick={() => changeMode("signin")}
        >
          {copy.signin}
        </button>
      </section>
    );

  return (
    <section className="login-panel" aria-labelledby="login-title">
      <div className="auth-tabs" role="tablist">
      <button
        role="tab"
        aria-selected={mode === "signin"}
          onClick={() => changeMode("signin")}
        >
          {copy.signin}
        </button>
      <button
        role="tab"
        aria-selected={mode === "signup"}
          onClick={() => changeMode("signup")}
        >
          {copy.signup}
        </button>
      <button
        role="tab"
        aria-selected={mode === "forgot"}
          onClick={() => changeMode("forgot")}
        >
          {copy.forgot}
        </button>
      </div>
      <div className="login-panel-heading">
        <h1 id="login-title">
          {mode === "signin"
            ? d.auth.title
            : mode === "signup"
              ? copy.signup
              : copy.forgot}
        </h1>
        <p>
          {mode === "signin"
            ? d.auth.description
            : mode === "signup"
              ? copy.checkBody
              : copy.genericRecovery}
        </p>
      </div>
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>
          {copy.email}
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {mode !== "forgot" && (
          <label>
            {copy.password}
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
            />
          </label>
        )}
        {mode === "signup" && (
          <>
            <label>
              {copy.confirm}
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
            <label className="auth-checkbox">
              <input name="terms" type="checkbox" required />
              <span>{copy.terms}</span>
            </label>
          </>
        )}
        <AuthTurnstile
          ref={turnstile}
          language={lang}
          onToken={setCaptchaToken}
        />
        <button className="auth-primary" disabled={pending !== null}>
          {pending === mode && <LoaderCircle className="spin" size={18} />}{" "}
          {mode === "signin"
            ? copy.submitSignin
            : mode === "signup"
              ? copy.submitSignup
              : copy.submitForgot}
        </button>
      </form>
      {mode === "signin" && (
        <>
          <div className="auth-divider">
            <span>{d.auth.otherMethods}</span>
          </div>
          <button
            className="passkey-button"
            onClick={signInWithPasskey}
            disabled={pending !== null}
          >
            <span className="passkey-icon">
              {pending === "passkey" ? (
                <LoaderCircle className="spin" size={23} />
              ) : (
                <Fingerprint size={25} />
              )}
            </span>
            <span>
              <strong>{d.auth.passkeyLabel}</strong>
              <small>{d.auth.passkeyHint}</small>
            </span>
          </button>
          <div className="provider-grid">
            {providers.map(([provider, label, Icon]) => (
              <button
                key={provider}
                onClick={() => signInWithOAuth(provider, label)}
                disabled={pending !== null}
              >
                {pending === provider ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <Icon />
                )}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
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
      <p className="auth-legal">
        {d.auth.legalPrefix}{" "}
        <Link href={`/${lang}/legal/terms`}>{d.legal.terms}</Link> {d.auth.and}{" "}
        <Link href={`/${lang}/legal/privacy`}>{d.legal.privacy}</Link>.
      </p>
    </section>
  );
}
