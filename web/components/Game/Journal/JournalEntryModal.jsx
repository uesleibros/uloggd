import { useState } from "react"
import { X, Trash2, Clock, Calendar } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export function JournalEntryModal({ entry, date, onSave, onRemove, onClose }) {
  const { t } = useTranslation("journal.modal.entry")
  const isEditing = !!entry

  const [hours, setHours] = useState(entry?.hours?.toString() || "")
  const [minutes, setMinutes] = useState(entry?.minutes?.toString() || "")
  const [note, setNote] = useState(entry?.note || "")
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  async function handleSave() {
    setSaving(true)
    const success = await onSave({
      id: entry?.id,
      playedOn: date,
      hours: hours ? parseInt(hours) : 0,
      minutes: minutes ? parseInt(minutes) : 0,
      note: note.trim(),
    })
    if (!success) setSaving(false)
  }

  async function handleRemove() {
    setRemoving(true)
    await onRemove()
    setRemoving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">{displayDate}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              <Clock className="w-3 h-3 inline mr-1" />
              {t("time")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                min="0"
                max="9999"
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white text-center focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="text-zinc-500 text-sm">h</span>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                min="0"
                max="59"
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white text-center focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="text-zinc-500 text-sm">m</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">{t("note")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-700 bg-zinc-800/30">
          {isEditing && onRemove ? (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {removing ? t("removing") : t("remove")}
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}