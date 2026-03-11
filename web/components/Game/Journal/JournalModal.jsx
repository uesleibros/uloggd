import { useState, useEffect, useMemo } from "react"
import { X, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, FastForward, Rewind } from "lucide-react"
import { supabase } from "#lib/supabase"
import { useTranslation } from "#hooks/useTranslation"
import { notify } from "@components/UI/Notification"
import { JournalCalendar } from "./JournalCalendar"
import { JournalSidebar } from "./JournalSidebar"
import { JournalEntryModal } from "./JournalEntryModal"

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
]

export function JournalModal({ game, existingJourney, onClose, onDeleted }) {
  const { t } = useTranslation("journal.modal")
  const isEditing = !!existingJourney

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(existingJourney?.title || "")
  const [platform, setPlatform] = useState(existingJourney?.platform_id?.toString() || "")
  const [startedAt, setStartedAt] = useState(existingJourney?.started_at || "")
  const [finishedAt, setFinishedAt] = useState(existingJourney?.finished_at || "")

  const [selectedDate, setSelectedDate] = useState(null)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)

  useEffect(() => {
    if (existingJourney?.id) fetchJourneyDetails()
  }, [existingJourney?.id])

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

	async function fetchJourneyDetails() {
	  setLoading(true)
	  try {
	    const res = await fetch(`/api/journeys/get?journeyId=${existingJourney.id}`)
	    if (res.ok) {
	      const data = await res.json()
	      setEntries(data.entries || [])
	      setStartedAt(data.started_at || "")
	      setFinishedAt(data.finished_at || "")
	
	      if (data.entries?.length > 0) {
	        const lastEntry = data.entries[data.entries.length - 1]
	        const lastDate = new Date(lastEntry.played_on + "T00:00:00")
	        setCurrentMonth(lastDate.getMonth())
	        setCurrentYear(lastDate.getFullYear())
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

  function jumpToToday() {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  function jumpToLatest() {
    if (entries.length === 0) return
    const sorted = [...entries].sort((a, b) => new Date(b.played_on) - new Date(a.played_on))
    const d = new Date(sorted[0].played_on + "T00:00:00")
    setCurrentMonth(d.getMonth())
    setCurrentYear(d.getFullYear())
  }

  function jumpToStart() {
    if (startedAt) {
      const d = new Date(startedAt + "T00:00:00")
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
      return
    }
    if (entries.length === 0) return
    const sorted = [...entries].sort((a, b) => new Date(a.played_on) - new Date(b.played_on))
    const d = new Date(sorted[0].played_on + "T00:00:00")
    setCurrentMonth(d.getMonth())
    setCurrentYear(d.getFullYear())
  }

  function jumpToFinish() {
    if (finishedAt) {
      const d = new Date(finishedAt + "T00:00:00")
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
      return
    }
    jumpToLatest()
  }

  function handleDayClick(dateStr) {
    const existing = entryMap[dateStr]
    setSelectedDate(dateStr)
    setEditingEntry(existing || null)
    setShowEntryModal(true)
  }

  async function handleBulkAdd(dates) {
    const token = await getToken()
    if (!token) return

    try {
      const res = await fetch("/api/journeys/@me/bulkAddEntries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ journeyId: existingJourney.id, dates }),
      })

      if (res.ok) {
        const data = await res.json()
        notify(t("entry.added") + ` (${data.inserted})`)
        fetchJourneyDetails()
      } else {
        notify(t("entry.saveFailed"), "error")
      }
    } catch {
      notify(t("entry.saveFailed"), "error")
    }
  }

  async function handleBulkRemove(dates) {
    const token = await getToken()
    if (!token) return

    const entryIds = dates.map(d => entryMap[d]?.id).filter(Boolean)
    if (entryIds.length === 0) return

    try {
      const res = await fetch("/api/journeys/@me/bulkRemoveEntries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entryIds }),
      })

      if (res.ok) {
        const data = await res.json()
        notify(t("entry.removed") + ` (${data.removed})`)
        fetchJourneyDetails()
      } else {
        notify(t("entry.removeFailed"), "error")
      }
    } catch {
      notify(t("entry.removeFailed"), "error")
    }
  }

	async function handleSaveEntry(entryData) {
	  const token = await getToken()
	  if (!token) return
	
	  const isUpdating = !!entryData.id
	
	  try {
	    const url = isUpdating ? "/api/journeys/@me/updateEntry" : "/api/journeys/@me/addEntry"
	    const payload = isUpdating
	      ? {
	          entryId: entryData.id,
	          playedOn: entryData.playedOn,
	          hours: entryData.hours,
	          minutes: entryData.minutes,
	          note: entryData.note,
	          setStarted: entryData.setStarted,
	          setFinished: entryData.setFinished,
	        }
	      : {
	          journeyId: existingJourney.id,
	          playedOn: entryData.playedOn,
	          hours: entryData.hours,
	          minutes: entryData.minutes,
	          note: entryData.note,
	          setStarted: entryData.setStarted,
	          setFinished: entryData.setFinished,
	        }
	
	    const res = await fetch(url, {
	      method: "POST",
	      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
	      body: JSON.stringify(payload),
	    })
	
	    if (res.ok) {
	      if (entryData.setStarted !== undefined) setStartedAt(entryData.setStarted || "")
	      if (entryData.setFinished !== undefined) setFinishedAt(entryData.setFinished || "")
	
	      notify(isUpdating ? t("entry.updated") : t("entry.added"))
	      setShowEntryModal(false)
	      setEditingEntry(null)
	      setSelectedDate(null)
	      fetchJourneyDetails()
	      return true
	    } else {
	      notify(t("entry.saveFailed"), "error")
	      return false
	    }
	  } catch {
	    notify(t("entry.saveFailed"), "error")
	    return false
	  }
	}

  async function handleRemoveEntry(entryId) {
    const token = await getToken()
    if (!token) return

    const entry = entries.find(e => e.id === entryId)
    const dateStr = entry?.played_on

    try {
      const res = await fetch("/api/journeys/@me/removeEntry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entryId }),
      })

      if (res.ok) {
        if (dateStr === startedAt) await updateMilestones(null, undefined)
        if (dateStr === finishedAt) await updateMilestones(undefined, null)

        notify(t("entry.removed"))
        setShowEntryModal(false)
        setEditingEntry(null)
        fetchJourneyDetails()
      } else {
        notify(t("entry.removeFailed"), "error")
      }
    } catch {
      notify(t("entry.removeFailed"), "error")
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      notify(t("errors.titleRequired"), "error")
      return
    }

    setSaving(true)
    try {
      const token = await getToken()
      if (!token) { notify(t("errors.notLoggedIn"), "error"); return }

      const payload = {
        gameId: game.id,
        gameSlug: game.slug,
        title: title.trim(),
        platformId: platform ? parseInt(platform) : null,
        startedAt: startedAt || null,
        finishedAt: finishedAt || null,
      }

      const url = isEditing ? "/api/journeys/@me/update" : "/api/journeys/@me/create"
      if (isEditing) payload.journeyId = existingJourney.id

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        notify(isEditing ? t("success.updated") : t("success.created"))
        onClose()
      } else {
        const err = await res.json().catch(() => ({}))
        notify(err.error || t("errors.saveFailed"), "error")
      }
    } catch {
      notify(t("errors.saveFailed"), "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    const token = await getToken()
    if (!token) return

    try {
      const res = await fetch("/api/journeys/@me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ journeyId: existingJourney.id }),
      })

      if (res.ok) {
        notify(t("success.deleted"))
        onDeleted?.()
        onClose()
      } else {
        notify(t("errors.deleteFailed"), "error")
      }
    } catch {
      notify(t("errors.deleteFailed"), "error")
    }
  }

  const releaseYear = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null

  const totalMinutes = entries.reduce((acc, e) => acc + (e.hours || 0) * 60 + (e.minutes || 0), 0)

  const years = []
  for (let y = today.getFullYear() + 1; y >= 1970; y--) years.push(y)

  return (
    <div className="w-full h-full md:h-auto md:w-3xl md:max-w-3xl md:max-h-[90vh] bg-zinc-900 md:border md:border-zinc-700 md:rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-4 pb-3 border-b border-zinc-700 flex-shrink-0 md:px-5"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}
      >
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-semibold text-white">
            {game.name} <span className="text-zinc-500 font-normal">{releaseYear}</span>
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col md:flex-row">
          <JournalSidebar
            game={game}
            title={title}
            setTitle={setTitle}
            platform={platform}
            setPlatform={setPlatform}
            startedAt={startedAt}
            finishedAt={finishedAt}
            totalMinutes={totalMinutes}
            totalSessions={entries.length}
            isEditing={isEditing}
            onDelete={handleDelete}
          />

          <div className="flex-1 p-4 md:p-5">
            {isEditing ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>{t(`months.${m}`)}</option>
                    ))}
                  </select>

                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                  startedAt={startedAt}
                  finishedAt={finishedAt}
                  onDayClick={handleDayClick}
                  onBulkAdd={handleBulkAdd}
                  onBulkRemove={handleBulkRemove}
                  loading={loading}
                />

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="text-xs text-zinc-500">{t("jumpTo")}</span>
                  <button onClick={jumpToStart} disabled={!startedAt && entries.length === 0} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <Rewind className="w-3 h-3" />
                    {t("start")}
                  </button>
                  <button onClick={jumpToToday} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
                    <CalendarIcon className="w-3 h-3" />
                    {t("today")}
                  </button>
                  <button onClick={jumpToLatest} disabled={entries.length === 0} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <Clock className="w-3 h-3" />
                    {t("latest")}
                  </button>
                  <button onClick={jumpToFinish} disabled={!finishedAt && entries.length === 0} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <FastForward className="w-3 h-3" />
                    {t("finish")}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("createFirst")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-end gap-2 sm:gap-3 px-4 md:px-5 py-3 border-t border-zinc-700 flex-shrink-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
      >
        <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all cursor-pointer">
          {t("cancel")}
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          {saving && <div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />}
          {isEditing ? t("save") : t("create")}
        </button>
      </div>

      {showEntryModal && (
        <JournalEntryModal
          entry={editingEntry}
          date={selectedDate}
          startedAt={startedAt}
          finishedAt={finishedAt}
          onSave={handleSaveEntry}
          onRemove={editingEntry ? () => handleRemoveEntry(editingEntry.id) : null}
          onClose={() => {
            setShowEntryModal(false)
            setEditingEntry(null)
            setSelectedDate(null)
          }}
        />
      )}
    </div>
  )
}

