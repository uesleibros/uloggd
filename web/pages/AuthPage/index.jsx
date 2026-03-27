import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Fingerprint, Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import { authenticateWithPasskey } from "#lib/passkey-client"
import usePageMeta from "#hooks/usePageMeta"

const DISCORD_PATH = "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"

export function DiscordIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d={DISCORD_PATH} />
    </svg>
  )
}

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [view, setView] = useState("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  usePageMeta(
    view === "signUp"
      ? { title: `${t("auth.page.createAccount")} - uloggd` }
      : { title: `${t("auth.page.signInButton")} - uloggd` }
  )

  const resetState = () => {
    setError("")
    setMessage("")
    setPassword("")
    setShowPassword(false)
  }

  const switchView = (newView) => {
    resetState()
    setView(newView)
  }

  const handleDiscordSignIn = async () => {
    try {
      setError("")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError("")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
    }
  }

  const handlePasskeySignIn = async () => {
    try {
      setPasskeyLoading(true)
      setError("")
      const { token, type } = await authenticateWithPasskey()
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type,
      })
      if (error) throw error
      navigate("/")
      window.location.reload()
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError(t("auth.passkeyError.cancelled"))
      } else if (err.name === "InvalidStateError") {
        setError(t("auth.passkeyError.invalidState"))
      } else if (err.message?.includes("not found")) {
        setError(t("auth.passkeyError.notFound"))
      } else {
        setError(t("auth.passkeyError.generic"))
      }
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleEmailSignIn = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError("")
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate("/")
    } catch (err) {
      if (err.message === "Invalid login credentials") {
        setError(t("auth.page.invalidCredentials"))
      } else if (err.message === "Email not confirmed") {
        setError(t("auth.page.emailNotConfirmed"))
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setError(t("auth.page.passwordMinLength"))
      return
    }
    try {
      setLoading(true)
      setError("")
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setView("checkEmail")
    } catch (err) {
      if (err.message?.includes("already registered")) {
        setError(t("auth.page.alreadyRegistered"))
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!email) {
      setError(t("auth.page.enterEmail"))
      return
    }
    try {
      setLoading(true)
      setError("")
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setMessage(t("auth.page.resetEmailSent"))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (view === "checkEmail") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {t("auth.page.checkEmailTitle")}
            </h1>
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              {t("auth.page.checkEmailMessage", { email })}
            </p>
            <button
              onClick={() => switchView("signIn")}
              className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {t("auth.page.backToSignIn")}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === "forgotPassword") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <button
              onClick={() => switchView("signIn")}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-6 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("auth.page.backToSignIn")}
            </button>

            <h1 className="text-2xl font-bold text-white mb-1">
              {t("auth.page.forgotPasswordTitle")}
            </h1>
            <p className="text-sm text-zinc-400 mb-8">
              {t("auth.page.forgotPasswordDescription")}
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 mb-6">
                <p className="text-sm text-green-400">{message}</p>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  {t("auth.page.emailLabel")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.page.emailPlaceholder")}
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("auth.page.sendResetLink")}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-5">
              <img src="/logo.svg" alt="uloggd" className="h-8 mx-auto" />
            </Link>
            <h1 className="text-2xl font-bold text-white mb-1">
              {view === "signIn"
                ? t("auth.page.welcomeBack")
                : t("auth.page.createAccount")}
            </h1>
            <p className="text-sm text-zinc-400">
              {view === "signIn"
                ? t("auth.page.signInDescription")
                : t("auth.page.signUpDescription")}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={handleDiscordSignIn}
              className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-zinc-600 transition-all cursor-pointer group"
              title={t("auth.signInWithDiscord")}
            >
              <DiscordIcon className="w-6 h-6 text-zinc-400 group-hover:text-[#5865F2] transition-colors" />
            </button>

            <button
              onClick={handleGoogleSignIn}
              className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
              title={t("auth.signInWithGoogle")}
            >
              <GoogleIcon className="w-6 h-6" />
            </button>

            <button
              onClick={handlePasskeySignIn}
              disabled={passkeyLoading}
              className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-zinc-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              title={t("auth.signInWithPasskey")}
            >
              {passkeyLoading ? (
                <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
              ) : (
                <Fingerprint className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              {t("auth.page.or")}
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form
            onSubmit={view === "signIn" ? handleEmailSignIn : handleEmailSignUp}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                {t("auth.page.emailLabel")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.page.emailPlaceholder")}
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-zinc-300">
                  {t("auth.page.passwordLabel")}
                </label>
                {view === "signIn" && (
                  <button
                    type="button"
                    onClick={() => switchView("forgotPassword")}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {t("auth.page.forgotPassword")}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-4 pr-11 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  required
                  minLength={view === "signUp" ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {view === "signUp" && (
                <p className="text-xs text-zinc-500 mt-1.5">
                  {t("auth.page.passwordHint")}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {view === "signIn"
                ? t("auth.page.signInButton")
                : t("auth.page.signUpButton")}
            </button>
          </form>

          <p className="text-sm text-zinc-500 text-center mt-6">
            {view === "signIn" ? t("auth.page.noAccount") : t("auth.page.hasAccount")}{" "}
            <button
              onClick={() => switchView(view === "signIn" ? "signUp" : "signIn")}
              className="text-white font-medium hover:underline cursor-pointer"
            >
              {view === "signIn" ? t("auth.page.signUpLink") : t("auth.page.signInLink")}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
