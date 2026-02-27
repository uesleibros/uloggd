import { useState, useEffect, useRef, useMemo  } from "react"
import { Link } from "react-router-dom"
import { useGamesBatch } from "#hooks/useGamesBatch"
import Pagination from "@components/UI/Pagination"
import CreateTierlistModal from "@components/Tierlist/CreateTierlistModal"
import EditTierlistModal from "@components/Tierlist/EditTierlistModal"
import DeleteTierlistModal from "@components/Tierlist/DeleteTierlistModal"
import {
  LayoutGrid, Plus, Lock,
  MoreHorizontal, Pencil, Trash2, Gamepad2,
} from "lucide-react"
import { encode } from "#utils/shortId.js"

function TierlistActionMenu({ tierlist, onEdit, onDelete }) {
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
              onClick={() => { onEdit(tierlist); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-zinc-300 active:bg-zinc-700/50 rounded-xl transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-zinc-500" />
              Editar tierlist
            </button>
            <button
              onClick={() => { onDelete(tierlist); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-400 active:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir tierlist
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
              onClick={() => { onEdit(tierlist); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => { onDelete(tierlist); setOpen(false) }}
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

function TierPreview({ tiers, getGame }) {
  if (!tiers || tiers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
        <LayoutGrid className="w-6 h-6 text-zinc-700" />
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {tiers.slice(0, 4).map((tier, i) => (
        <div
          key={tier.id || i}
          className="flex-1 flex items-center overflow-hidden"
          style={{ backgroundColor: tier.color }}
        >
          <span className="w-6 sm:w-8 flex-shrink-0 text-[8px] sm:text-[10px] font-bold text-white/90 text-center truncate px-0.5">
            {tier.label}
          </span>
          <div className="flex-1 flex items-center gap-px bg-zinc-800/30 h-full py-px pr-px overflow-hidden">
            {(tier.items || []).slice(0, 6).map((item, j) => {
              const game = getGame?.(item.game_slug)
              const coverUrl = game?.cover?.url
                ? `https:${game.cover.url.replace("t_thumb", "t_cover_small")}`
                : null

              return (
                <div key={item.id || j} className="h-full aspect-[3/4] flex-shrink-0">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-700" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {tiers.length < 4 && Array.from({ length: 4 - tiers.length }).map((_, i) => (
        <div key={`empty-${i}`} className="flex-1 bg-zinc-800/60" />
      ))}
    </div>
  )
}

function TierlistCard({ tierlist, isOwnProfile, onEdit, onDelete }) {
  const gamesCount = tierlist.games_count || 0
  
  const allSlugs = useMemo(() => {
    if (!tierlist.tiers_preview) return []
    return tierlist.tiers_preview.flatMap(t => 
      (t.items || []).slice(0, 6).map(i => i.game_slug)
    )
  }, [tierlist.tiers_preview])

  const { getGame } = useGamesBatch(allSlugs)

  return (
    <div className="group relative rounded-xl overflow-visible h-full">
      <Link
        to={`/tierlist/${encode(tierlist.id)}`}
        className="block rounded-xl overflow-hidden bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-all duration-200 h-full flex flex-col"
      >
        <div className="relative h-24 sm:h-28 overflow-hidden flex-shrink-0">
          <TierPreview tiers={tierlist.tiers_preview} getGame={getGame} />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent" />
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 flex-1">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                {tierlist.title}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 sm:line-clamp-2 min-h-[1rem] sm:min-h-[2rem]">
                {tierlist.description || ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-2">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" />
              {gamesCount}
            </span>
            {tierlist.is_public === false && (
              <span className="text-xs text-zinc-600 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Privada</span>
              </span>
            )}
            {tierlist.updated_at && (
              <span className="text-[11px] text-zinc-600 ml-auto hidden sm:block">
                {new Date(tierlist.updated_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
      </Link>

      {isOwnProfile && (
        <div className="absolute top-2 right-2 z-10">
          <TierlistActionMenu tierlist={tierlist} onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}
    </div>
  )
}

function TierlistsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse border border-zinc-800">
          <div className="h-20 sm:h-24 bg-zinc-800 flex flex-col">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex-1 bg-zinc-800 border-b border-zinc-700/30 last:border-0" />
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

export default function TierlistsSection({
  tierlists,
  setTierlists,
  isOwnProfile,
  username,
  loading,
  currentPage,
  totalPages,
  total,
  setTotal,
  onPageChange,
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTierlist, setEditingTierlist] = useState(null)
  const [deletingTierlist, setDeletingTierlist] = useState(null)
  const sectionRef = useRef(null)

  function handlePageChange(page) {
    onPageChange(page)
    if (sectionRef.current) {
      const y = sectionRef.current.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  function handleCreated(newTierlist) {
    setTierlists(prev => [newTierlist, ...prev])
  }

  function handleUpdated(updatedTierlist) {
    setTierlists(prev => prev.map(t => t.id === updatedTierlist.id ? { ...t, ...updatedTierlist } : t))
  }

  function handleDeleted(tierlistId) {
    setTierlists(prev => prev.filter(t => t.id !== tierlistId))
    setTotal(prev => Math.max(0, prev - 1))
  }

  const isEmpty = !tierlists || tierlists.length === 0

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-zinc-400" />
            Tierlists
          </h2>
        </div>
        <TierlistsSkeleton />
      </div>
    )
  }

  return (
    <div ref={sectionRef}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-zinc-400" />
            Tierlists
          </h2>
          {total > 0 && (
            <span className="text-xs text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full tabular-nums">
              {total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <button
              onClick={() => setCreateOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Criar tierlist</span>
            </button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-zinc-800/20 border border-zinc-800 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div className="text-center px-4">
            <p className="text-sm text-zinc-500">
              {isOwnProfile
                ? "Você ainda não criou nenhuma tierlist."
                : `${username} ainda não criou nenhuma tierlist.`}
            </p>
            {isOwnProfile && (
              <p className="text-xs text-zinc-600 mt-1">Organize seus jogos em rankings personalizados.</p>
            )}
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-1 px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar primeira tierlist
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tierlists.map(tierlist => (
              <TierlistCard
                key={tierlist.id}
                tierlist={tierlist}
                isOwnProfile={isOwnProfile}
                onEdit={setEditingTierlist}
                onDelete={setDeletingTierlist}
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

      <CreateTierlistModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <EditTierlistModal
        isOpen={!!editingTierlist}
        onClose={() => setEditingTierlist(null)}
        tierlist={editingTierlist}
        onUpdated={handleUpdated}
      />

      <DeleteTierlistModal
        isOpen={!!deletingTierlist}
        onClose={() => setDeletingTierlist(null)}
        tierlist={deletingTierlist}
        onDeleted={handleDeleted}
      />
    </div>
  )

}

