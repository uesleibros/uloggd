import { Star } from "lucide-react"
import { formatRating } from "#utils/rating"
import StarsDisplay from "./StarsDisplay"

export default function ReviewRating({ rating, ratingMode }) {
  if (rating == null) return null

  const isStars = ratingMode === "stars_5" || ratingMode === "stars_5h"

  if (!isStars) {
    const formatted = formatRating(rating, ratingMode)
    if (!formatted) return null

    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Star className="w-4 h-4 text-amber-400 fill-current" />
        <span className="text-base font-bold text-amber-400 tabular-nums leading-none">{formatted.display}</span>
        <span className="text-sm text-zinc-500 font-normal leading-none">/{formatted.max}</span>
      </div>
    )
  }

  return <StarsDisplay rating={rating} ratingMode={ratingMode} />
}
