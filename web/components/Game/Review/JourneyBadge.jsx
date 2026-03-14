import { BookOpen } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export function JourneyBadge({ journey, onClick }) {
  const { t } = useTranslation("reviews")

  if (!journey) return null

  const hours = Math.floor(journey.total_minutes / 60)
  const mins = journey.total_minutes % 60

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 cursor-pointer"
    >
      <BookOpen className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
      <span className="text-xs text-emerald-400 font-medium truncate max-w-32">
        {journey.title}
      </span>
      <span className="text-xs text-emerald-400/70">
        {journey.total_sessions} {journey.total_sessions === 1 ? t("session") : t("sessions")}
        {journey.total_minutes > 0 && (
          <>
            {" · "}
            {hours > 0 && `${hours}h`}
            {mins > 0 && `${mins}m`}
          </>
        )}
      </span>
    </button>
  )
}
