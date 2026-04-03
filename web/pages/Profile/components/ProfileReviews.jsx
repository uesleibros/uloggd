import { useState, useEffect, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { Clock, TrendingUp } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { useJournalEvents } from "#hooks/useJournalEvents"
import { useCustomCovers } from "#hooks/useCustomCovers"
import { SORT_OPTIONS } from "#constants/game"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import StatusBadge from "@components/Game/StatusBadge"
import ReviewRating from "@components/Game/ReviewRating"
import Playtime from "@components/Game/Playtime"
import GameCover from "@components/Game/GameCover"
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

export function ProfileReviewCard({ review, game, user, journey, customCoverUrl }) {
  const { user: currentUser } = useAuth()
  const { t } = useTranslation("profile")
  const { getTimeAgo } = useDateTime()
  const aspects = review.aspect_ratings || []

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex gap-3">
        {user ? (
          <Link to={`/u/${user.username}`} className="flex-shrink-0">
            <AvatarWithDecoration
              src={user.avatar}
              alt={user.username}
              decorationUrl={user.equipped?.avatar_decoration?.asset_url}
              size="lg"
            />
          </Link>
        ) : game ? (
          <Link to={`/game/${game.slug}`} className="flex-shrink-0">
            <GameCover
              game={game}
              customCoverUrl={customCoverUrl}
              className="w-11 h-15 rounded-lg"
            />
          </Link>
        ) : null}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {user && (
              <>
                <Link
                  to={`/u/${user.username}`}
                  className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
                >
                  {user.username}
                </Link>
                <UserBadges user={user} size="md" clickable />
                <span className="text-xs text-zinc-600">·</span>
              </>
            )}
            <Link
              to={`/game/${game?.slug}`}
              className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors truncate"
            >
              {game?.name || t("reviews.game")}
            </Link>
            <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-500">{getTimeAgo(review.created_at)}</span>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={review.status} />
            <ReviewIndicators review={review} />
            {journey && <JourneyBadge journey={journey} />}
            <Playtime hours={review.hours_played} minutes={review.minutes_played} />
          </div>

          {aspects.length > 0 && (
            <div className="mt-3">
              <AspectRatingsPreview aspects={aspects} compact />
            </div>
          )}

          {review.review && (
            <div className="mt-2.5">
              <ReviewContent review={review} linkTo={`/review/${review.id}`} />
            </div>
          )}

          <div className="mt-2.5">
            <LikeButton type="review" targetId={review.id} currentUserId={currentUser?.user_id} />
          </div>
        </div>

        {user && game && (
          <Link to={`/game/${game.slug}`} className="hidden sm:block flex-shrink-0">
            <GameCover
              game={game}
              customCoverUrl={customCoverUrl}
              className="w-11 h-15 rounded-lg"
            />
          </Link>
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

    const params = new URLSearchParams({ userId, sortBy, page, limit: 10 })

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

  const gameSlugs = useMemo(() => {
    return Object.values(games).map((g) => g.slug).filter(Boolean)
  }, [games])

  const { getCustomCover } = useCustomCovers(userId, gameSlugs)

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
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
          {t("reviews.title")}
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
              {tReviews(`sort.${option.key}`)}
            </SortButton>
          ))}
        </div>
      </div>

      {loading ? (
        <ReviewSkeleton count={3} showCover />
      ) : reviews.length > 0 ? (
        <>
          <div className="divide-y divide-zinc-800/60">
            {reviews.map((review) => {
              const game = games[review.game_id]
              return (
                <ProfileReviewCard
                  key={review.id}
                  review={review}
                  game={game}
                  journey={review.journey_id ? journeys[review.journey_id] : null}
                  customCoverUrl={game?.slug ? getCustomCover(game.slug) : null}
                />
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePage} />
            </div>
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
