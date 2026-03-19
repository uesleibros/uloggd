import { useMemo } from "react"
import DragScrollRow from "@components/UI/DragScrollRow"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import { useGamesBatch } from "#hooks/useGamesBatch"

function parseSlugList(slugs) {
  return slugs.split(",").map(s => {
    const raw = s.trim()
    const isFavorite = raw.endsWith("+")
    return { slug: isFavorite ? raw.slice(0, -1) : raw, isFavorite }
  }).filter(item => item.slug)
}

export function MarkdownGameGrid({ slugs, autoScroll = false, authorRatings = {}, ownerId = null }) {
  const slugList = useMemo(() => parseSlugList(slugs), [slugs])
  const uniqueSlugs = useMemo(() => [...new Set(slugList.map(s => s.slug))], [slugList])
  const { loading, getGame, getCustomCover } = useGamesBatch(uniqueSlugs, ownerId)

  if (slugList.length === 0) return null

  const items = autoScroll ? [...slugList, ...slugList, ...slugList] : slugList

  return (
    <div className="my-2 game-grid-wrapper w-full">
      <DragScrollRow
        className={`gap-3 pb-4 pt-4 px-1 items-end ${autoScroll ? "overflow-x-hidden" : ""}`}
        autoScroll={autoScroll}
        loop={autoScroll}
      >
        {items.map(({ slug, isFavorite }, i) => {
          if (loading) return <GameCardSkeleton key={`skeleton-${i}`} />
          const game = getGame(slug)
          if (!game) return null
          return (
            <GameCard 
              key={`${slug}-${i}`} 
              game={game} 
              isFavorite={isFavorite} 
              userRating={authorRatings[slug]?.avgRating} 
              customCoverUrl={getCustomCover(slug)}
              showQuickActions={false} 
              showRating 
            />
          )
        })}
      </DragScrollRow>
    </div>
  )
}
