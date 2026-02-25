import { useState, useEffect } from "react"
import { supabase } from "#lib/supabase.js"
import Modal from "@components/UI/Modal"
import { notify } from "@components/UI/Notification"
import { Ban, AlertTriangle, Loader2 } from "lucide-react"

export default function BanUserModal({ isOpen, onClose, profile }) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) setReason("")
  }, [isOpen])

  async function handleBan() {
    if (!reason.trim()) {
      notify("Informe o motivo.", "error")
      return
    }

    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/moderation/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: profile.id, reason: reason.trim() }),
      })

      if (res.ok) {
        notify("Usuário banido.", "success")
        onClose()
      } else {
        const data = await res.json()
        notify(
          data.error === "cannot ban moderator"
            ? "Não é possível banir moderadores."
            : "Erro ao banir.",
          "error"
        )
      }
    } catch (e) {
      console.error(e)
      notify("Erro ao banir.", "error")
    }
    setLoading(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Banir usuário</h3>
            <p className="text-xs text-zinc-500">@{profile.username}</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/80 leading-relaxed">
              Esta ação impedirá o usuário de acessar a plataforma. Pode ser revertida posteriormente.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-2">
              Motivo do banimento
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleBan}
              disabled={loading || !reason.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-400 disabled:bg-red-500/50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Ban className="w-4 h-4" /> Banir
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}