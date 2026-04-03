import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { Clock, TrendingUp } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { useJournalEvents } from "#hooks/useJournalEvents"
import { useReviewEvents } from "#hooks/useReviewEvents"
import { SORT_OPTIONS } from "#constants/game"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import StatusBadge from "@components/Game/StatusBadge"
import ReviewRating from "@components/Game/ReviewRating"
import Playtime from "@components/Game/Playtime"
import Pagination from "@components/UI/Pagination"
import LikeButton from "@components/UI/LikeButton"
import {
  AspectRatingsPreview,
  ReviewIndicators,
  ReviewContent,
  ReviewEmptyState,
  ReviewSkeleton,
  JourneyBadge,
  SortButton,
} from "@components/Game/Review"

const SORT_ICONS = {
  recent: Clock,
  popular: TrendingUp,
}

function ReviewMeta({ children }) {
  return (
    <div className="flex items-center gap-3 flex-wrap text-sm text-zinc-500">
      {children}
    </div>
  )
}

function ReviewFooter({ children }) {
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/60 gap-3 flex-wrap">
      {children}
    </div>
  )
}

export function ReviewCard({ review, user, currentUserId, journey }) {
  const { getTimeAgo } = useDateTime()
  const { t } = useTranslation("reviews")
  const aspects = review.aspect_ratings || []

  return (
    <div className="py-5 first:pt-0">
      <div className="flex gap-3.5">
        <Link to={`/u/${user?.username}`} className="flex-shrink-0 mt-0.5">
          <AvatarWithDecoration
            src={user?.avatar}
            alt={user?.username}
            decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
            size="lg"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/u/${user?.username}`}
              className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors truncate"
            >
              {user?.username || t("unknownUser")}
            </Link>
            <UserBadges user={user} size="md" clickable />
            <StatusBadge status={review.status} />
            <ReviewIndicators review={review} />
          </div>

          <ReviewMeta>
            <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
            <span>{getTimeAgo(review.created_at)}</span>
          </ReviewMeta>

          {aspects.length > 0 && (
            <div className="mt-3">
              <AspectRatingsPreview aspects={aspects} compact />
            </div>
          )}

          {review.review && (
            <div className="mt-3">
              <ReviewContent review={review} linkTo={`/review/${review.id}`} />
            </div>
          )}

          <ReviewFooter>
            <div className="flex items-center gap-3 flex-wrap">
              <Playtime hours={review.hours_played} minutes={review.minutes_played} />
              {journey && <JourneyBadge journey={journey} />}
            </div>
            <LikeButton type="review" targetId={review.id} currentUserId={currentUserId} />
          </ReviewFooter>
        </div>
      </div>
    </div>
  )
}

export function ProfileReviewCard({ review, game, user }) {
  const { user: currentUser } = useAuth()
  const { getTimeAgo } = useDateTime()
  const aspects = review.aspect_ratings || []

  if (!game) return null

  return (
    <div className="py-5 first:pt-0">
      <div className="flex gap-3.5">
        <Link to={`/game/${game.slug}`} className="flex-shrink-0">
          <img
            src={game.cover_url}
            alt={game.name}
            className="w-12 h-16 object-cover rounded-lg bg-zinc-800"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            to={`/game/${game.slug}`}
            className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors line-clamp-1"
          >
            {game.name}
          </Link>

          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <StatusBadge status={review.status} />
            <ReviewIndicators review={review} />
          </div>

          <ReviewMeta>
            <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
            <span>{getTimeAgo(review.created_at)}</span>
          </ReviewMeta>

          {aspects.length > 0 && (
            <div className="mt-3">
              <AspectRatingsPreview aspects={aspects} compact />
            </div>
          )}

          {review.review && (
            <div className="mt-3">
              <ReviewContent review={review} linkTo={`/review/${review.id}`} />
            </div>
          )}

          <ReviewFooter>
            <Playtime hours={review.hours_played} minutes={review.minutes_played} />
            <LikeButton type="review" targetId={review.id} currentUserId={currentUser?.user_id} />
          </ReviewFooter>
        </div>
      </div>
    </div>
  )
}

export default function GameReviews({ gameId }) {
  const { t } = useTranslation("reviews")
  const { user: currentUser } = useAuth()
  const [reviews, setReviews] = useState([])
  const [users, setUsers] = useState({})
  const [journeys, setJourneys] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("recent")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchReviews = useCallback(() => {
    if (!gameId) return
    setLoading(true)

    const params = new URLSearchParams({ gameId, sortBy, page, limit: 20 })

    fetch(`/api/reviews/public?${params}`)
      .then((r) => (r.ok ? r.json() : { reviews: [], users: {}, journeys: {} }))
      .then((data) => {
        setReviews(data.reviews || [])
        setUsers(data.users || {})
        setJourneys(data.journeys || {})
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gameId, sortBy, page])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useJournalEvents(fetchReviews)
  useReviewEvents(fetchReviews, gameId)

  function handleSort(key) {
    if (key === sortBy) return
    setSortBy(key)
    setPage(1)
  }

  function handlePage(p) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
          {t("communityReviews")}
          {!loading && total > 0 && (
            <span className="ml-2 text-xs font-medium text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </h2>

        <div className="flex gap-1.5">
          {SORT_OPTIONS.map((option) => (
            <SortButton
              key={option.key}
              active={sortBy === option.key}
              onClick={() => handleSort(option.key)}
              icon={SORT_ICONS[option.key]}
            >
              {t(`sort.${option.key}`)}
            </SortButton>
          ))}
        </div>
      </div>

      {loading ? (
        <ReviewSkeleton />
      ) : reviews.length > 0 ? (
        <>
          <div className="divide-y divide-zinc-800/60">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                user={users[review.user_id]}
                currentUserId={currentUser?.user_id}
                journey={review.journey_id ? journeys[review.journey_id] : null}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePage} />
            </div>
          )}
        </>
      ) : (
        <ReviewEmptyState />
      )}
    </div>
  )
}
