import { useMemo } from "react"
import { Link } from "react-router-dom"
import { LayoutGrid, Lock, Gamepad2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { useCustomCovers } from "#hooks/useCustomCovers"
import { encode } from "#utils/shortId.js"

function TierPreview({ tiers, getGame, getCustomCover, loading }) {
  if (!tiers || tiers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
        <LayoutGrid className="w-6 h-6 text-zinc-700" />
      </div>
    )
  }

  if (loading) {
    return <div className="w-full h-full bg-zinc-800 animate-pulse" />
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

export function TierlistCard({ tierlist, showOwner = false }) {
  const { t } = useTranslation("tierlist.card")
  const gamesCount = tierlist.games_count || 0
  const ownerId = tierlist.user_id || null

  const allSlugs = useMemo(() => {
    if (!tierlist.tiers_preview) return []
    return tierlist.tiers_preview.flatMap((t) =>
      (t.items || []).slice(0, 6).map((i) => i.game_slug)
    )
  }, [tierlist.tiers_preview])

  const { getGame, loading: gamesLoading } = useGamesBatch(allSlugs)
  const { getCustomCover, loading: coversLoading } = useCustomCovers(ownerId, allSlugs)
  const isLoading = gamesLoading || (ownerId && coversLoading)

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
          loading={isLoading}
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

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2.5">
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

          {showOwner && tierlist.owner && (
            <span className="text-xs text-zinc-500 truncate max-w-[100px]">
              {tierlist.owner.username}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}