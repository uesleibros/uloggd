import { useState } from "react"
import { Plus } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { ReviewSection } from "../shared/ReviewSection"
import { AspectRatingItem } from "./AspectItem"
import { ASPECT_SUGGESTIONS, MAX_ASPECTS } from "../constants"

export function AspectRatings({ aspects, setAspects }) {
  const { t } = useTranslation("review.aspects")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const usedLabels = aspects.map((a) => a.label.toLowerCase())
  const availableSuggestions = ASPECT_SUGGESTIONS.filter((s) => !usedLabels.includes(s.toLowerCase()))

  function addAspect(label = "") {
    if (aspects.length >= MAX_ASPECTS) return
    setAspects([
      ...aspects,
      { id: crypto.randomUUID(), label, rating: null, ratingMode: "stars_5h", review: "" },
    ])
    setShowSuggestions(false)
  }

  return (
    <ReviewSection title={t("title")} description={t("description")}>
      {aspects.length > 0 && (
        <div className="space-y-2 mb-3">
          {aspects.map((aspect) => (
            <AspectRatingItem
              key={aspect.id}
              aspect={aspect}
              onUpdate={(u) => setAspects(aspects.map((a) => (a.id === u.id ? u : a)))}
              onRemove={() => setAspects(aspects.filter((a) => a.id !== aspect.id))}
            />
          ))}
        </div>
      )}
      {aspects.length < MAX_ASPECTS && (
        <div>
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t("addButton")}
            <span className="text-zinc-700 text-xs">{aspects.length}/{MAX_ASPECTS}</span>
          </button>
          {showSuggestions && (
            <div className="mt-2 p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
              {availableSuggestions.length > 0 && (
                <>
                  <p className="text-xs text-zinc-500 mb-2">{t("suggestions")}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {availableSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addAspect(s)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-full text-xs text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer"
                      >
                        {t(`suggestion.${s}`, { defaultValue: s })}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addAspect("")}
                  className="flex-1 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer text-center"
                >
                  {t("emptyField")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="px-3 py-2.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                >
                  {t("close")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </ReviewSection>
  )
}
