import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Eye, EyeOff, CheckCircle2, Loader2, Lock } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import usePageMeta from "#hooks/usePageMeta"

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  usePageMeta({
    title: `${t("auth.reset.title")} - uloggd`,
  })

  useEffect(() => {
    let mounted = true

    async function initRecovery() {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.replace(/^#/, ""))
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")
      const type = params.get("type")

      if (type === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (mounted) {
          if (error) {
            setError(t("auth.reset.invalidLink"))
          }
          setChecking(false)
        }

        return
      }

      const { data } = await supabase.auth.getSession()

      if (mounted) {
        if (!data.session) {
          setError(t("auth.reset.invalidLink"))
        }
        setChecking(false)
      }
    }

    initRecovery()

    return () => {
      mounted = false
    }
  }, [t])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      setError(t("auth.reset.passwordMinLength"))
      return
    }

    if (password !== confirmPassword) {
      setError(t("auth.reset.passwordMismatch"))
      return
    }

    try {
      setLoading(true)
      setError("")

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      setSuccess(true)

      setTimeout(() => {
        navigate("/")
      }, 1800)
    } catch (err) {
      setError(err.message || t("auth.reset.genericError"))
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <Loader2 className="w-8 h-8 text-zinc-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-500">{t("auth.reset.checking")}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {t("auth.reset.successTitle")}
          </h1>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            {t("auth.reset.successDescription")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block mb-6">
            <img
              src="/logo.jpg"
              alt="uloggd"
              className="h-12 mx-auto rounded-xl"
            />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            {t("auth.reset.title")}
          </h1>
          <p className="text-[15px] text-zinc-500">
            {t("auth.reset.description")}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              {t("auth.reset.newPassword")}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                placeholder="••••••••"
                className="w-full h-12 pl-11 pr-12 rounded-lg bg-[#1e2025] border border-[#2a2d35] text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              {t("auth.reset.confirmPassword")}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError("")
                }}
                placeholder="••••••••"
                className="w-full h-12 pl-11 pr-4 rounded-lg bg-[#1e2025] border border-[#2a2d35] text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("auth.reset.submit")}
          </button>
        </form>
      </div>
    </div>
  )
}
