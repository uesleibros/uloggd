import { useState } from "react"
import { Calendar, Clock, Play, Flag, ChevronRight, Gamepad2, BookOpen } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { JournalViewModal } from "@components/Journal/JournalViewModal"
import Pagination from "@components/UI/Pagination"

export default function JourneysSection({ journeys, loading, total, currentPage, totalPages, onPageChange }) {
  const { t } = useTranslation("profile")
  const [viewingId, setViewingId] = useState(null)

  function formatTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    if (m > 0) return `${m}m`
    return null
  }

  function formatDate(dateStr) {
    if (!dateStr) return null
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-zinc-800/30 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (journeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-500">{t("journeys.empty")}</p>
      </div>
    )
  }

  const active = journeys.filter(j => !j.finished_at)
  const completed = journeys.filter(j => !!j.finished_at)

  return (
    <>
      <div className="space-y-6">
        {active.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
              {t("journeys.playing")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {active.map(j => (
                <JourneyCard
                  key={j.id}
                  journey={j}
                  formatTime={formatTime}
                  formatDate={formatDate}
                  onClick={() => setViewingId(j.id)}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Flag className="w-3 h-3 text-amber-400 fill-amber-400" />
              {t("journeys.completed")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {completed.map(j => (
                <JourneyCard
                  key={j.id}
                  journey={j}
                  formatTime={formatTime}
                  formatDate={formatDate}
                  onClick={() => setViewingId(j.id)}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        )}
      </div>

      {viewingId && (
        <JournalViewModal
          journeyId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </>
  )
}

function JourneyCard({ journey: j, formatTime, formatDate, onClick, t }) {
  const time = formatTime(j.total_minutes)
  const gameName = j.game_slug?.replace(/-/g, " ")

  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3.5 bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all cursor-pointer text-left group w-full"
    >
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
        ${j.finished_at ? "bg-amber-500/10" : "bg-emerald-500/10"}
      `}>
        <Gamepad2 className={`w-5 h-5 ${j.finished_at ? "text-amber-400" : "text-emerald-400"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{j.title}</p>
        <p className="text-xs text-zinc-600 truncate mt-0.5 capitalize">{gameName}</p>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {j.total_sessions} {j.total_sessions === 1 ? t("journeys.session") : t("journeys.sessions")}
          </span>
          {time && (
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {time}
            </span>
          )}
        </div>

        {(j.started_at || j.finished_at) && (
          <div className="flex items-center gap-2 mt-1.5">
            {j.started_at && (
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Play className="w-2 h-2 text-sky-400 fill-sky-400" />
                {formatDate(j.started_at)}
              </span>
            )}
            {j.finished_at && (
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Flag className="w-2 h-2 text-amber-400 fill-amber-400" />
                {formatDate(j.finished_at)}
              </span>
            )}
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0 mt-1" />
    </button>
  )
}
