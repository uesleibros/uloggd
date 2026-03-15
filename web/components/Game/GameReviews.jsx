import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { Clock, TrendingUp } from "lucide-react"
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
import Modal from "@components/UI/Modal"
import Pagination from "@components/UI/Pagination"
import { JournalViewModal } from "@components/Game/Journal/JournalViewModal"
import {
  AspectRatingsPreview,
  ReviewIndicators,
  ReviewModalContent,
  ReviewContent,
  ReviewEmptyState,
  ReviewSkeleton,
  LikeButton,
  JourneyBadge,
  SortButton,
} from "@components/Game/Review"

const SORT_ICONS = {
  recent: Clock,
  popular: TrendingUp,
}

function ReviewMeta({ review, user, onClose }) {
  const { t } = useTranslation("reviews")
  const { getTimeAgo } = useDateTime()

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/u/${user?.username}`}
          onClick={onClose}
          className="text-base font-semibold text-white hover:text-zinc-300 transition-colors truncate"
        >
          {user?.username || t("unknownUser")}
        </Link>
        <UserBadges user={user} size="md" clickable />
        <StatusBadge status={review.status} />
        <ReviewIndicators review={review} />
      </div>

      <div className="flex items-center gap-3 mt-1.5">
        <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
        <span className="text-sm text-zinc-500">{getTimeAgo(review.created_at)}</span>
      </div>
    </div>
  )
}

export function ReviewCard({ review, user, currentUserId, journey, onJourneyUpdate }) {
  const [showModal, setShowModal] = useState(false)
  const [showJourney, setShowJourney] = useState(false)
  const aspects = review.aspect_ratings || []

  return (
    <>
      <div className="group rounded-xl p-5 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-200">
        <div className="flex items-start gap-4">
          <Link to={`/u/${user?.username}`} className="flex-shrink-0">
            <AvatarWithDecoration
              src={user?.avatar}
              alt={user?.username}
              decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
              size="lg"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <ReviewMeta review={review} user={user} />

            {aspects.length > 0 && (
              <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-700/40 rounded-lg">
                <AspectRatingsPreview aspects={aspects} compact />
              </div>
            )}

            {review.review && (
              <div className="mt-4">
                <ReviewContent review={review} onOpenModal={() => setShowModal(true)} />
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700/30 gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <Playtime hours={review.hours_played} minutes={review.minutes_played} />
                {journey && (
                  <JourneyBadge journey={journey} onClick={() => setShowJourney(true)} />
                )}
              </div>
              <LikeButton reviewId={review.id} currentUserId={currentUserId} />
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        fullscreenMobile
        showCloseButton={false}
        maxWidth="max-w-2xl"
        noScroll
        className="!bg-zinc-900 !border-zinc-700/80 !rounded-t-2xl md:!rounded-xl !shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-700/50 flex-shrink-0">
          <div className="flex items-start gap-4 min-w-0">
            <Link to={`/u/${user?.username}`} onClick={() => setShowModal(false)} className="flex-shrink-0">
              <AvatarWithDecoration
                src={user?.avatar}
                alt={user?.username}
                decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
                size="lg"
              />
            </Link>
            <ReviewMeta review={review} user={user} onClose={() => setShowModal(false)} />
          </div>
          <LikeButton reviewId={review.id} currentUserId={currentUserId} />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <ReviewModalContent review={review} />
          {journey && (
            <div className="px-5 pb-5">
              <JourneyBadge
                journey={journey}
                onClick={() => {
                  setShowModal(false)
                  setShowJourney(true)
                }}
              />
            </div>
          )}
        </div>
      </Modal>

      {showJourney && journey && (
        <JournalViewModal
          journeyId={journey.id}
          onClose={() => setShowJourney(false)}
          onUpdate={onJourneyUpdate}
        />
      )}
    </>
  )
}

export function ProfileReviewCard({ review, game, user }) {
  const { user: currentUser } = useAuth()
  const { getTimeAgo } = useDateTime()
  const [showModal, setShowModal] = useState(false)
  const aspects = review.aspect_ratings || []

  if (!game) return null

  return (
    <>
      <div className="group rounded-xl p-5 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-200">
        <div className="flex gap-4">
          <Link to={`/game/${game.slug}`} className="flex-shrink-0">
            <img
              src={game.cover_url}
              alt={game.name}
              className="w-16 h-20 object-cover rounded-lg border border-zinc-700/50 group-hover:border-zinc-600 transition-colors"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              to={`/game/${game.slug}`}
              className="text-base font-semibold text-white hover:text-zinc-300 transition-colors line-clamp-1"
            >
              {game.name}
            </Link>

            <div className="flex items-center gap-2 flex-wrap mt-1">
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
                <ReviewContent review={review} onOpenModal={() => setShowModal(true)} />
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700/30">
              <Playtime hours={review.hours_played} minutes={review.minutes_played} />
              <LikeButton reviewId={review.id} currentUserId={currentUser?.user_id} />
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        fullscreenMobile
        showCloseButton={false}
        maxWidth="max-w-2xl"
        noScroll
        className="!bg-zinc-900 !border-zinc-700/80 !rounded-t-2xl md:!rounded-xl !shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-700/50 flex-shrink-0">
          <div className="flex items-start gap-4 min-w-0">
            <Link to={`/game/${game.slug}`} onClick={() => setShowModal(false)} className="flex-shrink-0">
              <img
                src={game.cover_url}
                alt={game.name}
                className="w-12 h-16 object-cover rounded-lg border border-zinc-700/50"
              />
            </Link>
            <div className="min-w-0">
              <Link
                to={`/game/${game.slug}`}
                onClick={() => setShowModal(false)}
                className="text-base font-semibold text-white hover:text-zinc-300 transition-colors line-clamp-1"
              >
                {game.name}
              </Link>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <StatusBadge status={review.status} />
                <ReviewIndicators review={review} />
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
                <span className="text-sm text-zinc-500">{getTimeAgo(review.created_at)}</span>
              </div>
            </div>
          </div>
          <LikeButton reviewId={review.id} currentUserId={currentUser?.user_id} />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <ReviewModalContent review={review} />
        </div>
      </Modal>
    </>
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

    const params = new URLSearchParams({
      gameId,
      sortBy,
      page,
      limit: 20,
    })

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
        <h2 className="text-lg font-semibold text-white">
          {t("communityReviews")}
          {!loading && total > 0 && (
            <span className="text-sm text-zinc-500 font-normal ml-2">({total})</span>
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
              {t(`sort.${option.key}`)}
            </SortButton>
          ))}
        </div>
      </div>

      {loading ? (
        <ReviewSkeleton />
      ) : reviews.length > 0 ? (
        <>
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                user={users[review.user_id]}
                currentUserId={currentUser?.id}
                journey={review.journey_id ? journeys[review.journey_id] : null}
                onJourneyUpdate={fetchReviews}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
          )}
        </>
      ) : (
        <ReviewEmptyState />
      )}
    </div>
  )
}
