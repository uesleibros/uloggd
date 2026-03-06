import { useState, useEffect, useRef, useMemo } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import Pagination from "@components/UI/Pagination"
import CreateTierlistModal from "@components/Tierlist/CreateTierlistModal"
import EditTierlistModal from "@components/Tierlist/EditTierlistModal"
import DeleteTierlistModal from "@components/Tierlist/DeleteTierlistModal"
import {
  LayoutGrid,
  Plus,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Gamepad2,
} from "lucide-react"
import { encode } from "#utils/shortId.js"

function TierlistActionMenu({ tierlist, onEdit, onDelete }) {
  const { t } = useTranslation("tierlist.actions")
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
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(!open)
        }}
        className="p-1.5 sm:p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer rounded-md bg-black/40 backdrop-blur-sm hover:bg-black/60 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />

          <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-800 border-t border-zinc-700 rounded-t-2xl p-2 sm:hidden">
            <div className="flex justify-center pt-1 pb-3">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            <button
              onClick={() => {
                onEdit(tierlist)
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 active:bg-zinc-700/50 rounded-xl transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-zinc-500" />
              {t("edit")}
            </button>

            <button
              onClick={() => {
                onDelete(tierlist)
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 active:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {t("delete")}
            </button>
          </div>

          <div className="hidden sm:block absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px]">
            <button
              onClick={() => {
                onEdit(tierlist)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("edit")}
            </button>

            <button
              onClick={() => {
                onDelete(tierlist)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("delete")}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function TierPreview({ tiers, getGame, isHovered }) {
  if (!tiers || tiers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <LayoutGrid className="w-8 h-8 text-white/10" />
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {tiers.slice(0, 5).map((tier, i) => (
        <motion.div
          key={tier.id || i}
          className="flex-1 flex items-center overflow-hidden"
          animate={{
            opacity: isHovered ? 1 : 0.7,
          }}
          transition={{
            duration: 0.3,
            delay: i * 0.03,
          }}
        >
          <motion.span
            className="flex-shrink-0 text-[9px] font-bold text-white/90 text-center truncate flex items-center justify-center h-full"
            animate={{
              width: isHovered ? 36 : 28,
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 25,
            }}
            style={{ backgroundColor: tier.color }}
          >
            {tier.label}
          </motion.span>
          <div className="flex-1 flex items-center gap-px bg-zinc-800/60 h-full py-px pr-px overflow-hidden">
            {(tier.items || []).slice(0, 8).map((item, j) => {
              const game = getGame?.(item.game_slug)
              const coverUrl = game?.cover?.url
                ? `https:${game.cover.url.replace("t_thumb", "t_cover_small")}`
                : null

              return (
                <motion.div
                  key={item.id || j}
                  className="h-full aspect-[3/4] flex-shrink-0"
                  animate={{
                    scale: isHovered ? 1 : 0.95,
                    opacity: isHovered ? 1 : 0.8,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                    delay: j * 0.015,
                  }}
                >
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-700" />
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function TierlistCard({ tierlist, isOwnProfile, onEdit, onDelete }) {
  const { t } = useTranslation("tierlist.card")
  const [isHovered, setIsHovered] = useState(false)
  const gamesCount = tierlist.games_count || 0

  const allSlugs = useMemo(() => {
    if (!tierlist.tiers_preview) return []
    return tierlist.tiers_preview.flatMap((tier) =>
      (tier.items || []).slice(0, 8).map((i) => i.game_slug)
    )
  }, [tierlist.tiers_preview])

  const { getGame } = useGamesBatch(allSlugs)

  return (
    <motion.div
      className="group relative w-full cursor-pointer h-[280px]"
      style={{
        perspective: "1200px",
        zIndex: isHovered ? 50 : 1,
        overflow: "visible",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/tierlist/${encode(tierlist.id)}`} className="absolute inset-0 z-40 rounded-2xl" />

      <div
        className="relative w-full h-full"
        style={{
          perspective: "1200px",
          overflow: "visible",
        }}
      >
        <motion.div
          className="relative z-0"
          animate={{
            rotateX: isHovered ? 6 : 0,
            scale: isHovered ? 1.02 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 25,
            mass: 0.8,
          }}
          style={{
            height: "280px",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
            overflow: "visible",
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              overflow: "hidden",
              zIndex: 0,
            }}
          >
            <div className="w-full h-full pt-1">
              <TierPreview tiers={tierlist.tiers_preview} getGame={getGame} isHovered={isHovered} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent pointer-events-none" />
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl overflow-hidden"
          animate={{
            rotateX: isHovered ? -14 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 180,
            damping: 22,
            mass: 0.8,
          }}
          style={{
            background: "rgba(26, 26, 26, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
          }}
        >
          <div className="relative py-4 px-4 min-h-[2.75rem]">
            <div
              className="absolute -inset-2 transition-all duration-500 rounded-t-2xl pointer-events-none"
              style={{
                opacity: isHovered ? 1 : 0,
                background: "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(129,140,248,0.15) 0%, transparent 60%)",
                filter: "blur(12px)",
              }}
            />
            <div
              className="absolute -inset-px transition-all duration-500 rounded-t-lg pointer-events-none overflow-hidden"
              style={{
                opacity: isHovered ? 1 : 0,
                background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              }}
            />
            <div
              className="absolute inset-x-2 -top-1 h-px transition-all duration-500 pointer-events-none"
              style={{
                opacity: isHovered ? 1 : 0,
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                filter: "blur(0.5px)",
              }}
            />

            <h3 className="font-semibold text-white/70 text-base leading-snug line-clamp-1 relative z-0 transition-colors duration-200 group-hover:text-white">
              {tierlist.title}
            </h3>
            {tierlist.description && (
              <p className="text-xs text-white/40 mt-1 line-clamp-1 relative z-0 transition-colors duration-200 group-hover:text-white/60">
                {tierlist.description}
              </p>
            )}
          </div>

          <div className="relative h-[48px]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/[0.04]" />
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-3 h-3 text-white/40" />
                <span className="text-[13px] text-white/60">
                  {gamesCount}
                </span>
                {tierlist.is_public === false && (
                  <Lock className="w-3 h-3 text-white/30 ml-1" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5 text-white/30" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {isOwnProfile && (
        <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <TierlistActionMenu tierlist={tierlist} onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}
    </motion.div>
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
  onPageChange,
}) {
  const { t } = useTranslation("tierlist.section")
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTierlist, setEditingTierlist] = useState(null)
  const [deletingTierlist, setDeletingTierlist] = useState(null)
  const sectionRef = useRef(null)

  function handleCreated(newTierlist) {
    setTierlists((prev) => [newTierlist, ...prev])
  }

  function handleUpdated(updatedTierlist) {
    setTierlists((prev) =>
      prev.map((t) => (t.id === updatedTierlist.id ? { ...t, ...updatedTierlist } : t))
    )
  }

  function handleDeleted(tierlistId) {
    setTierlists((prev) => prev.filter((t) => t.id !== tierlistId))
  }

  if (loading) {
    return <div className="py-10 text-center text-zinc-500">{t("loading")}</div>
  }

  return (
    <div ref={sectionRef}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-zinc-400" />
          {t("title")}
        </h2>

        {isOwnProfile && (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-zinc-800/50 border border-zinc-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t("create")}
          </button>
        )}
      </div>

      {tierlists.length === 0 ? (
        <div className="text-center text-zinc-500 py-12">
          {isOwnProfile ? t("empty.own") : t("empty.other", { username })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" style={{ overflow: "visible" }}>
            {tierlists.map((tierlist) => (
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
            onPageChange={onPageChange}
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
