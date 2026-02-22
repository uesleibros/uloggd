import { useState } from "react"
import { MessageSquare, X } from "lucide-react"
import { StarRatingInput } from "../inputs/StarRating"
import { PointsRatingInput } from "../inputs/PointsRating"
import { RatingModeSelector } from "../inputs/RatingModeSelector"
import { MarkdownEditor } from "@components/MarkdownEditor"
import { MAX_ASPECT_LABEL, MAX_ASPECT_REVIEW } from "../constants"

export function AspectRatingItem({ aspect, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const isStars = aspect.ratingMode === "stars_5" || aspect.ratingMode === "stars_5h"

  function handleStarChange(starVal) {
    if (starVal === 0) {
      onUpdate({ ...aspect, rating: null })
      return
    }
    if (aspect.ratingMode === "stars_5") {
      onUpdate({ ...aspect, rating: Math.ceil(starVal / 2) * 20 })
    } else {
      onUpdate({ ...aspect, rating: starVal * 10 })
    }
  }

  function getStarValue() {
    if (aspect.rating == null) return 0
    if (aspect.ratingMode === "stars_5") return Math.round(aspect.rating / 20) * 2
    return Math.round(aspect.rating / 10)
  }

  function handleModeChange(newMode) {
    let converted = aspect.rating
    if (converted != null) {
      if (newMode === "stars_5") converted = Math.round(converted / 20) * 20
      else if (newMode === "stars_5h") converted = Math.round(converted / 10) * 10
      else if (newMode === "points_10") converted = Math.round(converted / 10) * 10
      else if (newMode === "points_10d") converted = Math.round(converted / 5) * 5
    }
    onUpdate({ ...aspect, ratingMode: newMode, rating: converted })
  }

  const hasReview = !!aspect.review?.trim()

  return (
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={aspect.label}
              onChange={(e) => onUpdate({ ...aspect, label: e.target.value.slice(0, MAX_ASPECT_LABEL) })}
              placeholder="Nome do aspecto"
              className="flex-1 min-w-0 px-0 py-0 bg-transparent text-sm font-medium text-white placeholder-zinc-600 focus:outline-none border-none"
            />
            <span className="text-[10px] text-zinc-700 flex-shrink-0">
              {aspect.label.length}/{MAX_ASPECT_LABEL}
            </span>
          </div>
          <RatingModeSelector mode={aspect.ratingMode} setMode={handleModeChange} compact />
          <div>
            {isStars ? (
              <StarRatingInput
                value={getStarValue()}
                onChange={handleStarChange}
                allowHalf={aspect.ratingMode === "stars_5h"}
                size="sm"
              />
            ) : (
              <PointsRatingInput
                value={aspect.rating}
                onChange={(val) => onUpdate({ ...aspect, rating: val })}
                mode={aspect.ratingMode}
                compact
              />
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
              expanded || hasReview ? "text-indigo-400 bg-indigo-400/10" : "text-zinc-700 hover:text-zinc-400"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-zinc-700 hover:text-red-400 transition-colors cursor-pointer rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-800">
          <div className="pt-3">
            <MarkdownEditor
              value={aspect.review || ""}
              onChange={(val) => onUpdate({ ...aspect, review: val })}
              maxLength={MAX_ASPECT_REVIEW}
              placeholder={`Comentário sobre ${aspect.label || "este aspecto"}...`}
            />
          </div>
        </div>
      )}
    </div>
  )
}