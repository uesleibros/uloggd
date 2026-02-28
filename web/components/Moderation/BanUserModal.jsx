import { useState, useEffect } from "react"
import { supabase } from "#lib/supabase.js"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { notify } from "@components/UI/Notification"
import { Ban, AlertTriangle, Loader2 } from "lucide-react"

export default function BanUserModal({ isOpen, onClose, profile }) {
  const { t } = useTranslation("moderation.ban")
  const [reason, setReason] = useState("")
  const [duration, setDuration] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setReason("")
      setDuration("")
      setConfirmText("")
    }
  }, [isOpen])

  const canSubmit =
    reason.trim() &&
    confirmText === profile?.username &&
    !loading

  async function handleBan() {
    if (!canSubmit) return

    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/moderation/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: profile.id,
          reason: reason.trim(),
          durationHours: duration ? Number(duration) : null,
        }),
      })

      if (res.ok) {
        notify(t("success"), "success")
        onClose()
      } else {
        const data = await res.json()
        notify(data.error || t("error"), "error")
      }
    } catch {
      notify(t("error"), "error")
    }

    setLoading(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="bg-zinc-900 border border-red-500/20 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {t("title", { username: profile.username })}
            </h3>
            <p className="text-xs text-red-400/70">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
            <p className="text-xs text-red-300/80 leading-relaxed">
              {t("warning")}
            </p>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-2 block">
              {t("reasonLabel")}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={t("reasonPlaceholder")}
              className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700 rounded-xl text-sm text-white resize-none focus:outline-none focus:border-red-500/50 placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-2 block">
              {t("durationLabel")}
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
            >
              <option value="">{t("duration.permanent")}</option>
              <option value="24">{t("duration.hours24")}</option>
              <option value="168">{t("duration.days7")}</option>
              <option value="720">{t("duration.days30")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-2 block">
              {t("confirmLabel")} <span className="text-white font-medium">{profile.username}</span> {t("confirmSuffix")}
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={profile.username}
              className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50 placeholder-zinc-600"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleBan}
              disabled={!canSubmit}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Ban className="w-4 h-4" /> {t("confirm")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
