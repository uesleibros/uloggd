import { Star, Trophy, RotateCcw, Clock, User, Pencil } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { formatRating } from "#utils/rating"
import { HalfStar } from "./inputs/StarRating"

function RatingDisplay({ rating, ratingMode }) {
  if (rating == null) return null
  const isStars = ratingMode === "stars_5" || ratingMode === "stars_5h"

  if (!isStars) {
    const formatted = formatRating(rating, ratingMode)
    if (!formatted) return null
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white tabular-nums">{formatted.display}</span>
        <span className="text-lg text-zinc-500 font-normal">/{formatted.max}</span>
      </div>
    )
  }

  const raw = rating / 20
  const count = ratingMode === "stars_5" ? Math.round(raw) : Math.round(raw * 2) / 2
  const clamped = Math.min(Math.max(count, 0), 5)
  const full = Math.floor(clamped)
  const half = clamped % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f${i}`} className="w-7 h-7 text-amber-400 fill-current" />
      ))}
      {half && <HalfStar size="w-7 h-7" />}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e${i}`} className="w-7 h-7 text-zinc-700 fill-current" />
      ))}
    </div>
  )
}

function AspectDisplay({ aspect }) {
  const mode = aspect.ratingMode || "stars_5h"
  const isStars = mode === "stars_5" || mode === "stars_5h"
  if (aspect.rating == null) return <span className="text-xs text-zinc-700">—</span>

  if (isStars) {
    const raw = aspect.rating / 20
    const count = mode === "stars_5" ? Math.round(raw) : Math.round(raw * 2) / 2
    const clamped = Math.min(Math.max(count, 0), 5)
    const full = Math.floor(clamped)
    const half = clamped % 1 >= 0.5
    const empty = 5 - full - (half ? 1 : 0)
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }, (_, i) => (
          <Star key={`f${i}`} className="w-3.5 h-3.5 text-amber-400 fill-current" />
        ))}
        {half && <HalfStar size="w-3.5 h-3.5" />}
        {Array.from({ length: empty }, (_, i) => (
          <Star key={`e${i}`} className="w-3.5 h-3.5 text-zinc-700 fill-current" />
        ))}
      </div>
    )
  }

  const formatted = formatRating(aspect.rating, mode)
  if (!formatted) return null
  return (
    <span className="text-xs font-semibold text-zinc-300 tabular-nums">
      {formatted.display}<span className="text-zinc-600">/{formatted.max}</span>
    </span>
  )
}

export function UserReviewCard({ review, onEdit }) {
  const { t, language } = useTranslation("review.userCard")
  
  if (!review) return null

  const playtime = []
  if (review.hours_played) playtime.push(`${review.hours_played}h`)
  if (review.minutes_played) playtime.push(`${review.minutes_played}m`)
  const aspects = review.aspect_ratings || []

  const locale = language === "pt" ? "pt-BR" : "en-US"

  return (
    <div className="rounded-xl bg-zinc-800/60 border border-zinc-700 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between border-b border-zinc-700/50">
        <div className="flex items-center gap-2.5">
          <User className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">{review.title || t("defaultTitle")}</span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white active:text-white bg-zinc-700/50 hover:bg-zinc-700 active:bg-zinc-600 rounded-lg transition-all duration-200 cursor-pointer border border-zinc-600/50 hover:border-zinc-500"
        >
          <Pencil className="w-3.5 h-3.5" />
          {t("editButton")}
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
          <div className="flex-shrink-0">
            {review.rating != null ? (
              <RatingDisplay rating={review.rating} ratingMode={review.rating_mode} />
            ) : (
              <span className="text-sm text-zinc-600 italic">{t("noRating")}</span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {review.mastered && (
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400 fill-current" />
                  <span className="text-xs text-amber-400 font-medium">{t("mastered")}</span>
                </div>
              )}
              {review.replay && (
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-400 font-medium">{t("replay")}</span>
                </div>
              )}
            </div>

            {aspects.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {aspects.map((aspect, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500 truncate">{aspect.label}</span>
                    <AspectDisplay aspect={aspect} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              {playtime.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {playtime.join(" ")}
                </div>
              )}
              {review.started_on && (
                <span>{t("started")}: {new Date(review.started_on).toLocaleDateString(locale)}</span>
              )}
              {review.finished_on && (
                <span>{t("finished")}: {new Date(review.finished_on).toLocaleDateString(locale)}</span>
              )}
            </div>

            {review.review && (
              <div className="mt-2 pt-3 border-t border-zinc-700/50">
                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{review.review}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
