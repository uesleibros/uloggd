import { useState, useEffect } from "react"
import { CheckCircle2, Unlink, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { NintendoIcon } from "#constants/customIcons"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"

function formatSwitchCode(code) {
  if (!code) return ""
  const cleaned = code.replace(/[^\d]/g, "")
  if (cleaned.length > 12) return code.slice(0, 17)
  if (cleaned.length !== 12) return cleaned
  return `SW-${cleaned.slice(0,4)}-${cleaned.slice(4,8)}-${cleaned.slice(8,12)}`
}

export default function NintendoSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [code, setCode] = useState("")
  const [nickname, setNickname] = useState("")
  const [savedCode, setSavedCode] = useState(null)
  const [savedNickname, setSavedNickname] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    if (user?.id) fetchConnection()
  }, [user?.id])

  async function fetchConnection() {
    try {
      const res = await fetch("/api/nintendo/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await res.json()

      if (data.connected) {
        setSavedCode(data.code)
        setSavedNickname(data.nickname || null)
        setCode(data.code)
        setNickname(data.nickname || "")
      } else {
        setSavedCode(null)
        setSavedNickname(null)
      }
    } catch {
      setSavedCode(null)
      setSavedNickname(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!code) return
    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/nintendo/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code, nickname: nickname.trim() || null }),
      })

      const data = await res.json()

      if (res.ok && data.connected) {
        setSavedCode(data.code)
        setSavedNickname(data.nickname || null)
        setCode(data.code)
        setNickname(data.nickname || "")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/nintendo/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (res.ok) {
        setSavedCode(null)
        setSavedNickname(null)
        setCode("")
        setNickname("")
      }
    } finally {
      setRemoving(false)
    }
  }

  if (loading) {
    return (
      <SettingsSection title={t("settings.nintendo.title")}>
        <div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 animate-pulse h-24" />
      </SettingsSection>
    )
  }

  const isConnected = !!savedCode

  return (
    <SettingsSection title={t("settings.nintendo.title")}>
      <div className={`p-4 rounded-lg border transition-colors ${
        isConnected
          ? "bg-red-500/5 border-red-500/20"
          : "bg-zinc-800/30 border-zinc-700/50"
      }`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isConnected ? "bg-red-500" : "bg-zinc-700"
          }`}>
            <NintendoIcon className="w-8 h-8 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-white">
                {t("settings.nintendo.title")}
              </span>
              {isConnected && (
                <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  {t("settings.nintendo.connected")}
                </span>
              )}
            </div>

            {isConnected ? (
              <>
                <div className="text-sm text-white mb-1">
                  {savedNickname || savedCode}
                </div>
                {savedNickname && (
                  <div className="text-xs text-zinc-500 mb-3">
                    {savedCode}
                  </div>
                )}

                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {removing
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Unlink className="w-3.5 h-3.5" />
                  }
                  {t("settings.nintendo.remove")}
                </button>
              </>
            ) : (
              <>
                <div className="space-y-3 mb-3">
                  <input
                    type="text"
                    placeholder={t("settings.nintendo.codePlaceholder")}
                    value={code}
                    onChange={(e) => setCode(formatSwitchCode(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                  <input
                    type="text"
                    placeholder={t("settings.nintendo.nicknamePlaceholder")}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                    maxLength={20}
                    className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !code}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <NintendoIcon className="w-4 h-4 text-white" />
                  }
                  {t("settings.nintendo.save")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
