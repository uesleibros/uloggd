import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { X, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Play, Flag, Pencil } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useCustomCovers } from "#hooks/useCustomCovers"
import GameCover from "@components/Game/GameCover"
import { JournalCalendar } from "./JournalCalendar"
import { JournalTimeline } from "./JournalTimeline"
import { JournalModal } from "./JournalModal"

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
]

export function JournalViewModal({ journeyId, onClose, onUpdate }) {
  const { t } = useTranslation("journal.view")
  const { user: currentUser } = useAuth()

  const [journey, setJourney] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("calendar")
  const [editMode, setEditMode] = useState(false)

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const slugs = useMemo(() => journey?.game_slug ? [journey.game_slug] : [], [journey?.game_slug])
  const { getCustomCover, loading: coversLoading } = useCustomCovers(journey?.user_id, slugs)
  const customCoverUrl = journey?.game_slug ? getCustomCover(journey.game_slug) : null
  const coverLoading = journey?.user_id && coversLoading

  useEffect(() => {
    if (!journeyId) return
    fetchJourney()
  }, [journeyId])

  async function fetchJourney() {
    setLoading(true)
    try {
      const res = await fetch(`/api/journeys/get?journeyId=${journeyId}`)
      if (res.ok) {
        const data = await res.json()
        setJourney(data)
        setEntries(data.entries || [])

        if (data.entries?.length > 0) {
          const lastEntry = data.entries[data.entries.length - 1]
          const d = new Date(lastEntry.played_on + "T00:00:00")
          setCurrentMonth(d.getMonth())
          setCurrentYear(d.getFullYear())
        }
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const entryMap = useMemo(() => {
    const map = {}
    entries.forEach(e => { map[e.played_on] = e })
    return map
  }, [entries])

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  function handleEditClose() {
    setEditMode(false)
    fetchJourney()
    onUpdate?.()
  }

  function handleDeleted() {
    onUpdate?.()
    onClose()
  }

  const stats = journey?.stats
  const user = journey?.users
  const game = journey?.games

  const isOwner = currentUser?.id === journey?.user_id

  const years = []
  for (let y = today.getFullYear() + 1; y >= 1970; y--) years.push(y)

  const gameForCover = game ? { cover: { url: game.cover_url }, name: game.name } : null

  if (editMode && isOwner && journey) {
    const gameObj = {
      id: journey.game_id,
      slug: journey.game_slug,
      name: game?.name || journey.title,
      cover: game?.cover_url ? { url: game.cover_url } : null,
    }

    const journeyObj = {
      id: journey.id,
      title: journey.title,
      platform_id: journey.platform_id,
      started_at: journey.started_at,
      finished_at: journey.finished_at,
    }

    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
        <JournalModal
          game={gameObj}
          existingJourney={journeyObj}
          onClose={handleEditClose}
          onDeleted={handleDeleted}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
      <div className="w-full h-full md:h-auto md:w-2xl md:max-w-2xl md:max-h-[90vh] bg-zinc-900 md:border md:border-zinc-700 md:rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !journey ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-zinc-500">{t("notFound")}</p>
          </div>
        ) : (
          <>
            <div
              className="flex items-start justify-between gap-4 px-4 pb-3 border-b border-zinc-700 flex-shrink-0 md:px-5"
              style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <Link
                  to={`/game/${game?.slug || journey.game_slug}`}
                  onClick={onClose}
                  className="flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-500 transition-colors"
                >
                  <GameCover
                    game={gameForCover}
                    customCoverUrl={customCoverUrl}
                    loading={coverLoading}
                    className="w-full h-full"
                  />
                </Link>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold text-white truncate">{journey.title}</h2>
                  {game && game.name !== journey.title && (
                    <Link
                      to={`/game/${game.slug}`}
                      onClick={onClose}
                      className="text-sm text-zinc-400 hover:text-white transition-colors truncate block"
                    >
                      {game.name}
                    </Link>
                  )}
                  {user && (
                    <Link
                      to={`/u/${user.username}`}
                      onClick={onClose}
                      className="flex items-center gap-2 mt-1.5 group w-fit"
                    >
                      <img
                        src={user.avatar}
                        alt=""
                        className="w-5 h-5 rounded-full bg-zinc-800"
                      />
                      <span className="text-sm text-zinc-500 group-hover:text-white transition-colors">{user.username}</span>
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {stats && (
              <div className="flex items-center gap-4 px-4 md:px-5 py-3 border-b border-zinc-800 overflow-x-auto flex-shrink-0">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-zinc-400">
                    <span className="text-white font-medium">{stats.total_sessions}</span> {stats.total_sessions === 1 ? t("session") : t("sessions")}
                  </span>
                </div>

                {stats.total_minutes > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-zinc-400">
                      <span className="text-white font-medium">
                        {stats.total_hours > 0 && `${stats.total_hours}h `}
                        {stats.total_minutes % 60 > 0 && `${stats.total_minutes % 60}m`}
                      </span>
                    </span>
                  </div>
                )}

                {journey.started_at && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
                    <span className="text-xs text-zinc-400">
                      {new Date(journey.started_at + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                )}

                {journey.finished_at && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Flag className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs text-zinc-400">
                      {new Date(journey.finished_at + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex border-b border-zinc-800 flex-shrink-0">
              <button
                onClick={() => setTab("calendar")}
                className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors cursor-pointer ${
                  tab === "calendar"
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t("tabCalendar")}
              </button>
              <button
                onClick={() => setTab("timeline")}
                className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors cursor-pointer ${
                  tab === "timeline"
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t("tabTimeline")}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-5">
              {tab === "calendar" ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <select
                      value={currentMonth}
                      onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none cursor-pointer"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i}>{t(`months.${m}`)}</option>
                      ))}
                    </select>

                    <select
                      value={currentYear}
                      onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none cursor-pointer"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={prevMonth} className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors cursor-pointer">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={nextMonth} className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors cursor-pointer">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <JournalCalendar
                    month={currentMonth}
                    year={currentYear}
                    entries={entryMap}
                    startedAt={journey.started_at}
                    finishedAt={journey.finished_at}
                    readOnly
                  />
                </>
              ) : (
                <JournalTimeline
                  entries={entries}
                  startedAt={journey.started_at}
                  finishedAt={journey.finished_at}
                />
              )}
            </div>

            <div
              className="flex items-center justify-end gap-2 px-4 md:px-5 py-3 border-t border-zinc-700 flex-shrink-0"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
            >
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  {t("edit")}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all cursor-pointer"
              >
                {t("close")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
