import { Trophy } from "lucide-react"
import { ReviewSection } from "../shared/ReviewSection"
import { StarRatingInput } from "../inputs/StarRating"
import { PointsRatingInput } from "../inputs/PointsRating"
import { RatingModeSelector } from "../inputs/RatingModeSelector"
import { PlatformSelect } from "../inputs/PlatformSelect"
import { AspectRatings } from "../aspects/AspectRatings"
import { MarkdownEditor } from "@components/MarkdownEditor"
import { MAX_REVIEW_LENGTH } from "../constants"

export function ReviewTab({
  rating, setRating,
  ratingMode, setRatingMode,
  platform, setPlatform,
  platforms,
  review, setReview,
  spoilers, setSpoilers,
  mastered, setMastered,
  aspects, setAspects,
}) {
  const isStars = ratingMode === "stars_5" || ratingMode === "stars_5h"

  function handleStarChange(starVal) {
    if (starVal === 0) {
      setRating(null)
      return
    }
    if (ratingMode === "stars_5") setRating(Math.ceil(starVal / 2) * 20)
    else setRating(starVal * 10)
  }

  function getStarValue() {
    if (rating == null) return 0
    if (ratingMode === "stars_5") return Math.round(rating / 20) * 2
    return Math.round(rating / 10)
  }

  function handleModeChange(newMode) {
    if (rating != null) {
      if (newMode === "stars_5") setRating(Math.round(rating / 20) * 20)
      else if (newMode === "stars_5h") setRating(Math.round(rating / 10) * 10)
      else if (newMode === "points_10") setRating(Math.round(rating / 10) * 10)
      else if (newMode === "points_10d") setRating(Math.round(rating / 5) * 5)
    }
    setRatingMode(newMode)
  }

  return (
    <div className="space-y-4">
      <ReviewSection title="Nota geral" description="Escolha o formato e dê sua nota.">
        <div className="flex items-center justify-between mb-3 gap-2">
          <RatingModeSelector mode={ratingMode} setMode={handleModeChange} />
          <button
            type="button"
            onClick={() => setMastered(!mastered)}
            className={`cursor-pointer p-2.5 rounded-lg transition-all duration-200 flex-shrink-0 ${
              mastered
                ? "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                : "text-zinc-600 hover:text-zinc-400 border border-transparent"
            }`}
            title="Masterizado"
          >
            <Trophy className="w-5 h-5 fill-current" />
          </button>
        </div>
        {isStars ? (
          <StarRatingInput value={getStarValue()} onChange={handleStarChange} allowHalf={ratingMode === "stars_5h"} />
        ) : (
          <PointsRatingInput value={rating} onChange={setRating} mode={ratingMode} />
        )}
      </ReviewSection>

      <AspectRatings aspects={aspects} setAspects={setAspects} />

      <ReviewSection title="Plataforma" description="Em qual plataforma você jogou?">
        <PlatformSelect platforms={platforms} value={platform} onChange={setPlatform} />
      </ReviewSection>

      <ReviewSection title="Review" description="Escreva sobre sua experiência. Suporta Markdown.">
        <MarkdownEditor
          value={review}
          onChange={setReview}
          maxLength={MAX_REVIEW_LENGTH}
          placeholder="O que achou do jogo?"
        />
        <label htmlFor="spoilers-check" className="flex items-center mt-3 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            id="spoilers-check"
            checked={spoilers}
            onChange={(e) => setSpoilers(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-white cursor-pointer"
          />
          <span className="text-sm text-zinc-500 ml-2">Contém spoilers</span>
        </label>
      </ReviewSection>
    </div>
  )
}