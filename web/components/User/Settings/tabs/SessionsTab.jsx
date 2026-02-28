import { useTranslation } from "#hooks/useTranslation"
import { LogOut, Loader2 } from "lucide-react"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import Badge from "@components/User/Settings/ui/Badge"

export default function SessionsTab({ onSignOut, loading }) {
  const { t } = useTranslation("settings")

  return (
    <div>
      <h2 className="text-lg font-semibold text-white">
        {t("sessions.title")}
      </h2>

      <p className="text-sm text-zinc-500 mt-1 mb-6">
        {t("sessions.description")}
      </p>

      <SettingsSection title={t("sessions.currentSession")}>
        <div className="flex items-center gap-3 p-3.5 bg-zinc-900/50 rounded-lg border border-zinc-700/50 mb-5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300 font-medium">
              {t("sessions.activeSession")}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {t("sessions.currentBrowser")}
            </p>
          </div>
          <Badge text={t("sessions.active")} color="green" />
        </div>

        <button
          onClick={onSignOut}
          disabled={loading}
          className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          {t("sessions.signOut")}
        </button>
      </SettingsSection>
    </div>
  )
}
