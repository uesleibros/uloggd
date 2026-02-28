import { useState } from "react"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"

export default function DangerZoneSection({ onDelete, loading }) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState(false)

  return (
    <SettingsSection
      title={t("settings.dangerZone.title")}
      description={t("settings.dangerZone.description")}
      danger
    >
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="w-full px-4 py-2.5 text-sm font-medium text-red-400 hover:text-white bg-red-500/5 hover:bg-red-500 border border-red-500/20 hover:border-red-500 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {t("settings.dangerZone.deleteAccount")}
        </button>
      ) : (
        <div className="p-3 sm:p-4 bg-zinc-900/30 border border-red-500/20 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-400">
                {t("settings.dangerZone.confirmTitle")}
              </p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {t("settings.dangerZone.confirmDescription")}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
            >
              {t("settings.dangerZone.cancel")}
            </button>
            <button
              onClick={onDelete}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("settings.dangerZone.deletePermanent")
              )}
            </button>
          </div>
        </div>
      )}
    </SettingsSection>
  )
}
