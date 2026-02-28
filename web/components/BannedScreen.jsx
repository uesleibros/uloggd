import { Ban } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export default function BannedScreen({ reason, expires_at }) {
  const { t } = useTranslation("banned")
  
  const remaining = expires_at
    ? Math.max(0, new Date(expires_at) - new Date())
    : null

  const hours = remaining ? Math.floor(remaining / 3600000) : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Ban className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">{t("title")}</h1>

        {reason && (
          <p className="text-zinc-400 mb-4">
            {t("reason")}: <span className="text-red-400">{reason}</span>
          </p>
        )}

        {expires_at ? (
          <p className="text-sm text-zinc-500">
            {t("expiresIn", { hours })}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">
            {t("permanent")}
          </p>
        )}
      </div>
    </div>
  )
}
