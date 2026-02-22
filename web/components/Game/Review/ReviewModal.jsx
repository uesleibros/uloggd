import { useState } from "react"
import { X, Check } from "lucide-react"
import { supabase } from "#lib/supabase"
import { notify } from "@components/UI/Notification"
import { TabNav } from "./tabs/TabNav"
import { ReviewTab } from "./tabs/ReviewTab"
import { DatesTab } from "./tabs/DatesTab"
import { DetailsTab } from "./tabs/DetailsTab"
import { MAX_ASPECT_LABEL, MAX_ASPECT_REVIEW } from "./constants"

const TAB_MIN_HEIGHT = "min-h-[480px]"

export function ReviewModal({ game, existingReview, onClose, onDeleted }) {
  const isEditing = !!existingReview
  const [activeTab, setActiveTab] = useState("review")
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [rating, setRating] = useState(existingReview?.rating ?? null)
  const [ratingMode, setRatingMode] = useState(existingReview?.rating_mode || "stars_5h")
  const [platform, setPlatform] = useState(existingReview?.platform_id?.toString() || "")
  const [review, setReview] = useState(existingReview?.review || "")
  const [spoilers, setSpoilers] = useState(existingReview?.contain_spoilers || false)
  const [mastered, setMastered] = useState(existingReview?.mastered || false)
  const [startedOn, setStartedOn] = useState(existingReview?.started_on || "")
  const [finishedOn, setFinishedOn] = useState(existingReview?.finished_on || "")
  const [reviewTitle, setReviewTitle] = useState(existingReview?.title || "Review")
  const [replay, setReplay] = useState(existingReview?.replay || false)
  const [hoursPlayed, setHoursPlayed] = useState(existingReview?.hours_played?.toString() || "")
  const [minutesPlayed, setMinutesPlayed] = useState(existingReview?.minutes_played?.toString() || "")
  const [playedPlatform, setPlayedPlatform] = useState(existingReview?.played_platform_id?.toString() || "")
  const [aspects, setAspects] = useState(
    existingReview?.aspect_ratings?.map((a) => ({
      id: crypto.randomUUID(),
      label: a.label || "",
      rating: a.rating ?? null,
      ratingMode: a.ratingMode || "stars_5h",
      review: a.review || "",
    })) || []
  )

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function handleSave() {
    const today = new Date().toISOString().split("T")[0]
    const minDate = "2000-01-01"

    if (startedOn && (startedOn < minDate || startedOn > today)) {
      notify("Data de início inválida.", "error")
      return
    }
    if (finishedOn && (finishedOn < minDate || finishedOn > today)) {
      notify("Data de término inválida.", "error")
      return
    }
    if (startedOn && finishedOn && finishedOn < startedOn) {
      notify("Data de término não pode ser antes do início.", "error")
      return
    }

    const validAspects = aspects
      .filter((a) => a.label.trim())
      .map((a) => ({
        label: a.label.trim().slice(0, MAX_ASPECT_LABEL),
        rating: a.rating,
        ratingMode: a.ratingMode,
        review: a.review?.trim().slice(0, MAX_ASPECT_REVIEW) || null,
      }))

    setSubmitting(true)
    try {
      const token = await getToken()
      if (!token) {
        notify("Você precisa estar logado.", "error")
        return
      }

      const payload = {
        gameId: game.id,
        gameSlug: game.slug,
        reviewTitle: reviewTitle || "Review",
        rating: rating ?? null,
        ratingMode,
        review: review.trim() || null,
        containSpoilers: spoilers,
        mastered,
        startedOn: startedOn || null,
        finishedOn: finishedOn || null,
        replay,
        hoursPlayed: hoursPlayed ? parseInt(hoursPlayed) : null,
        minutesPlayed: minutesPlayed ? parseInt(minutesPlayed) : null,
        platformId: platform ? parseInt(platform) : null,
        playedPlatformId: playedPlatform ? parseInt(playedPlatform) : null,
        aspectRatings: validAspects.length > 0 ? validAspects : null,
      }

      const url = isEditing ? "/api/reviews/@me/update" : "/api/reviews/@me/create"
      if (isEditing) payload.reviewId = existingReview.id

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        notify(isEditing ? "Review atualizada!" : "Review criada!")
        onClose()
      } else {
        const err = await res.json().catch(() => ({}))
        notify(err.error || "Falha ao salvar.", "error")
      }
    } catch {
      notify("Falha ao salvar.", "error")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    setDeleting(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch("/api/reviews/@me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reviewId: existingReview.id }),
      })
      if (res.ok) {
        notify("Review excluída!")
        onDeleted?.()
        onClose()
      } else {
        notify("Falha ao excluir.", "error")
      }
    } catch {
      notify("Falha ao excluir.", "error")
    } finally {
      setDeleting(false)
    }
  }

  const releaseYear = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null

  return (
    <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] bg-zinc-900 md:border md:border-zinc-700 md:rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-4 pb-2 border-b border-zinc-700 flex-shrink-0 md:px-5 md:pb-3"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {game.cover && (
            <img
              src={`https:${game.cover.url}`}
              alt=""
              className="w-8 h-11 rounded object-cover bg-zinc-800 flex-shrink-0"
              draggable={false}
            />
          )}
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-white truncate">{game.name}</h2>
            {releaseYear && <p className="text-xs text-zinc-500">{releaseYear}</p>}
          </div>
        </div>
        <div className="flex flex-col items-center flex-shrink-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:bg-zinc-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-zinc-600 mt-1 uppercase tracking-wide hidden md:block">
            ESC
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-5 py-4">
        <div className="mb-4">
          <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div className={TAB_MIN_HEIGHT}>
          {activeTab === "review" && (
            <ReviewTab
              rating={rating}
              setRating={setRating}
              ratingMode={ratingMode}
              setRatingMode={setRatingMode}
              platform={platform}
              setPlatform={setPlatform}
              platforms={game.platforms}
              review={review}
              setReview={setReview}
              spoilers={spoilers}
              setSpoilers={setSpoilers}
              mastered={mastered}
              setMastered={setMastered}
              aspects={aspects}
              setAspects={setAspects}
            />
          )}
          {activeTab === "dates" && (
            <DatesTab
              startedOn={startedOn}
              setStartedOn={setStartedOn}
              finishedOn={finishedOn}
              setFinishedOn={setFinishedOn}
            />
          )}
          {activeTab === "details" && (
            <DetailsTab
              reviewTitle={reviewTitle}
              setReviewTitle={setReviewTitle}
              replay={replay}
              setReplay={setReplay}
              hoursPlayed={hoursPlayed}
              setHoursPlayed={setHoursPlayed}
              minutesPlayed={minutesPlayed}
              setMinutesPlayed={setMinutesPlayed}
              playedPlatform={playedPlatform}
              setPlayedPlatform={setPlayedPlatform}
              platforms={game.platforms}
              onDelete={handleDelete}
              deleting={deleting}
              isEditing={isEditing}
            />
          )}
        </div>
      </div>

      <div
        className="flex items-center justify-end gap-2 sm:gap-3 px-4 md:px-5 py-3 border-t border-zinc-700 flex-shrink-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer active:bg-zinc-600"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
            submitting
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
              : "bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white cursor-pointer shadow-lg shadow-indigo-500/20"
          }`}
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isEditing ? "Salvar" : "Criar Review"}
        </button>
      </div>
    </div>
  )
}