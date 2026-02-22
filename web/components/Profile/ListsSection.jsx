import { useState, useEffect, useRef, useMemo } from "react"
import { Link } from "react-router-dom"
import { supabase } from "#lib/supabase"
import { useGamesBatch } from "#hooks/useGamesBatch"
import Modal from "@components/UI/Modal"
import Pagination from "@components/Profile/Pagination"
import {
  List, Plus, Lock, Globe, ChevronRight,
  MoreHorizontal, Pencil, Trash2, Gamepad2,
} from "lucide-react"

const LISTS_PER_PAGE = 12

function CreateListModal({ isOpen, onClose, onCreated }) {
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

      const res = await fetch("/api/lists/@me/create", {
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
        throw new Error(data.error || "Erro ao criar lista")
      }

      const list = await res.json()
      onCreated({ ...list, games_count: 0, game_slugs: [] })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar nova lista" maxWidth="max-w-md" fullscreenMobile showMobileGrip>
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Título</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Minha lista de jogos..."
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
            placeholder="Descreva sua lista..."
            className="w-full px-4 py-3 sm:py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
          <span className="text-xs text-zinc-600 mt-1.5 block text-right">{description.length}/500</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2.5">Visibilidade</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex flex-col items-center gap-2 px-4 py-4 sm:py-3.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                isPublic
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <Globe className="w-5 h-5" />
              <div className="text-center">
                <div>Pública</div>
                <div className={`text-[11px] mt-0.5 font-normal ${isPublic ? "text-indigo-400/60" : "text-zinc-600"}`}>
                  Todos podem ver
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex flex-col items-center gap-2 px-4 py-4 sm:py-3.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                !isPublic
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <Lock className="w-5 h-5" />
              <div className="text-center">
                <div>Privada</div>
                <div className={`text-[11px] mt-0.5 font-normal ${!isPublic ? "text-indigo-400/60" : "text-zinc-600"}`}>
                  Só você pode ver
                </div>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-zinc-800 mt-1">
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
            Criar lista
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditListModal({ isOpen, onClose, list, onUpdated }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && list) {
      setTitle(list.title || "")
      setDescription(list.description || "")
      setIsPublic(list.is_public !== false)
      setError(null)
    }
  }, [isOpen, list])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return setError("Título é obrigatório")
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Não autenticado")

      const res = await fetch("/api/lists/@me/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          listId: list.id,
          title: title.trim(),
          description: description.trim() || null,
          isPublic,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao atualizar")
      }

      const updated = await res.json()
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar lista" maxWidth="max-w-md" fullscreenMobile showMobileGrip>
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Título</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
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
            className="w-full px-4 py-3 sm:py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
          <span className="text-xs text-zinc-600 mt-1.5 block text-right">{description.length}/500</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2.5">Visibilidade</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex flex-col items-center gap-2 px-4 py-4 sm:py-3.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                isPublic
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <Globe className="w-5 h-5" />
              <div className="text-center">
                <div>Pública</div>
                <div className={`text-[11px] mt-0.5 font-normal ${isPublic ? "text-indigo-400/60" : "text-zinc-600"}`}>
                  Todos podem ver
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex flex-col items-center gap-2 px-4 py-4 sm:py-3.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                !isPublic
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <Lock className="w-5 h-5" />
              <div className="text-center">
                <div>Privada</div>
                <div className={`text-[11px] mt-0.5 font-normal ${!isPublic ? "text-indigo-400/60" : "text-zinc-600"}`}>
                  Só você pode ver
                </div>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-zinc-800 mt-1">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : "Salvar alterações"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteListModal({ isOpen, onClose, list, onDeleted }) {
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

      const res = await fetch("/api/lists/@me/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ listId: list.id }),
      })

      if (!res.ok) throw new Error("Erro ao excluir")
      onDeleted(list.id)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir lista" maxWidth="max-w-md" fullscreenMobile showMobileGrip>
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300 leading-relaxed">
              Tem certeza que deseja excluir <span className="text-white font-semibold">&quot;{list?.title}&quot;</span>?
            </p>
            <p className="text-xs text-zinc-500 mt-1.5">Esta ação não pode ser desfeita.</p>
          </div>
        </div>

        {list?.games_count > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <Gamepad2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              Esta lista contém {list.games_count} jogo{list.games_count !== 1 ? "s" : ""} que será{list.games_count !== 1 ? "ão" : ""} removido{list.games_count !== 1 ? "s" : ""}.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-zinc-800 mt-1">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Excluir lista
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ListActionMenu({ list, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    document.addEventListener("touchstart", handle)
    return () => {
      document.removeEventListener("mousedown", handle)
      document.removeEventListener("touchstart", handle)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
        className="p-1.5 sm:p-1 text-zinc-400 hover:text-zinc-200 active:text-zinc-200 transition-colors cursor-pointer rounded-md bg-black/40 backdrop-blur-sm hover:bg-black/60 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-800 border-t border-zinc-700 rounded-t-2xl p-2 pb-safe sm:hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-1 pb-3">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>
            <button
              onClick={() => { onEdit(list); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-zinc-300 active:bg-zinc-700/50 rounded-xl transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-zinc-500" />
              Editar lista
            </button>
            <button
              onClick={() => { onDelete(list); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-400 active:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir lista
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full mt-1 py-3 text-sm text-zinc-500 active:bg-zinc-700/30 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="hidden sm:block absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px]">
            <button
              onClick={() => { onEdit(list); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => { onDelete(list); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function CoverStrip({ slugs = [] }) {
  const { getGame } = useGamesBatch(slugs)

  if (slugs.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
        <Gamepad2 className="w-6 h-6 text-zinc-700" />
      </div>
    )
  }

  const covers = slugs
    .map(s => {
      const g = getGame(s)
      if (!g?.cover?.url) return null
      return `https:${g.cover.url.replace("t_thumb", "t_cover_big")}`
    })
    .filter(Boolean)

  if (covers.length === 0 && slugs.length > 0) {
    return <div className="w-full h-full bg-zinc-800 animate-pulse" />
  }

  if (covers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
        <Gamepad2 className="w-6 h-6 text-zinc-700" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {covers.map((url, i) => (
        <div key={i} className="h-full flex-1 min-w-0 overflow-hidden">
          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
      {covers.length < 4 && Array.from({ length: 4 - covers.length }).map((_, i) => (
        <div key={`empty-${i}`} className="h-full flex-1 min-w-0 bg-zinc-800/60" />
      ))}
    </div>
  )
}

function ListCard({ list, isOwnProfile, onEdit, onDelete }) {
  const gamesCount = list.games_count || 0

  return (
    <div className="group relative rounded-xl overflow-visible">
      <Link to={`/list/${list.id}`} className="block rounded-xl overflow-hidden bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-all duration-200">
        <div className="relative h-20 sm:h-24 overflow-hidden">
          <CoverStrip slugs={list.game_slugs || []} />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/30 to-zinc-900/10" />
        </div>

        <div className="p-3 sm:p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                {list.title}
              </h3>
              {list.description && (
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 sm:line-clamp-2">{list.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-2">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" />
              {gamesCount}
            </span>
            {list.is_public === false && (
              <span className="text-xs text-zinc-600 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Privada</span>
              </span>
            )}
            {list.updated_at && (
              <span className="text-[11px] text-zinc-600 ml-auto hidden sm:block">
                {new Date(list.updated_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
      </Link>

      {isOwnProfile && (
        <div className="absolute top-2 right-2 z-10">
          <ListActionMenu list={list} onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}
    </div>
  )
}

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const options = [
    { value: "updated", label: "Última atualização" },
    { value: "created", label: "Data de criação" },
    { value: "name", label: "Nome (A-Z)" },
    { value: "name-desc", label: "Nome (Z-A)" },
    { value: "games", label: "Mais jogos" },
  ]

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  const current = options.find(o => o.value === value) || options[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
      >
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">Ordenar</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[170px]">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2.5 sm:py-2 text-sm transition-colors cursor-pointer ${
                opt.value === value
                  ? "text-indigo-400 bg-indigo-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ListsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse border border-zinc-800">
          <div className="h-20 sm:h-24 bg-zinc-800 flex">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex-1 bg-zinc-800 border-r border-zinc-700/30 last:border-0" />
            ))}
          </div>
          <div className="p-3 sm:p-3.5 space-y-2 bg-zinc-800/30">
            <div className="h-4 w-2/3 bg-zinc-700/50 rounded" />
            <div className="h-3 w-1/3 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ListsSection({ lists: externalLists = [], setLists: setExternalLists, isOwnProfile, username, loading }) {
  const [sortBy, setSortBy] = useState("updated")
  const [currentPage, setCurrentPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [deletingList, setDeletingList] = useState(null)
  const sectionRef = useRef(null)

  const lists = externalLists

  const sortedLists = useMemo(() => {
    const sorted = [...lists]
    switch (sortBy) {
      case "updated":
        return sorted.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      case "created":
        return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      case "name":
        return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR"))
      case "name-desc":
        return sorted.sort((a, b) => (b.title || "").localeCompare(a.title || "", "pt-BR"))
      case "games":
        return sorted.sort((a, b) => (b.games_count || 0) - (a.games_count || 0))
      default:
        return sorted
    }
  }, [lists, sortBy])

  const totalPages = Math.ceil(sortedLists.length / LISTS_PER_PAGE)
  const paginatedLists = sortedLists.slice(
    (currentPage - 1) * LISTS_PER_PAGE,
    currentPage * LISTS_PER_PAGE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [sortBy])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  function handlePageChange(page) {
    setCurrentPage(page)
    if (sectionRef.current) {
      const y = sectionRef.current.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  function handleCreated(newList) {
    setExternalLists(prev => [newList, ...prev])
  }

  function handleUpdated(updatedList) {
    setExternalLists(prev => prev.map(l => l.id === updatedList.id ? { ...l, ...updatedList } : l))
  }

  function handleDeleted(listId) {
    setExternalLists(prev => prev.filter(l => l.id !== listId))
  }

  const isEmpty = lists.length === 0

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <List className="w-5 h-5 text-zinc-400" />
            Listas
          </h2>
        </div>
        <ListsSkeleton />
      </div>
    )
  }

  return (
    <div ref={sectionRef}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <List className="w-5 h-5 text-zinc-400" />
            Listas
          </h2>
          {!isEmpty && (
            <span className="text-xs text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full tabular-nums">
              {lists.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEmpty && <SortDropdown value={sortBy} onChange={setSortBy} />}
          {isOwnProfile && (
            <button
              onClick={() => setCreateOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Criar lista</span>
            </button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-zinc-800/20 border border-zinc-800 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
            <List className="w-6 h-6" />
          </div>
          <div className="text-center px-4">
            <p className="text-sm text-zinc-500">
              {isOwnProfile
                ? "Você ainda não criou nenhuma lista."
                : `${username} ainda não criou nenhuma lista.`}
            </p>
            {isOwnProfile && (
              <p className="text-xs text-zinc-600 mt-1">Organize seus jogos em listas personalizadas.</p>
            )}
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-1 px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar primeira lista
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedLists.map(list => (
              <ListCard
                key={list.id}
                list={list}
                isOwnProfile={isOwnProfile}
                onEdit={setEditingList}
                onDelete={setDeletingList}
              />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <CreateListModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <EditListModal
        isOpen={!!editingList}
        onClose={() => setEditingList(null)}
        list={editingList}
        onUpdated={handleUpdated}
      />

      <DeleteListModal
        isOpen={!!deletingList}
        onClose={() => setDeletingList(null)}
        list={deletingList}
        onDeleted={handleDeleted}
      />
    </div>
  )
}