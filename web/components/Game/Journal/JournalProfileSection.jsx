import { useState, useEffect, useCallback } from "react"
import { Calendar, Clock, Play, Flag, ChevronRight, Gamepad2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { JournalViewModal } from "./JournalViewModal"

export function JournalProfileSection({ username }) {
  const { t } = useTranslation("journal.profile")

  const [journeys, setJourneys] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [viewingId, setViewingId] = useState(null)

  const fetchJourneys = useCallback(async (pageNum, append = false, signal) => {
    if (!username) return
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const res = await fetch(`/api/journeys/byUser?username=${username}&page=${pageNum}&limit=12`, { signal })

      if (res.ok && !signal?.aborted) {
        const data = await res.json()

        if (append) {
          setJourneys(prev => [...prev, ...(data.journeys || [])])
        } else {
          setJourneys(data.journeys || [])
        }

        setTotalPages(data.totalPages || 1)
      }
    } catch (e) {
      if (e?.name === "AbortError") return
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [username])

  useEffect(() => {
    const ac = new AbortController()
    setPage(1)
    fetchJourneys(1, false, ac.signal)
    return () => ac.abort()
  }, [fetchJourneys])

  function handleLoadMore() {
    if (loadingMore || page >= totalPages) return
    const next = page + 1
    setPage(next)
    fetchJourneys(next, true)
  }

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
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (journeys.length === 0) return null

  const activeJourneys = journeys.filter(j => !j.finished_at)
  const completedJourneys = journeys.filter(j => !!j.finished_at)

  return (
    <>
      <div className="space-y-6">
        {activeJourneys.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
              {t("playing")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeJourneys.map(j => (
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

        {completedJourneys.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Flag className="w-3 h-3 text-amber-400 fill-amber-400" />
              {t("completed")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {completedJourneys.map(j => (
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

        {page < totalPages && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? (
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
              ) : (
                t("loadMore")
              )}
            </button>
          </div>
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

  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3.5 bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all cursor-pointer text-left group w-full"
    >
      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
        <Gamepad2 className="w-5 h-5 text-emerald-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{j.title}</p>

        <p className="text-xs text-zinc-600 truncate mt-0.5">
          {j.game_slug?.replace(/-/g, " ")}
        </p>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {j.total_sessions} {j.total_sessions === 1 ? t("session") : t("sessions")}
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
