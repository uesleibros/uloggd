import { useMemo } from "react"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { MiniCard } from "./MiniCard"
import { DefaultCard } from "./DefaultCard"
import { ErrorCard } from "./ErrorCard"
import { MiniCardSkeleton, DefaultCardSkeleton } from "./Skeletons"

export function MarkdownGameCard({ slug, variant = "default", isFavorite = false, authorRatings = {}, ownerId = null }) {
  const slugs = useMemo(() => [slug], [slug])
  const { loading, getGame, getCustomCover } = useGamesBatch(slugs, ownerId)
  const game = getGame(slug)
  const authorRating = authorRatings[slug]?.avgRating
  const customCoverUrl = getCustomCover(slug)

  if (loading && !game) {
    if (variant === "mini") return <MiniCardSkeleton />
    if (variant === "cover") return <GameCardSkeleton />
    return <DefaultCardSkeleton />
  }

  if (!game) {
    return variant === "cover" ? null : <ErrorCard slug={slug} />
  }

  if (variant === "mini") return <MiniCard game={game} rating={authorRating} customCoverUrl={customCoverUrl} />
  if (variant === "cover") return <GameCard showQuickActions={false} game={game} isFavorite={isFavorite} userRating={authorRating} customCoverUrl={customCoverUrl} showRating />
  return <DefaultCard game={game} rating={authorRating} customCoverUrl={customCoverUrl} />
}
