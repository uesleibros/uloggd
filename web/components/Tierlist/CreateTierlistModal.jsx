import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import { Plus, Globe, Lock } from "lucide-react"
import { encode } from "#utils/shortId.js"

export default function CreateTierlistModal({ isOpen, onClose, onCreated }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setTitle("")
      setDescription("")
      setIsPublic(true)
      setError(null)
    }
  }, [isOpen])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return setError("Título é obrigatório")
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Não autenticado")

      const res = await fetch("/api/tierlists/@me/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          isPublic,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao criar tierlist")
      }

      const tierlist = await res.json()
      onCreated?.({ ...tierlist, games_count: 0, tiers_preview: [] })
      onClose()
      navigate(`/tierlist/${encode(tierlist.id)}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar nova tierlist" maxWidth="max-w-lg" fullscreenMobile showMobileGrip>
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Título</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Minha tierlist de jogos..."
            className="w-full px-4 py-3 sm:py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            autoFocus
          />
          <span className="text-xs text-zinc-600 mt-1.5 block text-right">{title.length}/100</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Descrição <span className="text-zinc-600 font-normal">(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Descreva sua tierlist..."
            className="w-full px-4 py-3 sm:py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
          <span className="text-xs text-zinc-600 mt-1.5 block text-right">{description.length}/500</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2.5">Visibilidade</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                isPublic
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <Globe className="w-4 h-4" />
              Pública
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                !isPublic
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <Lock className="w-4 h-4" />
              Privada
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-zinc-800">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Criar tierlist
          </button>
        </div>
      </form>
    </Modal>
  )
}