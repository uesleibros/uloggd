import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { MessageSquare, Clock, TrendingUp } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { useJournalEvents } from "#hooks/useJournalEvents"
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

function GameCoverLink({ game, size = "md" }) {
  const sizes = {
    sm: "w-12 h-16",
    md: "w-16 h-20",
  }

  if (!game?.cover_url) return null

  return (
    <Link to={`/game/${game.slug}`} className="flex-shrink-0 group/cover">
      <img
        src={game.cover_url}
        alt={game.name}
        className={`${sizes[size]} object-cover rounded-lg border border-zinc-700/50 group-hover/cover:border-zinc-500 transition-colors`}
      />
    </Link>
  )
}

export function ProfileReviewCard({ review, game, user, journey }) {
  const { user: currentUser } = useAuth()
  const { t } = useTranslation("profile")
  const { getTimeAgo } = useDateTime()
  const aspects = review.aspect_ratings || []

  return (
    <div className="group rounded-xl p-5 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-200">
      <div className="flex items-start gap-4">
        {user ? (
          <Link to={`/u/${user.username}`} className="flex-shrink-0">
            <AvatarWithDecoration
              src={user.avatar}
              alt={user.username}
              decorationUrl={user.equipped?.avatar_decoration?.asset_url}
              size="lg"
            />
          </Link>
        ) : (
          <GameCoverLink game={game} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {user && (
              <>
                <Link
                  to={`/u/${user.username}`}
                  className="text-base font-semibold text-white hover:text-zinc-300 transition-colors"
                >
                  {user.username}
                </Link>
                <UserBadges user={user} size="md" clickable />
                <span className="text-zinc-500 text-sm">{t("reviews.rated")}</span>
              </>
            )}
            <Link
              to={`/game/${game?.slug}`}
              className="text-base font-semibold text-white hover:text-zinc-300 transition-colors truncate"
            >
              {game?.name || t("reviews.game")}
            </Link>
            <StatusBadge status={review.status} />
            <ReviewIndicators review={review} />
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
            <span className="text-sm text-zinc-500">{getTimeAgo(review.created_at)}</span>
          </div>

          {aspects.length > 0 && (
            <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-700/40 rounded-lg">
              <AspectRatingsPreview aspects={aspects} compact />
            </div>
          )}

          {review.review && (
            <div className="mt-4">
              <ReviewContent review={review} linkTo={`/review/${review.id}`} />
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700/30 gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Playtime hours={review.hours_played} minutes={review.minutes_played} />
              {journey && <JourneyBadge journey={journey} />}
            </div>
            <LikeButton type="review" targetId={review.id} currentUserId={currentUser?.user_id} />
          </div>
        </div>

        {user && game?.cover_url && (
          <div className="hidden sm:block">
            <GameCoverLink game={game} size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProfileReviews({ userId }) {
  const { t } = useTranslation("profile")
  const { t: tReviews } = useTranslation("reviews")
  const [reviews, setReviews] = useState([])
  const [games, setGames] = useState({})
  const [journeys, setJourneys] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("recent")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchReviews = useCallback(() => {
    if (!userId) return
    setLoading(true)

    const params = new URLSearchParams({
      userId,
      sortBy,
      page,
      limit: 10,
    })

    fetch(`/api/reviews/byUser?${params}`)
      .then((r) => (r.ok ? r.json() : { reviews: [], games: {}, journeys: {} }))
      .then((data) => {
        setReviews(data.reviews || [])
        setGames(data.games || {})
        setJourneys(data.journeys || {})
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, sortBy, page])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useJournalEvents(fetchReviews)

  function handleSortChange(newSort) {
    if (newSort === sortBy) return
    setSortBy(newSort)
    setPage(1)
  }

  function handlePageChange(newPage) {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-zinc-400" />
          {t("reviews.title")}
          {!loading && total > 0 && (
            <span className="text-sm text-zinc-500 font-normal">({total})</span>
          )}
        </h2>

        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <SortButton
              key={option.key}
              active={sortBy === option.key}
              onClick={() => handleSortChange(option.key)}
              icon={SORT_ICONS[option.key]}
            >
              {tReviews(`sort.${option.key}`)}
            </SortButton>
          ))}
        </div>
      </div>

      {loading ? (
        <ReviewSkeleton count={3} showCover />
      ) : reviews.length > 0 ? (
        <>
          <div className="space-y-3">
            {reviews.map((review) => (
              <ProfileReviewCard
                key={review.id}
                review={review}
                game={games[review.game_id]}
                journey={review.journey_id ? journeys[review.journey_id] : null}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
          )}
        </>
      ) : (
        <ReviewEmptyState
          title={t("reviews.empty.title")}
          subtitle={t("reviews.empty.subtitle")}
        />
      )}
    </div>
  )
}
