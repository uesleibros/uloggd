import { useState, useEffect } from "react"
import { CheckCircle2, Unlink, Loader2, ExternalLink, Copy, Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { PlayStationIcon } from "#constants/customIcons"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"

export default function PlayStationSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [npssoToken, setNpssoToken] = useState("")
  const [tokenError, setTokenError] = useState(null)
  const [copied, setCopied] = useState(false)

  const PSN_TOKEN_URL = "https://ca.account.sony.com/api/v1/ssocookie"

  useEffect(() => {
    if (user?.id) fetchConnection()
  }, [user?.id])

  useEffect(() => {
    if (!showModal) {
      setNpssoToken("")
      setTokenError(null)
      setCopied(false)
    }
  }, [showModal])

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && showModal) {
        const input = document.getElementById("npsso-input")
        if (input) input.focus()
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [showModal])

  async function fetchConnection() {
    try {
      const res = await fetch("/api/psn/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await res.json()

      if (data.connected) {
        setConnection(data)
      } else {
        setConnection(null)
      }
    } catch {
      setConnection(null)
    } finally {
      setLoading(false)
    }
  }

  function validateToken(token) {
    if (!token) return false
    const trimmed = token.trim()
    if (trimmed.length < 60) return false
    if (!/^[a-zA-Z0-9]+$/.test(trimmed)) return false
    return true
  }

  async function handleConnect() {
    if (!validateToken(npssoToken)) {
      setTokenError(t("settings.psn.invalidToken"))
      return
    }

    setConnecting(true)
    setTokenError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/psn/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          userId: user.id,
          npssoToken: npssoToken.trim()
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setConnection(data.profile)
        setShowModal(false)
      } else {
        setTokenError(data.error || t("settings.psn.connectionError"))
      }
    } catch (error) {
      setTokenError(t("settings.psn.connectionError"))
    } finally {
      setConnecting(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch("/api/psn/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id })
      })

      if (res.ok) {
        setConnection(null)
      }
    } finally {
      setRemoving(false)
    }
  }

  function handleOpenPSN() {
    window.open(PSN_TOKEN_URL, "_blank", "noopener,noreferrer")
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(PSN_TOKEN_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleTokenChange(e) {
    const value = e.target.value
    setNpssoToken(value)
    
    if (tokenError && validateToken(value)) {
      setTokenError(null)
    }
  }

  if (loading) {
    return (
      <SettingsSection title={t("settings.psn.title")}>
        <div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 animate-pulse h-24" />
      </SettingsSection>
    )
  }

  const isConnected = !!connection
  const isTokenValid = validateToken(npssoToken)

  return (
    <>
      <SettingsSection title={t("settings.psn.title")}>
        <div className={`p-4 rounded-lg border transition-colors ${
          isConnected
            ? "bg-blue-500/5 border-blue-500/20"
            : "bg-zinc-800/30 border-zinc-700/50"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
              isConnected ? "bg-transparent" : "bg-[#003791]"
            }`}>
              {isConnected && connection.avatar ? (
                <img src={connection.avatar} alt="PSN Avatar" className="w-full h-full object-cover" />
              ) : (
                <PlayStationIcon className="w-7 h-7 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-white">
                  {t("settings.psn.title")}
                </span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-medium">
                  BETA
                </span>
                {isConnected && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {t("settings.psn.connected")}
                  </span>
                )}
              </div>

              {isConnected ? (
                <>
                  <div className="text-sm font-semibold text-white mb-1">
                    {connection.onlineId}
                  </div>
                  {connection.isPlus && (
                    <div className="text-xs text-amber-400 mb-3">
                      PlayStation Plus
                    </div>
                  )}

                  <button
                    onClick={handleRemove}
                    disabled={removing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {removing
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Unlink className="w-3.5 h-3.5" />
                    }
                    {t("settings.psn.disconnect")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-400 mb-3">
                    {t("settings.psn.description")}
                  </p>

                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#003791] hover:bg-[#0050d4] border border-[#003791] rounded-lg transition-colors cursor-pointer"
                  >
                    <PlayStationIcon className="w-4 h-4 text-white" />
                    {t("settings.psn.connect")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !connecting && setShowModal(false)}
          />
          
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#003791] to-[#0050d4] p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <PlayStationIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {t("settings.psn.modal.title")}
                  </h2>
                  <p className="text-sm text-white/70">
                    {t("settings.psn.modal.subtitle")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#003791] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-300 mb-2">
                      {t("settings.psn.modal.step1")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleOpenPSN}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-[#003791] hover:bg-[#0050d4] rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t("settings.psn.modal.openPSN")}
                      </button>
                      <button
                        onClick={handleCopyUrl}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">{t("settings.psn.modal.copied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            {t("settings.psn.modal.copyUrl")}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#003791] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-300">
                      {t("settings.psn.modal.step2")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#003791] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-300 mb-2">
                      {t("settings.psn.modal.step3")}
                    </p>
                    <div className="bg-zinc-800/50 rounded-lg p-3 font-mono text-xs text-zinc-400 border border-zinc-700">
                      {`{"npsso":"eyJhbGc..."}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#003791] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-300 mb-2">
                      {t("settings.psn.modal.step4")}
                    </p>
                    <input
                      id="npsso-input"
                      type="text"
                      value={npssoToken}
                      onChange={handleTokenChange}
                      placeholder={t("settings.psn.modal.placeholder")}
                      className={`w-full px-4 py-3 bg-zinc-800 border rounded-lg text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:ring-2 transition-colors ${
                        tokenError 
                          ? "border-red-500 focus:ring-red-500/50" 
                          : isTokenValid
                            ? "border-green-500 focus:ring-green-500/50"
                            : "border-zinc-700 focus:ring-[#003791]/50"
                      }`}
                    />
                    {tokenError && (
                      <p className="mt-2 text-xs text-red-400">{tokenError}</p>
                    )}
                    {isTokenValid && !tokenError && (
                      <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("settings.psn.modal.validToken")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={connecting}
                  className="flex-1 px-4 py-3 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t("settings.psn.modal.cancel")}
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting || !isTokenValid}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-[#003791] hover:bg-[#0050d4] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("settings.psn.modal.connecting")}
                    </>
                  ) : (
                    t("settings.psn.modal.connect")
                  )}
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-400">
                  {t("settings.psn.modal.betaWarning")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
