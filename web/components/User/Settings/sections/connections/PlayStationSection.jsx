import { useState, useEffect } from "react"
import { CheckCircle2, Unlink, Loader2, ExternalLink, Copy, Check, AlertCircle, LogIn, ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { PlayStationIcon } from "#constants/customIcons"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import Modal from "@components/UI/Modal"

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
  const [currentStep, setCurrentStep] = useState(1)

  const PSN_LOGIN_URL = "https://store.playstation.com"
  const PSN_TOKEN_URL = "https://ca.account.sony.com/api/v1/ssocookie"

  useEffect(() => {
    if (user?.user_id) fetchConnection()
  }, [user?.user_id])

  useEffect(() => {
    if (!showModal) {
      setNpssoToken("")
      setTokenError(null)
      setCopied(false)
      setCurrentStep(1)
    }
  }, [showModal])

  async function fetchConnection() {
    try {
      const res = await fetch("/api/psn/status", {
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

  function validateToken(token) {
    if (!token) return false
    const trimmed = token.trim()
    return trimmed.length >= 60 && /^[a-zA-Z0-9]+$/.test(trimmed)
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
    } catch {
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
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: user.id })
      })
      if (res.ok) setConnection(null)
    } finally {
      setRemoving(false)
    }
  }

  function handleOpenPSNLogin() {
    window.open(PSN_LOGIN_URL, "_blank", "noopener,noreferrer")
  }

  function handleOpenPSNToken() {
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
    if (tokenError && validateToken(value)) setTokenError(null)
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
          isConnected ? "bg-blue-500/5 border-blue-500/20" : "bg-zinc-800/30 border-zinc-700/50"
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
                <span className="text-sm font-medium text-white">{t("settings.psn.title")}</span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-medium">BETA</span>
                {isConnected && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {t("settings.psn.connected")}
                  </span>
                )}
              </div>
              {isConnected ? (
                <>
                  <div className="text-sm font-semibold text-white mb-1">{connection.onlineId}</div>
                  {connection.isPlus && <div className="text-xs text-amber-400 mb-3">PlayStation Plus</div>}
                  <button
                    onClick={handleRemove}
                    disabled={removing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                    {t("settings.psn.disconnect")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-400 mb-3">{t("settings.psn.description")}</p>
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

      <Modal
        isOpen={showModal}
        onClose={() => !connecting && setShowModal(false)}
        maxWidth="max-w-md"
        fullscreenMobile
        showMobileGrip
        closeOnOverlay={!connecting}
      >
        <div className="flex flex-col h-full">
          <div className="bg-[#003791] p-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <PlayStationIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white">{t("settings.psn.modal.title")}</h2>
                <p className="text-xs text-white/60">{t("settings.psn.modal.subtitle")}</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-4">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    currentStep >= step ? "bg-white" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <div className="flex gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">{t("settings.psn.modal.importantTitle")}</p>
                      <p className="text-xs text-amber-400/70 mt-0.5">{t("settings.psn.modal.importantDesc")}</p>
                    </div>
                  </div>
                </div>

                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-[#003791]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LogIn className="w-8 h-8 text-[#003791]" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{t("settings.psn.modal.step1Title")}</h3>
                  <p className="text-sm text-zinc-400">{t("settings.psn.modal.step1Desc")}</p>
                </div>

                <button
                  onClick={handleOpenPSNLogin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-[#003791] hover:bg-[#0050d4] rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t("settings.psn.modal.loginPSN")}
                </button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-[#003791]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Copy className="w-8 h-8 text-[#003791]" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{t("settings.psn.modal.step2Title")}</h3>
                  <p className="text-sm text-zinc-400">{t("settings.psn.modal.step2Desc")}</p>
                </div>

                <button
                  onClick={handleOpenPSNToken}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-[#003791] hover:bg-[#0050d4] rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t("settings.psn.modal.getToken")}
                </button>

                <button
                  onClick={handleCopyUrl}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">{t("settings.psn.modal.copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {t("settings.psn.modal.copyUrl")}
                    </>
                  )}
                </button>

                <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-2">{t("settings.psn.modal.step3Title")}</p>
                  <div className="bg-zinc-900 rounded-lg p-2.5 font-mono text-xs overflow-x-auto">
                    <span className="text-zinc-500">{"{"}</span>
                    <span className="text-blue-400">"npsso"</span>
                    <span className="text-zinc-500">:</span>
                    <span className="text-green-400">"eyJhbGci..."</span>
                    <span className="text-zinc-500">{"}"}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2">{t("settings.psn.modal.step3Hint")}</p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <h3 className="text-base font-semibold text-white mb-1">{t("settings.psn.modal.step4Title")}</h3>
                  <p className="text-sm text-zinc-400">{t("settings.psn.modal.step4Desc")}</p>
                </div>

                <div>
                  <input
                    type="text"
                    value={npssoToken}
                    onChange={handleTokenChange}
                    placeholder={t("settings.psn.modal.placeholder")}
                    autoFocus
                    className={`w-full px-4 py-3 bg-zinc-800 border rounded-xl text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:ring-2 transition-colors ${
                      tokenError 
                        ? "border-red-500 focus:ring-red-500/50" 
                        : isTokenValid
                          ? "border-green-500 focus:ring-green-500/50"
                          : "border-zinc-700 focus:ring-[#003791]/50"
                    }`}
                  />
                  {tokenError && <p className="mt-2 text-xs text-red-400">{tokenError}</p>}
                  {isTokenValid && !tokenError && (
                    <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {t("settings.psn.modal.validToken")}
                    </p>
                  )}
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-xs text-amber-400">{t("settings.psn.modal.betaWarning")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-zinc-800 flex-shrink-0">
            <div className="flex gap-3">
              {currentStep > 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={connecting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {t("common.back")}
                </button>
              ) : (
                <button
                  onClick={() => setShowModal(false)}
                  disabled={connecting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {t("settings.psn.modal.cancel")}
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#003791] hover:bg-[#0050d4] rounded-xl transition-colors"
                >
                  {currentStep === 1 ? t("settings.psn.modal.alreadyLogged") : t("common.next")}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting || !isTokenValid}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#003791] hover:bg-[#0050d4] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
