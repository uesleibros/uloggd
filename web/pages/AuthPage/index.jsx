import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Fingerprint, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import { authenticateWithPasskey } from "#lib/passkey-client"
import { TwitchIcon } from "#constants/customIcons"
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
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export default function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error, setError] = useState("")

  usePageMeta({ title: `${t("auth.page.signInButton")} - uloggd` })

  const handleOAuthSignIn = async (provider) => {
    try {
      setError("")
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
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
            {t("auth.page.welcomeBack")}
          </h1>
          <p className="text-[15px] text-zinc-500">
            {t("auth.page.signInDescription")}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleOAuthSignIn("discord")}
            className="w-full h-12 rounded-lg bg-[#1e2025] border border-[#2a2d35] flex items-center justify-center gap-3 hover:border-[#3a3d45] hover:bg-[#24262b] active:scale-[0.98] transition-all cursor-pointer group"
          >
            <DiscordIcon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
              {t("auth.continueWith", { provider: "Discord" })}
            </span>
          </button>

          <button
            onClick={() => handleOAuthSignIn("twitch")}
            className="w-full h-12 rounded-lg bg-[#1e2025] border border-[#2a2d35] flex items-center justify-center gap-3 hover:border-[#3a3d45] hover:bg-[#24262b] active:scale-[0.98] transition-all cursor-pointer group"
          >
            <TwitchIcon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
              {t("auth.continueWith", { provider: "Twitch" })}
            </span>
          </button>

          <button
            onClick={() => handleOAuthSignIn("github")}
            className="w-full h-12 rounded-lg bg-[#1e2025] border border-[#2a2d35] flex items-center justify-center gap-3 hover:border-[#3a3d45] hover:bg-[#24262b] active:scale-[0.98] transition-all cursor-pointer group"
          >
            <GitHubIcon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
              {t("auth.continueWith", { provider: "GitHub" })}
            </span>
          </button>

          <button
            onClick={() => handleOAuthSignIn("google")}
            className="w-full h-12 rounded-lg bg-[#1e2025] border border-[#2a2d35] flex items-center justify-center gap-3 hover:border-[#3a3d45] hover:bg-[#24262b] active:scale-[0.98] transition-all cursor-pointer group"
          >
            <GoogleIcon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
              {t("auth.continueWith", { provider: "Google" })}
            </span>
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-[#2a2d35]" />
            <span className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium">
              {t("auth.page.or")}
            </span>
            <div className="flex-1 h-px bg-[#2a2d35]" />
          </div>

          <button
            onClick={handlePasskeySignIn}
            disabled={passkeyLoading}
            className="w-full h-12 rounded-lg bg-[#1e2025] border border-[#2a2d35] flex items-center justify-center gap-3 hover:border-[#3a3d45] hover:bg-[#24262b] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {passkeyLoading ? (
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            ) : (
              <>
                <Fingerprint className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  {t("auth.signInWithPasskey")}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
