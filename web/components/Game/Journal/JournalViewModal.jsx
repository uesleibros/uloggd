import { useState, useEffect, useMemo } from "react"
import { X, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Play, Flag, User } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { JournalCalendar } from "./JournalCalendar"
import { JournalTimeline } from "./JournalTimeline"

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
]

export function JournalViewModal({ journeyId, onClose }) {
  const { t } = useTranslation("journal.view")

  const [journey, setJourney] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("calendar")

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

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

  const stats = journey?.stats
  const user = journey?.users

  const years = []
  for (let y = today.getFullYear() + 1; y >= 1970; y--) years.push(y)

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-2xl"
      showCloseButton={false}
      fullscreenMobile
      showMobileGrip
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !journey ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-zinc-500">{t("notFound")}</p>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-700">
            <div className="min-w-0">
              <h3 className="text-base md:text-lg font-semibold text-white truncate">{journey.title}</h3>
              {user && (
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-5 h-5 rounded-full bg-zinc-800"
                  />
                  <span className="text-sm text-zinc-400">{user.username}</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {stats && (
            <div className="flex items-center gap-4 px-5 py-3 border-b border-zinc-800 overflow-x-auto">
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

          <div className="flex border-b border-zinc-800">
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

          <div className="p-4 md:p-5 overflow-y-auto max-h-[60vh] md:max-h-[55vh]">
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
        </>
      )}
    </Modal>
  )
}
