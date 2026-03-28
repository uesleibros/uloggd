import { useState, useEffect } from "react"
import {
  CheckCircle2, Unlink, Loader2, ChevronRight,
  AlertCircle, Search, UserCheck, KeyRound, RefreshCw, Clock, ExternalLink
} from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { NintendoIcon } from "#constants/customIcons"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import Modal from "@components/UI/Modal"

function formatSwitchCode(code) {
  if (!code) return ""
  const cleaned = code.replace(/[^\d]/g, "")
  if (cleaned.length > 12) return code.slice(0, 17)
  if (cleaned.length !== 12) return cleaned
  return `SW-${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`
}

export default function NintendoSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [savedConnection, setSavedConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const [code, setCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState(null)
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [cooldown, setCooldown] = useState(0)
  const [rateLimited, setRateLimited] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)

  useEffect(() => {
    if (user?.user_id) fetchConnection()
  }, [user?.user_id])

  useEffect(() => {
    if (!showModal) {
      setCurrentStep(1)
      setCode("")
      setLookupError(null)
      setProfile(null)
      setVerificationCode("")
      setVerifyError(null)
      setAttemptsLeft(3)
      setCooldown(0)
      setRateLimited(false)
      setRateLimitSeconds(0)
    }
  }, [showModal])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (rateLimitSeconds <= 0) { setRateLimited(false); return }
    const timer = setInterval(() => {
      setRateLimitSeconds(prev => {
        if (prev <= 1) { clearInterval(timer); setRateLimited(false); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [rateLimitSeconds])

  async function fetchConnection() {
    try {
      const res = await fetch("/api/nintendo/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id }),
      })
      const data = await res.json()
      setSavedConnection(data.connected ? data : null)
    } catch {
      setSavedConnection(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleLookup() {
    const cleaned = code.replace(/[^\d]/g, "")
    if (cleaned.length !== 12) return

    setLookupLoading(true)
    setLookupError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/nintendo/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setRateLimited(true)
        setRateLimitSeconds(data.retryAfter || 300)
        setLookupError("rate_limit")
        return
      }

      if (res.status === 409) {
        setLookupError("code_already_linked")
        return
      }

      if (!res.ok || !data.found) {
        setLookupError(data.error || "not_found")
        return
      }

      setProfile(data.profile)
      setVerificationCode(data.verificationCode)
      setCurrentStep(2)
    } catch {
      setLookupError("network_error")
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleVerify() {
    setVerifying(true)
    setVerifyError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/nintendo/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await res.json()

      if (res.status === 429) {
        if (data.error === "max_attempts") {
          setAttemptsLeft(0)
          setVerifyError("max_attempts")
        } else if (data.error === "cooldown") {
          setCooldown(data.retryAfter || 60)
          setVerifyError("cooldown")
        }
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft)
        return
      }

      if (!res.ok) {
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft)
        setVerifyError(data.error || "verify_failed")
        return
      }

      if (data.verified) {
        setSavedConnection({
          connected: true,
          code: data.connection.code,
          nickname: data.connection.nickname,
          avatar: data.connection.avatar,
        })
        setCurrentStep(4)
      } else {
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft)
        setCooldown(60)
        setVerifyError("name_mismatch")
      }
    } catch {
      setVerifyError("network_error")
    } finally {
      setVerifying(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/nintendo/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) setSavedConnection(null)
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

  const isConnected = !!savedConnection

  return (
    <>
      <SettingsSection title={t("settings.nintendo.title")}>
        <div className={`p-4 rounded-lg border transition-colors ${
          isConnected ? "bg-red-500/5 border-red-500/20" : "bg-zinc-800/30 border-zinc-700/50"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
              isConnected && savedConnection.avatar ? "bg-transparent" : isConnected ? "bg-red-500" : "bg-zinc-700"
            }`}>
              {isConnected && savedConnection.avatar ? (
                <img src={savedConnection.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <NintendoIcon className="w-8 h-8 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-white">
                  {t("settings.nintendo.title")}
                </span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-medium">
                  BETA
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
                  <div className="text-sm font-semibold text-white mb-1">
                    {savedConnection.nickname || savedConnection.code}
                  </div>
                  {savedConnection.nickname && (
                    <div className="text-xs text-zinc-500 mb-3">
                      {savedConnection.code}
                    </div>
                  )}
                  <button
                    onClick={handleRemove}
                    disabled={removing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {removing
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Unlink className="w-3.5 h-3.5" />}
                    {t("settings.nintendo.remove")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-400 mb-3">
                    {t("settings.nintendo.description")}
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <NintendoIcon className="w-4 h-4 text-white" />
                    {t("settings.nintendo.connect")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      <Modal
        isOpen={showModal}
        onClose={() => !lookupLoading && !verifying && setShowModal(false)}
        maxWidth="max-w-md"
        fullscreenMobile
        showMobileGrip
        closeOnOverlay={!lookupLoading && !verifying}
      >
        <div className="flex flex-col h-full">
          <div className="bg-red-600 p-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <NintendoIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white">
                  {t("settings.nintendo.modal.title")}
                </h2>
                <p className="text-xs text-white/60">
                  {t("settings.nintendo.modal.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-4">
              {[1, 2, 3, 4].map((step) => (
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
                      <p className="text-sm font-medium text-amber-400">
                        {t("settings.nintendo.modal.betaTitle")}
                      </p>
                      <p className="text-xs text-amber-400/70 mt-0.5">
                        {t("settings.nintendo.modal.betaDesc")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {t("settings.nintendo.modal.step1Title")}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {t("settings.nintendo.modal.step1Desc")}
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="SW-XXXX-XXXX-XXXX"
                  value={code}
                  onChange={(e) => {
                    setCode(formatSwitchCode(e.target.value))
                    if (lookupError) setLookupError(null)
                  }}
                  className={`w-full px-4 py-3 bg-zinc-800 border rounded-xl text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:ring-2 transition-colors ${
                    lookupError
                      ? "border-red-500 focus:ring-red-500/50"
                      : "border-zinc-700 focus:ring-red-500/40"
                  }`}
                />

                {lookupError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {lookupError === "rate_limit"
                      ? t("settings.nintendo.modal.errorRateLimit")
                      : lookupError === "code_already_linked"
                        ? t("settings.nintendo.modal.errorAlreadyLinked")
                        : lookupError === "not_found"
                          ? t("settings.nintendo.modal.errorNotFound")
                          : t("settings.nintendo.modal.errorGeneric")}
                  </p>
                )}

                {rateLimited && rateLimitSeconds > 0 && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {t("settings.nintendo.modal.retryIn", { seconds: rateLimitSeconds })}
                  </div>
                )}

                <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    {t("settings.nintendo.modal.nxapiCredit")}
                  </p>
                  <a
                    href="https://github.com/samuelthomas2774/nxapi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 mt-1"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    github.com/samuelthomas2774/nxapi
                  </a>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {t("settings.nintendo.modal.step2Title")}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {t("settings.nintendo.modal.step2Desc")}
                  </p>
                </div>

                {profile && (
                  <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 flex items-center gap-4">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <NintendoIcon className="w-7 h-7 text-red-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{profile.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{profile.friendCode}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {t("settings.nintendo.modal.step3Title")}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {t("settings.nintendo.modal.step3Desc")}
                  </p>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 text-center">
                  <p className="text-xs text-zinc-500 mb-2">
                    {t("settings.nintendo.modal.changeNameTo")}
                  </p>
                  <p className="text-2xl font-bold font-mono text-white tracking-wider">
                    {verificationCode}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-2">
                    {t("settings.nintendo.modal.changeNameHint")}
                  </p>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 space-y-2">
                  <p className="text-xs text-zinc-400">
                    {t("settings.nintendo.modal.howToChangeName")}
                  </p>
                  <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
                    <li>{t("settings.nintendo.modal.step3_1")}</li>
                    <li>{t("settings.nintendo.modal.step3_2")}</li>
                    <li>{t("settings.nintendo.modal.step3_3")}</li>
                    <li>{t("settings.nintendo.modal.step3_4", { code: verificationCode })}</li>
                  </ol>
                </div>

                {verifyError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {verifyError === "max_attempts"
                        ? t("settings.nintendo.modal.errorMaxAttempts")
                        : verifyError === "cooldown"
                          ? t("settings.nintendo.modal.errorCooldown")
                          : verifyError === "name_mismatch"
                            ? t("settings.nintendo.modal.errorNameMismatch")
                            : t("settings.nintendo.modal.errorVerifyFailed")}
                    </p>
                  </div>
                )}

                {attemptsLeft < 3 && attemptsLeft > 0 && (
                  <p className="text-xs text-zinc-500 text-center">
                    {t("settings.nintendo.modal.attemptsLeft", { count: attemptsLeft })}
                  </p>
                )}

                {cooldown > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {t("settings.nintendo.modal.cooldown", { seconds: cooldown })}
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {t("settings.nintendo.modal.successTitle")}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {t("settings.nintendo.modal.successDesc")}
                  </p>
                </div>

                {savedConnection && (
                  <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 flex items-center gap-4">
                    {savedConnection.avatar ? (
                      <img src={savedConnection.avatar} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <NintendoIcon className="w-7 h-7 text-red-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{savedConnection.nickname}</p>
                      <p className="text-xs text-zinc-500 font-mono">{savedConnection.code}</p>
                    </div>
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-xs text-amber-400">
                    {t("settings.nintendo.modal.restoreNameHint")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-zinc-800 flex-shrink-0">
            {currentStep === 4 ? (
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors cursor-pointer"
              >
                {t("common.done")}
              </button>
            ) : (
              <div className="flex gap-3">
                {currentStep === 1 ? (
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={lookupLoading}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {t("settings.nintendo.modal.cancel")}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (currentStep === 3) setVerifyError(null)
                      setCurrentStep(currentStep - 1)
                    }}
                    disabled={verifying}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {t("common.back")}
                  </button>
                )}

                {currentStep === 1 && (
                  <button
                    onClick={handleLookup}
                    disabled={lookupLoading || code.replace(/[^\d]/g, "").length !== 12 || rateLimited}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {lookupLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("settings.nintendo.modal.searching")}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        {t("settings.nintendo.modal.search")}
                      </>
                    )}
                  </button>
                )}

                {currentStep === 2 && (
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors cursor-pointer"
                  >
                    {t("settings.nintendo.modal.yesItsMe")}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {currentStep === 3 && (
                  <button
                    onClick={handleVerify}
                    disabled={verifying || cooldown > 0 || attemptsLeft <= 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("settings.nintendo.modal.verifying")}
                      </>
                    ) : cooldown > 0 ? (
                      <>
                        <Clock className="w-4 h-4" />
                        {cooldown}s
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        {t("settings.nintendo.modal.verify")}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
