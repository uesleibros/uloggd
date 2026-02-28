import { GAME_STATUS } from "#constants/game"
import { useTranslation } from "#hooks/useTranslation"

export default function StatusBadge({ status, className = "" }) {
  const { t } = useTranslation("quickActions")
  const config = GAME_STATUS[status]
  if (!config) return null

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgClass} ${config.textColor} ${config.borderClass} ${className}`}>
      {t(`status.${status}.label`)}
    </span>
  )
}
