import { useState, useEffect } from "react"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import { Trash2, Gamepad2 } from "lucide-react"

export default function DeleteTierlistModal({ isOpen, onClose, tierlist, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) setError(null)
  }, [isOpen])

  async function handleDelete() {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Não autenticado")

      const res = await fetch("/api/tierlists/@me/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tierlistId: tierlist.id }),
      })

      if (!res.ok) throw new Error("Erro ao excluir")
      onDeleted?.(tierlist.id)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const gamesCount = tierlist?.games_count || 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir tierlist" maxWidth="max-w-md" fullscreenMobile showMobileGrip>
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Tem certeza que deseja excluir <span className="text-white font-semibold">&quot;{tierlist?.title}&quot;</span>?
            </p>
            <p className="text-xs text-zinc-500 mt-1">Esta ação não pode ser desfeita.</p>
          </div>
        </div>

        {gamesCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <Gamepad2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              {gamesCount} jogo{gamesCount !== 1 ? "s" : ""} classificado{gamesCount !== 1 ? "s" : ""} será{gamesCount !== 1 ? "ão" : ""} removido{gamesCount !== 1 ? "s" : ""}.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-zinc-800">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Excluir tierlist
          </button>
        </div>
      </div>
    </Modal>
  )
}