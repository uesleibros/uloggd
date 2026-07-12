"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Fingerprint, LoaderCircle, ShieldCheck } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { emailSchema, safeInternalNext } from "@/lib/auth-validation";
import { DiscordIcon, GoogleIcon, TwitchIcon } from "./provider-icons";
import { AuthTurnstile } from "./turnstile";

const providers = [
  ["google", "Google", GoogleIcon],
  ["discord", "Discord", DiscordIcon],
  ["twitch", "Twitch", TwitchIcon],
] as const;

type Mode = "signin" | "signup" | "forgot" | "check-email";
type FieldName = "email" | "password" | "confirmPassword" | "terms";
type FieldErrors = Partial<Record<FieldName, string>>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
          emailRequired: "Informe seu e-mail.",
          emailInvalid: "Digite um e-mail válido, como nome@exemplo.com.",
          passwordRequired: "Informe sua senha.",
          passwordShort: "A senha precisa ter pelo menos 8 caracteres.",
          passwordLong: "A senha pode ter no máximo 72 caracteres.",
          passwordLetter: "Inclua pelo menos uma letra.",
          passwordNumber: "Inclua pelo menos um número.",
          passwordRules:
            "Use de 8 a 72 caracteres, com pelo menos uma letra e um número.",
          confirmRequired: "Confirme sua senha.",
          termsRequired:
            "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
          invalidCredentials: "E-mail ou senha incorretos.",
          captchaFailed:
            "A verificação de segurança expirou ou falhou. Faça-a novamente.",
          signupDisabled:
            "Novos cadastros estão temporariamente indisponíveis.",
          network:
            "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.",
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
          emailRequired: "Enter your email address.",
          emailInvalid: "Enter a valid email, such as name@example.com.",
          passwordRequired: "Enter your password.",
          passwordShort: "Password must be at least 8 characters.",
          passwordLong: "Password can have at most 72 characters.",
          passwordLetter: "Include at least one letter.",
          passwordNumber: "Include at least one number.",
          passwordRules:
            "Use 8–72 characters with at least one letter and one number.",
          confirmRequired: "Confirm your password.",
          termsRequired: "You must accept the Terms of Use and Privacy Policy.",
          invalidCredentials: "Incorrect email or password.",
          captchaFailed:
            "The security check expired or failed. Complete it again.",
          signupDisabled: "New registrations are temporarily unavailable.",
          network:
            "Could not connect to the service. Check your connection and try again.",
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
    setFieldErrors({});
    resetCaptcha();
  }

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateFields(data: FormData) {
    const errors: FieldErrors = {};
    const submittedEmail = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("confirmPassword") || "");

    if (!submittedEmail) errors.email = copy.emailRequired;
    else if (!emailSchema.safeParse(submittedEmail).success)
      errors.email = copy.emailInvalid;

    if (mode !== "forgot") {
      if (!password) errors.password = copy.passwordRequired;
      else if (mode === "signup") {
        if (password.length < 8) errors.password = copy.passwordShort;
        else if (password.length > 72) errors.password = copy.passwordLong;
        else if (!/[a-zA-Z]/.test(password))
          errors.password = copy.passwordLetter;
        else if (!/[0-9]/.test(password)) errors.password = copy.passwordNumber;
      }
    }

    if (mode === "signup") {
      if (!confirmation) errors.confirmPassword = copy.confirmRequired;
      else if (password !== confirmation)
        errors.confirmPassword = copy.mismatch;
      if (data.get("terms") !== "on") errors.terms = copy.termsRequired;
    }

    return { errors, submittedEmail, password };
  }

  function authErrorMessage(authError: { code?: string; status?: number }) {
    if (authError.status === 429 || authError.code?.includes("rate_limit"))
      return copy.rate;
    switch (authError.code) {
      case "email_not_confirmed":
        return copy.unconfirmed;
      case "invalid_credentials":
        return copy.invalidCredentials;
      case "captcha_failed":
        return copy.captchaFailed;
      case "signup_disabled":
        return copy.signupDisabled;
      case "weak_password":
        return copy.passwordRules;
      default:
        return copy.invalid;
    }
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
    const { errors, submittedEmail, password } = validateFields(data);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
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
          setError(authErrorMessage(authError));
          return;
        }
        router.replace(safeInternalNext(searchParams.get("next"), lang));
        router.refresh();
      } else if (mode === "signup") {
        const redirect = `${window.location.origin}/${lang}/auth/callback`;
        const { error: authError } = await supabase.auth.signUp({
          email: submittedEmail,
          password,
          options: { captchaToken, emailRedirectTo: redirect },
        });
        if (authError) {
          setError(authErrorMessage(authError));
          return;
        }
        setEmail(submittedEmail);
        setMode("check-email");
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          submittedEmail,
          {
            redirectTo: `${window.location.origin}/${lang}/auth/callback?next=/${lang}/auth/reset-password`,
            captchaToken,
          },
        );
        if (
          authError?.status === 429 ||
          authError?.code?.includes("rate_limit")
        ) {
          setError(copy.rate);
          return;
        }
        setMessage(copy.genericRecovery);
      }
    } catch {
      setError(copy.network);
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
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            onChange={() => clearFieldError("email")}
          />
          {fieldErrors.email && (
            <span className="auth-field-error" id="email-error">
              {fieldErrors.email}
            </span>
          )}
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
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? "password-error"
                  : mode === "signup"
                    ? "password-hint"
                    : undefined
              }
              onChange={() => clearFieldError("password")}
            />
            {mode === "signup" && !fieldErrors.password && (
              <span className="auth-field-hint" id="password-hint">
                {copy.passwordRules}
              </span>
            )}
            {fieldErrors.password && (
              <span className="auth-field-error" id="password-error">
                {fieldErrors.password}
              </span>
            )}
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
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword ? "confirm-error" : undefined
                }
                onChange={() => clearFieldError("confirmPassword")}
              />
              {fieldErrors.confirmPassword && (
                <span className="auth-field-error" id="confirm-error">
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </label>
            <div className="auth-checkbox-group">
              <label className="auth-checkbox">
                <input
                  name="terms"
                  type="checkbox"
                  required
                  aria-invalid={Boolean(fieldErrors.terms)}
                  aria-describedby={
                    fieldErrors.terms ? "terms-error" : undefined
                  }
                  onChange={() => clearFieldError("terms")}
                />
                <span>{copy.terms}</span>
              </label>
              {fieldErrors.terms && (
                <span className="auth-field-error" id="terms-error">
                  {fieldErrors.terms}
                </span>
              )}
            </div>
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
          <div className="auth-alternatives">
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
