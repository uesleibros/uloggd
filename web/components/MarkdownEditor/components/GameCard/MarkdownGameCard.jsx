import { useMemo } from "react"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { MiniCard } from "./MiniCard"
import { DefaultCard } from "./DefaultCard"
import { ErrorCard } from "./ErrorCard"
import { MiniCardSkeleton, DefaultCardSkeleton } from "./Skeletons"

export function MarkdownGameCard({ slug, variant = "default", isFavorite = false, authorRatings = {} }) {
  const slugs = useMemo(() => [slug], [slug])
  const { loading, getGame } = useGamesBatch(slugs)
  const game = getGame(slug)
  const authorRating = authorRatings[slug]?.avgRating

  if (loading && !game) {
    if (variant === "mini") return <MiniCardSkeleton />
    if (variant === "cover") return <GameCardSkeleton />
    return <DefaultCardSkeleton />
  }

  if (!game) {
    return variant === "cover" ? null : <ErrorCard slug={slug} />
  }

  if (variant === "mini") return <MiniCard game={game} rating={authorRating} />
  if (variant === "cover") return <GameCard game={game} isFavorite={isFavorite} userRating={authorRating} showRating />
  return <DefaultCard game={game} rating={authorRating} />
}
