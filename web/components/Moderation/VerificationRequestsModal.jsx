import { useState, useEffect } from "react"
import { supabase } from "#lib/supabase.js"
import Modal from "@components/UI/Modal"
import { notify } from "@components/UI/Notification"
import { formatDateLong } from "#utils/formatDate"
import { BadgeCheck, X, Check, Clock, Loader2 } from "lucide-react"

export default function VerificationRequestsModal({ isOpen, onClose, profile }) {
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    if (isOpen) fetchRequest()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setShowReject(false)
      setRejectionReason("")
    }
  }, [isOpen])

  async function fetchRequest() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setLoading(true)
    try {
      const res = await fetch("/api/verification/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: profile.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setRequest(data.request || null)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleReview(action) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !request) return

    setReviewing(true)
    try {
      const res = await fetch("/api/verification/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requestId: request.id,
          action,
          rejectionReason: action === "reject" ? rejectionReason : null,
        }),
      })

      if (res.ok) {
        notify(
          action === "approve" ? "Usuário verificado!" : "Solicitação rejeitada.",
          action === "approve" ? "success" : "info"
        )
        onClose()
      } else {
        notify("Erro ao processar.", "error")
      }
    } catch (e) {
      console.error(e)
      notify("Erro ao processar.", "error")
    }
    setReviewing(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Verificação</h3>
              <p className="text-xs text-zinc-500">@{profile.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
            </div>
          ) : !request ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <X className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">Nenhuma solicitação pendente</p>
            </div>
          ) : showReject ? (
            <div className="space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Motivo da rejeição (opcional)..."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowReject(false)
                    setRejectionReason("")
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleReview("reject")}
                  disabled={reviewing}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejeitar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
                <p className="text-sm text-zinc-300 leading-relaxed">{request.reason}</p>
                <div className="flex items-center gap-1.5 mt-3 text-zinc-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">
                    {formatDateLong(new Date(request.created_at).getTime() / 1000)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleReview("approve")}
                  disabled={reviewing}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 hover:border-emerald-500 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {reviewing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Aprovar
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/30 hover:border-red-500 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Rejeitar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}