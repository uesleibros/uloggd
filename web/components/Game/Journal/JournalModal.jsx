import { useState, useEffect } from "react"
import { X, Check, Plus, Trash2, Calendar, Clock, Pencil } from "lucide-react"
import { supabase } from "#lib/supabase"
import { useTranslation } from "#hooks/useTranslation"
import { notify } from "@components/UI/Notification"
import PlatformSelector from "@components/UI/PlatformSelector"

const MAX_TITLE = 100
const MAX_NOTE = 500

function EntryItem({ entry, onEdit, onRemove, deleting }) {
  const { t } = useTranslation("journal.modal")
  
  const totalMinutes = (entry.hours || 0) * 60 + (entry.minutes || 0)
  const displayHours = Math.floor(totalMinutes / 60)
  const displayMinutes = totalMinutes % 60

  return (
    <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 group">
      <div className="flex-shrink-0 w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
        <Calendar className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-white">
            {new Date(entry.played_on + "T00:00:00").toLocaleDateString()}
          </span>
          {totalMinutes > 0 && (
            <span className="text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {displayHours > 0 && `${displayHours}h`}
              {displayMinutes > 0 && `${displayMinutes}m`}
            </span>
          )}
        </div>
        {entry.note && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{entry.note}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(entry)}
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-all cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          disabled={deleting}
          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-all cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function EntryForm({ entry, onSave, onCancel, saving }) {
  const { t } = useTranslation("journal.modal")
  const [playedOn, setPlayedOn] = useState(entry?.played_on || new Date().toISOString().split("T")[0])
  const [hours, setHours] = useState(entry?.hours?.toString() || "")
  const [minutes, setMinutes] = useState(entry?.minutes?.toString() || "")
  const [note, setNote] = useState(entry?.note || "")

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      id: entry?.id,
      playedOn,
      hours: hours ? parseInt(hours) : 0,
      minutes: minutes ? parseInt(minutes) : 0,
      note: note.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("entry.date")}</label>
          <input
            type="date"
            value={playedOn}
            onChange={(e) => setPlayedOn(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("entry.time")}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              min="0"
              max="9999"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <span className="text-zinc-500 text-sm">h</span>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              min="0"
              max="59"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <span className="text-zinc-500 text-sm">m</span>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("entry.note")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("entry.notePlaceholder")}
          maxLength={MAX_NOTE}
          rows={2}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          {t("entry.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? t("entry.saving") : t("entry.save")}
        </button>
      </div>
    </form>
  )
}

export function JournalModal({ game, existingJourney, onClose, onDeleted }) {
  const { t } = useTranslation("journal.modal")
  const isEditing = !!existingJourney
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)

  const [title, setTitle] = useState(existingJourney?.title || "")
  const [platform, setPlatform] = useState(existingJourney?.platform_id?.toString() || "")
  const [entries, setEntries] = useState([])
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)

  useEffect(() => {
    if (existingJourney?.id) {
      fetchJourneyDetails()
    }
  }, [existingJourney?.id])

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function fetchJourneyDetails() {
    try {
      const res = await fetch(`/api/journeys/get?journeyId=${existingJourney.id}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch {}
  }

  async function handleSave() {
    if (!title.trim()) {
      notify(t("errors.titleRequired"), "error")
      return
    }

    setSubmitting(true)
    try {
      const token = await getToken()
      if (!token) {
        notify(t("errors.notLoggedIn"), "error")
        return
      }

      const payload = {
        gameId: game.id,
        gameSlug: game.slug,
        title: title.trim(),
        platformId: platform ? parseInt(platform) : null,
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
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    setDeleting(true)
    try {
      const token = await getToken()
      if (!token) return
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
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveEntry(entryData) {
    setSavingEntry(true)
    try {
      const token = await getToken()
      if (!token) return

      const isUpdating = !!entryData.id
      const url = isUpdating ? "/api/journeys/@me/updateEntry" : "/api/journeys/@me/addEntry"
      const payload = isUpdating
        ? { entryId: entryData.id, playedOn: entryData.playedOn, hours: entryData.hours, minutes: entryData.minutes, note: entryData.note }
        : { journeyId: existingJourney.id, playedOn: entryData.playedOn, hours: entryData.hours, minutes: entryData.minutes, note: entryData.note }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        notify(isUpdating ? t("entry.updated") : t("entry.added"))
        setShowEntryForm(false)
        setEditingEntry(null)
        fetchJourneyDetails()
      } else {
        notify(t("entry.saveFailed"), "error")
      }
    } catch {
      notify(t("entry.saveFailed"), "error")
    } finally {
      setSavingEntry(false)
    }
  }

  async function handleRemoveEntry(entryId) {
    setDeletingEntry(true)
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch("/api/journeys/@me/removeEntry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entryId }),
      })

      if (res.ok) {
        notify(t("entry.removed"))
        fetchJourneyDetails()
      } else {
        notify(t("entry.removeFailed"), "error")
      }
    } catch {
      notify(t("entry.removeFailed"), "error")
    } finally {
      setDeletingEntry(false)
    }
  }

  const releaseYear = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null

  const totalMinutes = entries.reduce((acc, e) => acc + (e.hours || 0) * 60 + (e.minutes || 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  return (
    <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] bg-zinc-900 md:border md:border-zinc-700 md:rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-4 pb-2 border-b border-zinc-700 flex-shrink-0 md:px-5 md:pb-3"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {game.cover && (
            <img
              src={`https:${game.cover.url}`}
              alt=""
              className="w-8 h-11 rounded object-cover bg-zinc-800 flex-shrink-0"
              draggable={false}
            />
          )}
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-white truncate">{game.name}</h2>
            {releaseYear && <p className="text-xs text-zinc-500">{releaseYear}</p>}
          </div>
        </div>
        <div className="flex flex-col items-center flex-shrink-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:bg-zinc-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-zinc-600 mt-1 uppercase tracking-wide hidden md:block">
            ESC
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-5 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">{t("title")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            maxLength={MAX_TITLE}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">{t("platform")}</label>
          <PlatformSelector
            value={platform}
            onChange={setPlatform}
            platforms={game.platforms}
          />
        </div>

        {isEditing && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300">{t("entries")}</label>
                {entries.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {entries.length} {entries.length === 1 ? t("session") : t("sessions")}
                    {totalMinutes > 0 && (
                      <span className="ml-1">
                        • {totalHours > 0 && `${totalHours}h`}{remainingMinutes > 0 && `${remainingMinutes}m`}
                      </span>
                    )}
                  </p>
                )}
              </div>
              {!showEntryForm && !editingEntry && (
                <button
                  type="button"
                  onClick={() => setShowEntryForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("addEntry")}
                </button>
              )}
            </div>

            {showEntryForm && (
              <EntryForm
                onSave={handleSaveEntry}
                onCancel={() => setShowEntryForm(false)}
                saving={savingEntry}
              />
            )}

            {editingEntry && (
              <EntryForm
                entry={editingEntry}
                onSave={handleSaveEntry}
                onCancel={() => setEditingEntry(null)}
                saving={savingEntry}
              />
            )}

            {!showEntryForm && !editingEntry && (
              <div className="space-y-2">
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-sm">
                    {t("noEntries")}
                  </div>
                ) : (
                  entries.map((entry) => (
                    <EntryItem
                      key={entry.id}
                      entry={entry}
                      onEdit={setEditingEntry}
                      onRemove={handleRemoveEntry}
                      deleting={deletingEntry}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {isEditing && (
          <div className="pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? t("deleting") : t("delete")}
            </button>
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-end gap-2 sm:gap-3 px-4 md:px-5 py-3 border-t border-zinc-700 flex-shrink-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer active:bg-zinc-600"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
            submitting
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
              : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white cursor-pointer shadow-lg shadow-emerald-500/20"
          }`}
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isEditing ? t("save") : t("create")}
        </button>
      </div>
    </div>
  )
}