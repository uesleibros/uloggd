import { useState, useEffect, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  MessageSquareOff,
  Gamepad2,
} from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { useGamesBatch } from "#hooks/useGamesBatch"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import StatusBadge from "@components/Game/StatusBadge"
import ReviewRating from "@components/Game/ReviewRating"
import Playtime from "@components/Game/Playtime"
import GameCover from "@components/Game/GameCover"
import LikeButton from "@components/UI/LikeButton"
import CommentSection from "@components/UI/CommentSection"
import {
  AspectRatingsPreview,
  ReviewIndicators,
  JourneyBadge,
} from "@components/Game/Review"
import { JournalViewModal } from "@components/Game/Journal/JournalViewModal"

function ReviewPageSkeleton() {
  return (
    <div className="py-6 sm:py-10 max-w-3xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-16 bg-zinc-800 rounded" />
        <div className="flex gap-4">
          <div className="w-24 sm:w-32 aspect-[3/4] bg-zinc-800 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 bg-zinc-800 rounded" />
            <div className="h-4 w-32 bg-zinc-800/50 rounded" />
            <div className="h-4 w-24 bg-zinc-800/50 rounded" />
          </div>
        </div>
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-zinc-800/60 rounded" />
          <div className="h-4 w-full bg-zinc-800/50 rounded" />
          <div className="h-4 w-3/4 bg-zinc-800/40 rounded" />
        </div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getTimeAgo } = useDateTime()
  const { user: currentUser } = useAuth()
  const [review, setReview] = useState(null)
  const [user, setUser] = useState(null)
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showJourney, setShowJourney] = useState(false)

  const slugs = review ? [review.game_slug] : []
  const { getGame } = useGamesBatch(slugs)
  const game = review ? getGame(review.game_slug) : null

  usePageMeta(
    review && game
      ? {
          title: `${user?.username || "Review"} - ${game.name} - uloggd`,
          description: review.review?.substring(0, 160) || `Review de ${game.name}`,
        }
      : undefined
  )

  const fetchReview = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const r = await fetch(`/api/reviews/get?reviewId=${id}`)
      if (!r.ok) throw new Error("not found")

      const data = await r.json()
      setReview(data.review)
      setUser(data.user)
      setJourney(data.journey)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchReview()
  }, [fetchReview])

  if (loading) return <ReviewPageSkeleton />

  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <MessageSquareOff className="w-6 h-6 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-white">{t("review.notFound.title")}</h1>
        <p className="text-sm text-zinc-500">{t("review.notFound.message")}</p>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          {t("common.backToHome")}
        </Link>
      </div>
    )
  }

  const aspects = review.aspect_ratings || []

  return (
    <div className="py-6 sm:py-8 max-w-3xl mx-auto">
      <div className="mb-5">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.back")}
        </button>
      </div>

      <div className="flex gap-4 sm:gap-5 mb-6">
        <Link
          to={`/game/${review.game_slug}`}
          className="flex-shrink-0"
        >
          {game ? (
            <img
              src={game.cover_url}
              alt={game.name}
              className="w-20 sm:w-28 aspect-[3/4] object-cover rounded-lg border border-zinc-700/50 hover:border-zinc-600 transition-colors"
            />
          ) : (
            <div className="w-20 sm:w-28 aspect-[3/4] bg-zinc-800 rounded-lg border border-zinc-700/50 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-zinc-600" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {game && (
            <Link
              to={`/game/${review.game_slug}`}
              className="text-lg sm:text-xl font-bold text-white hover:text-zinc-300 transition-colors line-clamp-2"
            >
              {game.name}
            </Link>
          )}

          <div className="flex items-center gap-2.5 mt-2">
            <Link to={`/u/${user?.username}`} className="flex-shrink-0">
              <AvatarWithDecoration
                src={user?.avatar}
                alt={user?.username}
                decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
                size="sm"
              />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  to={`/u/${user?.username}`}
                  className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
                >
                  {user?.username}
                </Link>
                <UserBadges user={user} size="sm" clickable />
              </div>
              <span className="text-xs text-zinc-500">{getTimeAgo(review.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-3">
            <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
            <StatusBadge status={review.status} />
            <ReviewIndicators review={review} />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {aspects.length > 0 && (
          <div className="p-4 bg-zinc-800/40 border border-zinc-700/40 rounded-xl">
            <AspectRatingsPreview aspects={aspects} />
          </div>
        )}

        {review.review && (
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
              {review.review}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Playtime hours={review.hours_played} minutes={review.minutes_played} />
            {journey && (
              <JourneyBadge journey={journey} onClick={() => setShowJourney(true)} />
            )}
          </div>
          <LikeButton type="review" targetId={review.id} currentUserId={currentUser?.user_id} />
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-800">
        <CommentSection type="review" targetId={review.id} />
      </div>

      {showJourney && journey && (
        <JournalViewModal
          journeyId={journey.id}
          onClose={() => setShowJourney(false)}
          onUpdate={fetchReview}
        />
      )}
    </div>
  )
}
