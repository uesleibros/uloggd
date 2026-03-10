import { Clock, Calendar, Pencil, Gamepad2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export function JournalCard({ journey, onEdit }) {
  const { t } = useTranslation("journal")

  if (!journey) return null

  const entryCount = journey.journey_entries?.[0]?.count || 0
  const totalMinutes = journey.total_minutes || 0
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate">{journey.title}</h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {entryCount} {entryCount === 1 ? t("card.session") : t("card.sessions")}
            </span>
            {totalMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {totalHours > 0 && `${totalHours}h`}
                {remainingMinutes > 0 && `${remainingMinutes}m`}
              </span>
            )}
            {journey.platform_id && (
              <span className="flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5" />
                {journey.platform_name || t("card.platform")}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex-shrink-0 p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-all cursor-pointer"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
      {journey.first_session && journey.last_session && (
        <div className="mt-3 pt-3 border-t border-zinc-700/50 text-xs text-zinc-500">
          {new Date(journey.first_session).toLocaleDateString()} — {new Date(journey.last_session).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}