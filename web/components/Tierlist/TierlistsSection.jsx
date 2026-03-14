import { useState, useRef, useMemo } from "react"
import { Link } from "react-router-dom"
import { LayoutGrid, Plus, Lock, Gamepad2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { useCustomCovers } from "#hooks/useCustomCovers"
import Pagination from "@components/UI/Pagination"
import CreateTierlistModal from "#components/Tierlist/CreateTierlistModal"
import { encode } from "#utils/shortId.js"

function TierlistsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse border border-zinc-800">
          <div className="h-24 sm:h-28 bg-zinc-800" />
          <div className="p-3 sm:p-3.5 space-y-2 bg-zinc-800/30">
            <div className="h-4 w-2/3 bg-zinc-700/50 rounded" />
            <div className="h-3 w-full bg-zinc-800 rounded" />
            <div className="h-3 w-1/4 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ isOwnProfile, username, onCreateClick, t }) {
  return (
    <div className="rounded-xl p-10 sm:p-14 bg-zinc-800/30 border border-zinc-700/50 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <LayoutGrid className="w-6 h-6 text-zinc-500" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-zinc-400 font-medium">
          {isOwnProfile ? t("empty.own") : t("empty.other", { username })}
        </p>
        {isOwnProfile && (
          <p className="text-sm text-zinc-500">{t("empty.hint")}</p>
        )}
      </div>
      {isOwnProfile && (
        <button
          onClick={onCreateClick}
          className="mt-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("createFirst")}
        </button>
      )}
    </div>
  )
}

function TierPreview({ tiers, getGame, getCustomCover }) {
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
              const customCover = getCustomCover?.(item.game_slug)
              const game = getGame?.(item.game_slug)
              const coverUrl = customCover
                || (game?.cover?.url ? `https:${game.cover.url.replace("t_thumb", "t_cover_small")}` : null)

              return (
                <div key={item.id || j} className="h-full aspect-[3/4] flex-shrink-0">
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-700" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TierlistCard({ tierlist }) {
  const { t } = useTranslation("tierlist.card")
  const gamesCount = tierlist.games_count || 0
  const ownerId = tierlist.user_id || null

  const allSlugs = useMemo(() => {
    if (!tierlist.tiers_preview) return []
    return tierlist.tiers_preview.flatMap((t) =>
      (t.items || []).slice(0, 6).map((i) => i.game_slug)
    )
  }, [tierlist.tiers_preview])

  const { getGame } = useGamesBatch(allSlugs)
  const { getCustomCover } = useCustomCovers(ownerId, allSlugs)

  return (
    <Link
      to={`/tierlist/${encode(tierlist.id)}`}
      className="group block rounded-xl overflow-hidden bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all h-full flex flex-col"
    >
      <div className="relative h-24 sm:h-28 overflow-hidden flex-shrink-0">
        <TierPreview
          tiers={tierlist.tiers_preview}
          getGame={getGame}
          getCustomCover={getCustomCover}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent" />
      </div>

      <div className="p-3 sm:p-3.5 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
          {tierlist.title}
        </h3>

        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 min-h-[1rem] sm:min-h-[2rem]">
          {tierlist.description || ""}
        </p>

        <div className="flex items-center gap-2.5 mt-2">
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" />
            {gamesCount}
          </span>

          {tierlist.is_public === false && (
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">{t("private")}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
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
  const sectionRef = useRef(null)

  function handlePageChange(page) {
    onPageChange(page)
    if (sectionRef.current) {
      const y = sectionRef.current.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  function handleCreated(newTierlist) {
    setTierlists((prev) => [newTierlist, ...prev])
  }

  return (
    <div className="space-y-6" ref={sectionRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-zinc-400" />
            {t("title")}
          </h2>
          {!loading && total > 0 && (
            <span className="text-sm text-zinc-500 font-normal">{total}</span>
          )}
        </div>

        {isOwnProfile && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border-zinc-700/50"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("create")}</span>
          </button>
        )}
      </div>

      {loading ? (
        <TierlistsSkeleton />
      ) : tierlists?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tierlists.map((tierlist) => (
              <TierlistCard key={tierlist.id} tierlist={tierlist} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <EmptyState
          isOwnProfile={isOwnProfile}
          username={username}
          onCreateClick={() => setCreateOpen(true)}
          t={t}
        />
      )}

      <CreateTierlistModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
