import { useState } from "react"
import { Trash2, Clock, Calendar } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

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
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-md"
      showCloseButton={false}
      fullscreenMobile
      showMobileGrip
      zIndex={10000}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-700 bg-zinc-800/50">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white capitalize truncate">{displayDate}</p>
          <p className="text-xs text-zinc-500">{isEditing ? t("editSession") : t("addSession")}</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
            <Clock className="w-4 h-4 text-zinc-500" />
            {t("time")}
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                min="0"
                max="9999"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-base text-white text-center focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-xs text-zinc-600 text-center mt-1">{t("hours")}</p>
            </div>
            <span className="text-2xl text-zinc-600 font-light">:</span>
            <div className="flex-1">
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                min="0"
                max="59"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-base text-white text-center focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-xs text-zinc-600 text-center mt-1">{t("minutes")}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">{t("note")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-700 bg-zinc-800/30">
        {isEditing && onRemove ? (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {removing ? t("removing") : t("remove")}
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
