import StarsDisplay from "@components/Game/StarsDisplay"
import { formatRating } from "#utils/rating"

export default function AspectRatingDisplay({ aspect }) {
	const mode = aspect.ratingMode || "stars_5h"
	const isStars = mode === "stars_5" || mode === "stars_5h"

	if (aspect.rating == null) return <span className="text-xs text-zinc-700">—</span>

	if (isStars) return <StarsDisplay rating={aspect.rating} ratingMode={mode} size="sm" />

	const formatted = formatRating(aspect.rating, mode)
	if (!formatted) return null

	return (
		<span className="text-xs font-semibold text-zinc-300 tabular-nums">
			{formatted.display}<span className="text-zinc-600">/{formatted.max}</span>
		</span>
	)
}