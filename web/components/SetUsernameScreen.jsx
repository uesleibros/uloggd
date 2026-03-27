import { useState } from "react"
import { User, Loader2, X } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"

export default function SetUsernameScreen({ onComplete }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState("")
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function validateUsername(value) {
    if (value.length < 3) return t("setUsername.errors.tooShort")
    if (value.length > 32) return t("setUsername.errors.tooLong")
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return t("setUsername.errors.invalidChars")
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const trimmed = username.trim()
    const validationError = validateUsername(trimmed)

    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch("/api/users/createUsername", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ username: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setError(t("setUsername.errors.taken"))
        } else {
          setError(data.error || t("setUsername.errors.generic"))
        }
        return
      }

      onComplete?.(data.username)
    } catch {
      setError(t("setUsername.errors.generic"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#16181c] p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-indigo-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            {t("setUsername.title")}
          </h1>
          <p className="text-[15px] text-zinc-500 leading-relaxed">
            {t("setUsername.description")}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              {t("setUsername.label")}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm font-medium">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.slice(0, 32))
                  setError(null)
                }}
                placeholder={t("setUsername.placeholder")}
                autoFocus
                disabled={saving}
                className="w-full h-12 pl-9 pr-4 rounded-lg bg-[#1e2025] border border-[#2a2d35] text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
              />
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              {t("setUsername.hint")}
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !username.trim()}
            className="w-full h-12 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("setUsername.saving")}
              </>
            ) : (
              t("setUsername.submit")
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
