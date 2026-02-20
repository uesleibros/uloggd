import { useMemo } from "react"
import DragScrollRow from "@components/UI/DragScrollRow"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import { useGamesBatch } from "#hooks/useGamesBatch"

export function MarkdownGameGrid({ slugs, autoScroll = false, authorRatings = {} }) {
  const slugList = useMemo(() =>
    slugs.split(",").map(s => {
      const raw = s.trim()
      const isFavorite = raw.endsWith("+")
      const slug = isFavorite ? raw.slice(0, -1) : raw
      return { slug, isFavorite }
    }).filter(item => item.slug),
  [slugs])

  const uniqueSlugs = useMemo(
    () => [...new Set(slugList.map(s => s.slug))],
    [slugList]
  )

  const { loading, getGame } = useGamesBatch(uniqueSlugs)

  if (slugList.length === 0) return null

  const items = autoScroll ? [...slugList, ...slugList, ...slugList] : slugList

  return (
    <div className="my-2">
      <DragScrollRow
        className={`gap-3 pb-4 pt-4 px-1 items-end ${autoScroll ? "overflow-x-hidden" : ""}`}
        autoScroll={autoScroll}
        autoScrollSpeed={0.04}
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
              newTab
              userRating={authorRatings[slug]?.avgRating}
              showRating={true}
            />
          )
        })}
      </DragScrollRow>
    </div>
  )
}