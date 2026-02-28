import { useState } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import { Trash2 } from "lucide-react"

export default function RemoveItemModal({ isOpen, onClose, item, gameName, onRemoved }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/lists/@me/removeItem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ listId: item.list_id || item.listId, itemId: item.id }),
      })

      if (!res.ok) throw new Error()
      onRemoved(item.id)
      onClose()
    } catch {} finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("lists.removeItem.title")}
      maxWidth="max-w-md"
      fullscreenMobile
      showMobileGrip
    >
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        <p className="text-sm text-zinc-400">
          {t("lists.removeItem.confirm", {
            name: gameName || item?.game_slug,
          })}
        </p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg"
          >
            {t("lists.removeItem.cancel")}
          </button>
          <button
            onClick={handleRemove}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {t("lists.removeItem.remove")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
