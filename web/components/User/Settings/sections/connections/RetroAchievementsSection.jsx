import { useState, useEffect } from "react"
import { CheckCircle2, Unlink, Loader2, ExternalLink, Trophy, Key } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import Modal from "@components/UI/Modal"

const RA_ICON = "https://static.retroachievements.org/assets/images/ra-icon.webp"
const RA_SETTINGS_URL = "https://retroachievements.org/settings#:~:text=API%20Web"

export default function RetroAchievementsSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [username, setUsername] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.user_id) fetchConnection()
  }, [user?.user_id])

  useEffect(() => {
    if (!showModal) {
      setUsername("")
      setApiKey("")
      setError(null)
    }
  }, [showModal])

  async function fetchConnection() {
    try {
      const res = await fetch("/api/retroachievements/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id }),
      })
      const data = await res.json()
      setConnection(data.connected ? data : null)
    } catch {
      setConnection(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    if (!username.trim() || !apiKey.trim()) {
      setError(t("settings.ra.missingFields"))
      return
    }

    setConnecting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/retroachievements/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ username: username.trim(), apiKey: apiKey.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setConnection(data.profile)
        setShowModal(false)
      } else {
        setError(data.error || t("settings.ra.connectionError"))
      }
    } catch {
      setError(t("settings.ra.connectionError"))
    } finally {
      setConnecting(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/retroachievements/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setConnection(null)
    } finally {
      setRemoving(false)
    }
  }

  if (loading) {
    return (
      <SettingsSection title={t("settings.ra.title")}>
        <div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 animate-pulse h-24" />
      </SettingsSection>
    )
  }

  const isConnected = !!connection

  return (
    <>
      <SettingsSection title={t("settings.ra.title")}>
        <div className={`p-4 rounded-lg border transition-colors ${
          isConnected ? "bg-yellow-500/5 border-yellow-500/20" : "bg-zinc-800/30 border-zinc-700/50"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
              isConnected && connection.avatar ? "bg-transparent" : "bg-[#cc9900]"
            }`}>
              {isConnected && connection.avatar ? (
                <img src={connection.avatar} alt="RA Avatar" className="w-full h-full object-cover" />
              ) : (
                <img src={RA_ICON} alt="RetroAchievements" className="w-6 h-6 object-contain brightness-0 invert" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-white">{t("settings.ra.title")}</span>
                {isConnected && (
                  <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {t("settings.ra.connected")}
                  </span>
                )}
              </div>

              {isConnected ? (
                <>
                  <div className="text-sm font-semibold text-white mb-0.5">{connection.username}</div>
                  {connection.points > 0 && (
                    <div className="flex items-center gap-1 text-xs text-yellow-400 mb-3">
                      <Trophy className="w-3 h-3" />
                      {connection.points.toLocaleString()} points
                      {connection.rank && (
                        <span className="text-zinc-500 ml-1">· #{connection.rank}</span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleRemove}
                    disabled={removing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                    {t("settings.ra.disconnect")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-400 mb-3">{t("settings.ra.description")}</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-[#cc9900] hover:bg-[#e6ad00] rounded-lg transition-colors cursor-pointer"
                  >
                    <img src={RA_ICON} alt="" className="w-4 h-4 object-contain brightness-0" />
                    {t("settings.ra.connect")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      <Modal
        isOpen={showModal}
        onClose={() => !connecting && setShowModal(false)}
        maxWidth="max-w-sm"
        fullscreenMobile
        showMobileGrip
        closeOnOverlay={!connecting}
      >
        <div className="flex flex-col h-full">
          <div className="bg-[#cc9900] p-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center">
                <img src={RA_ICON} alt="" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h2 className="text-base font-bold text-black">{t("settings.ra.modal.title")}</h2>
                <p className="text-xs text-black/60">{t("settings.ra.modal.subtitle")}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                {t("settings.ra.modal.usernameLabel")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={t("settings.ra.modal.usernamePlaceholder")}
                autoFocus
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#cc9900]/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                {t("settings.ra.modal.apiKeyLabel")}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={t("settings.ra.modal.apiKeyPlaceholder")}
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-[#cc9900]/50 transition-colors"
              />
            </div>

            <button
              onClick={() => window.open(RA_SETTINGS_URL, "_blank", "noopener,noreferrer")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
            >
              <Key className="w-4 h-4" />
              {t("settings.ra.modal.getApiKey")}
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}
          </div>

          <div className="p-4 border-t border-zinc-800 flex-shrink-0">
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={connecting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting || !username.trim() || !apiKey.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-black bg-[#cc9900] hover:bg-[#e6ad00] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("settings.ra.modal.connecting")}
                  </>
                ) : (
                  t("settings.ra.modal.connect")
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
