import { useState, useEffect, useRef, useMemo } from "react"
import { Link } from "react-router-dom"
import { LayoutGrid, Gamepad2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import LikeButton from "@components/UI/LikeButton"
import DragScrollRow from "@components/UI/DragScrollRow"
import { encode } from "#utils/shortId.js"

function TierlistCardSkeleton() {
  return (
    <div className="w-64 flex-shrink-0 bg-zinc-800/50 rounded-xl animate-pulse">
      <div className="h-24 bg-zinc-700/30" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-zinc-700/50 rounded w-3/4" />
        <div className="h-3 bg-zinc-700/50 rounded w-1/2" />
        <div className="flex justify-between mt-2">
          <div className="h-3 bg-zinc-700/50 rounded w-12" />
          <div className="h-3 bg-zinc-700/50 rounded w-8" />
        </div>
      </div>
    </div>
  )
}

function TierPreview({ tiers, gamesMap }) {
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
              const game = gamesMap[item.game_slug]
              const coverUrl = game?.cover?.url
                ? `https:${game.cover.url.replace("t_thumb", "t_cover_small")}`
                : null

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

function TierlistCard({ tierlist, gamesMap }) {
  const { t } = useTranslation("tierlist.card")
  const { user } = useAuth()
  const shortId = encode(tierlist.id)

  return (
    <div className="w-64 flex-shrink-0 group rounded-xl overflow-hidden bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all h-full flex flex-col">
      <Link
        to={`/tierlist/${shortId}`}
        className="relative h-24 overflow-hidden flex-shrink-0 block"
      >
        <TierPreview tiers={tierlist.tiers_preview} gamesMap={gamesMap} />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent pointer-events-none" />
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link to={`/tierlist/${shortId}`} className="block">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
            {tierlist.title}
          </h3>
        </Link>

        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 min-h-[1rem]">
          {tierlist.description || ""}
        </p>

        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" />
              {tierlist.games_count}
            </span>

            {tierlist.owner && (
              <Link
                to={`/u/${tierlist.owner.username}`}
                className="text-xs text-zinc-500 hover:text-white truncate max-w-[80px] transition-colors"
              >
                {tierlist.owner.username}
              </Link>
            )}
          </div>

          <LikeButton
            type="tierlist"
            targetId={tierlist.id}
            currentUserId={user?.user_id}
            size="sm"
            showLabel={false}
            showCount
          />
        </div>
      </div>
    </div>
  )
}

export default function PopularTierlistsSection() {
  const { t } = useTranslation()
  const [tierlists, setTierlists] = useState([])
  const [gamesMap, setGamesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return

    let cancelled = false

    fetch("/api/home/popularTierlists?limit=10")
      .then((res) => res.json())
      .then(async (data) => {
        if (cancelled) return

        const lists = data.tierlists || []
        setTierlists(lists)
        setLoading(false)
        fetchedRef.current = true

        if (lists.length === 0) return

        const allSlugs = new Set()
        lists.forEach((tl) => {
          (tl.tiers_preview || []).forEach((tier) => {
            (tier.items || []).forEach((item) => {
              if (item.game_slug) allSlugs.add(item.game_slug)
            })
          })
        })

        if (allSlugs.size === 0) return

        setGamesLoading(true)

        try {
          const params = new URLSearchParams()
          allSlugs.forEach((slug) => params.append("slugs", slug))

          const gamesRes = await fetch(`/api/igdb/gamesBatch?${params}`)
          if (gamesRes.ok) {
            const gamesData = await gamesRes.json()
            if (!cancelled) setGamesMap(gamesData)
          }
        } catch {}

        if (!cancelled) setGamesLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  if (!loading && tierlists.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
        {t("home.sections.popularTierlists")}
      </h2>

      {loading ? (
        <DragScrollRow className="gap-4 pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <TierlistCardSkeleton key={i} />
          ))}
        </DragScrollRow>
      ) : (
        <DragScrollRow autoScroll loop className="gap-4 pb-2">
          {tierlists.map((tierlist) => (
            <TierlistCard
              key={tierlist.id}
              tierlist={tierlist}
              gamesMap={gamesMap}
            />
          ))}
        </DragScrollRow>
      )}
    </div>
  )
}