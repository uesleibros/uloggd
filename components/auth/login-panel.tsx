"use client";

import { Checkbox } from "@/components/ui/checkbox";

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
import { tri } from "@/lib/ui-text";

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
  const copy = {
    signin: tri(lang, "Entrar", "Sign in", "Entrar"),
    signup: tri(lang, "Criar conta", "Create account", "Crear cuenta"),
    forgot: tri(
      lang,
      "Esqueci a senha",
      "Forgot password",
      "Olvidé mi contraseña",
    ),
    signinDescription: tri(
      lang,
      "Acesse sua biblioteca e continue de onde parou.",
      "Access your library and continue where you left off.",
      "Accede a tu biblioteca y continúa donde lo dejaste.",
    ),
    signupDescription: tri(
      lang,
      "Crie sua conta e comece a organizar seus jogos.",
      "Create your account and start organizing your games.",
      "Crea tu cuenta y empieza a organizar tus juegos.",
    ),
    forgotDescription: tri(
      lang,
      "Digite seu e-mail para receber o link de recuperação.",
      "Enter your email to receive a recovery link.",
      "Introduce tu correo para recibir el enlace de recuperación.",
    ),
    continueWith: tri(lang, "Continue com", "Continue with", "Continuar con"),
    continueWithEmail: tri(
      lang,
      "ou continue com e-mail",
      "or continue with email",
      "o continúa con correo",
    ),
    backToSignin: tri(
      lang,
      "Voltar para entrar",
      "Back to sign in",
      "Volver a iniciar sesión",
    ),
    email: tri(lang, "E-mail", "Email", "Correo electrónico"),
    password: tri(lang, "Senha", "Password", "Contraseña"),
    confirm: tri(
      lang,
      "Confirmar senha",
      "Confirm password",
      "Confirmar contraseña",
    ),
    submitSignin: tri(
      lang,
      "Entrar com e-mail",
      "Sign in with email",
      "Entrar con correo",
    ),
    submitSignup: tri(
      lang,
      "Criar minha conta",
      "Create my account",
      "Crear mi cuenta",
    ),
    submitForgot: tri(
      lang,
      "Enviar link de recuperação",
      "Send recovery link",
      "Enviar enlace de recuperación",
    ),
    terms: tri(
      lang,
      "Aceito os Termos de Uso e a Política de Privacidade.",
      "I accept the Terms of Use and Privacy Policy.",
      "Acepto los Términos de Uso y la Política de Privacidad.",
    ),
    invalid: tri(
      lang,
      "Confira os dados informados e tente novamente.",
      "Check the information and try again.",
      "Revisa los datos e inténtalo de nuevo.",
    ),
    emailRequired: tri(
      lang,
      "Informe seu e-mail.",
      "Enter your email address.",
      "Indica tu correo electrónico.",
    ),
    emailInvalid: tri(
      lang,
      "Digite um e-mail válido, como nome@exemplo.com.",
      "Enter a valid email, such as name@example.com.",
      "Escribe un correo válido, como nombre@ejemplo.com.",
    ),
    passwordRequired: tri(
      lang,
      "Informe sua senha.",
      "Enter your password.",
      "Indica tu contraseña.",
    ),
    passwordShort: tri(
      lang,
      "A senha precisa ter pelo menos 8 caracteres.",
      "Password must be at least 8 characters.",
      "La contraseña debe tener al menos 8 caracteres.",
    ),
    passwordLong: tri(
      lang,
      "A senha pode ter no máximo 72 caracteres.",
      "Password can have at most 72 characters.",
      "La contraseña puede tener como máximo 72 caracteres.",
    ),
    passwordLetter: tri(
      lang,
      "Inclua pelo menos uma letra.",
      "Include at least one letter.",
      "Incluye al menos una letra.",
    ),
    passwordNumber: tri(
      lang,
      "Inclua pelo menos um número.",
      "Include at least one number.",
      "Incluye al menos un número.",
    ),
    passwordRules: tri(
      lang,
      "Use de 8 a 72 caracteres, com pelo menos uma letra e um número.",
      "Use 8–72 characters with at least one letter and one number.",
      "Usa de 8 a 72 caracteres, con al menos una letra y un número.",
    ),
    confirmRequired: tri(
      lang,
      "Confirme sua senha.",
      "Confirm your password.",
      "Confirma tu contraseña.",
    ),
    termsRequired: tri(
      lang,
      "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
      "You must accept the Terms of Use and Privacy Policy.",
      "Debes aceptar los Términos de Uso y la Política de Privacidad.",
    ),
    invalidCredentials: tri(
      lang,
      "E-mail ou senha incorretos.",
      "Incorrect email or password.",
      "Correo o contraseña incorrectos.",
    ),
    captchaFailed: tri(
      lang,
      "A verificação de segurança expirou ou falhou. Faça-a novamente.",
      "The security check expired or failed. Complete it again.",
      "La verificación de seguridad expiró o falló. Vuelve a completarla.",
    ),
    signupDisabled: tri(
      lang,
      "Novos cadastros estão temporariamente indisponíveis.",
      "New registrations are temporarily unavailable.",
      "Los nuevos registros no están disponibles temporalmente.",
    ),
    network: tri(
      lang,
      "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.",
      "Could not connect to the service. Check your connection and try again.",
      "No se pudo conectar al servicio. Revisa tu conexión e inténtalo de nuevo.",
    ),
    captcha: tri(
      lang,
      "Conclua a verificação de segurança.",
      "Complete the security check.",
      "Completa la verificación de seguridad.",
    ),
    mismatch: tri(
      lang,
      "As senhas não coincidem.",
      "Passwords do not match.",
      "Las contraseñas no coinciden.",
    ),
    genericRecovery: tri(
      lang,
      "Se existir uma conta para este e-mail, enviaremos um link de recuperação.",
      "If an account exists for this email, we will send a recovery link.",
      "Si existe una cuenta para este correo, enviaremos un enlace de recuperación.",
    ),
    checkTitle: tri(
      lang,
      "Confira seu e-mail",
      "Check your email",
      "Revisa tu correo",
    ),
    checkBody: tri(
      lang,
      "Se o cadastro puder ser concluído, você receberá um link de confirmação.",
      "If registration can be completed, you will receive a confirmation link.",
      "Si el registro se puede completar, recibirás un enlace de confirmación.",
    ),
    resend: tri(
      lang,
      "Reenviar confirmação",
      "Resend confirmation",
      "Reenviar confirmación",
    ),
    resent: tri(
      lang,
      "Se aplicável, uma nova confirmação foi enviada.",
      "If applicable, a new confirmation was sent.",
      "Si corresponde, se envió una nueva confirmación.",
    ),
    unconfirmed: tri(
      lang,
      "Confirme seu e-mail antes de entrar.",
      "Confirm your email before signing in.",
      "Confirma tu correo antes de entrar.",
    ),
    rate: tri(
      lang,
      "Muitas tentativas. Aguarde um pouco e tente novamente.",
      "Too many attempts. Wait a moment and try again.",
      "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
    ),
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
    setError(null);
    if (!captchaToken) {
      setError(copy.captcha);
      return;
    }
    if (!("PublicKeyCredential" in window)) {
      setError(d.auth.passkeyUnsupported);
      return;
    }
    setPending("passkey");
    try {
      const { error: authError } = await createClient().auth.signInWithPasskey({
        options: { captchaToken },
      });
      if (!authError) {
        router.replace(`/${lang}/onboarding/username`);
        router.refresh();
        return;
      }
      setError(
        authError.code === "captcha_failed"
          ? copy.captchaFailed
          : ("status" in authError && authError.status === 429) ||
              authError.code?.includes("rate_limit")
            ? copy.rate
            : authError.code === "passkey_disabled"
              ? d.auth.passkeyDisabled
              : d.auth.passkeyCancelled,
      );
    } catch {
      setError(copy.network);
    } finally {
      setPending(null);
      resetCaptcha();
    }
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

  const showProviders = mode === "signin" || mode === "signup";

  return (
    <section className="login-panel" aria-labelledby="login-title">
      <div className="auth-tabs" role="tablist" aria-label={d.auth.title}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          tabIndex={mode === "signin" ? 0 : -1}
          onClick={() => changeMode("signin")}
        >
          {copy.signin}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          tabIndex={mode === "signup" ? 0 : -1}
          onClick={() => changeMode("signup")}
        >
          {copy.signup}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "forgot"}
          tabIndex={mode === "forgot" ? 0 : -1}
          onClick={() => changeMode("forgot")}
        >
          {copy.forgot}
        </button>
      </div>

      <header className="login-panel-heading">
        <h1 id="login-title">
          {mode === "signin"
            ? copy.signin
            : mode === "signup"
              ? copy.signup
              : copy.forgot}
        </h1>
        <p>
          {mode === "signin"
            ? copy.signinDescription
            : mode === "signup"
              ? copy.signupDescription
              : copy.forgotDescription}
        </p>
      </header>

      {showProviders && (
        <div className="auth-alternatives" aria-label={copy.continueWith}>
          <div className="auth-divider">
            <span>{copy.continueWith}</span>
          </div>

          <div className="provider-grid">
            {providers.map(([provider, label, Icon]) => (
              <button
                type="button"
                key={provider}
                onClick={() => signInWithOAuth(provider, label)}
                disabled={pending !== null}
                aria-label={`${copy.continueWith} ${label}`}
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
      )}

      {showProviders && (
        <div className="auth-divider">
          <span>{copy.continueWithEmail}</span>
        </div>
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
                <Checkbox
                  name="terms"
                  required
                  aria-invalid={Boolean(fieldErrors.terms)}
                  aria-describedby={
                    fieldErrors.terms ? "terms-error" : undefined
                  }
                  onCheckedChange={() => clearFieldError("terms")}
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

        <button
          type="submit"
          className="auth-primary"
          disabled={pending !== null}
        >
          {pending === mode && <LoaderCircle className="spin" size={18} />}{" "}
          {mode === "signin"
            ? copy.submitSignin
            : mode === "signup"
              ? copy.submitSignup
              : copy.submitForgot}
        </button>
      </form>

      {mode === "signin" && (
        <div className="auth-alternatives">
          <div className="auth-divider">
            <span>{d.auth.otherMethods}</span>
          </div>

          <button
            type="button"
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
