import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { MessageSquare, Clock, TrendingUp, BookOpen } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { SORT_OPTIONS } from "#constants/game"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
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
} from "@components/Game/Review"

const SORT_ICONS = {
  recent: Clock,
  popular: TrendingUp,
}

function SortButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
        active
          ? "bg-white text-black border-white"
          : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border-zinc-700/50"
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
    </button>
  )
}

function JourneyBadge({ journey, onClick }) {
  const { t } = useTranslation("reviews")

  if (!journey) return null

  const hours = Math.floor(journey.total_minutes / 60)
  const mins = journey.total_minutes % 60

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/15 transition-colors cursor-pointer"
    >
      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-xs text-emerald-400 font-medium truncate max-w-32">{journey.title}</span>
      <span className="text-xs text-emerald-400/70">
        {journey.total_sessions} {journey.total_sessions === 1 ? t("session") : t("sessions")}
        {journey.total_minutes > 0 && (
          <>
            {" · "}
            {hours > 0 && `${hours}h`}
            {mins > 0 && `${mins}m`}
          </>
        )}
      </span>
    </button>
  )
}

function GameCover({ game, size = "md", onClose }) {
  const sizes = {
    sm: "w-12 h-16",
    md: "w-16 h-20",
  }

  return (
    <Link to={`/game/${game?.slug}`} onClick={onClose} className="flex-shrink-0">
      <img
        src={game?.cover?.url}
        alt={game?.name}
        className={`${sizes[size]} object-cover rounded-lg border border-zinc-700/50 hover:border-zinc-500 transition-colors`}
      />
    </Link>
  )
}

function ReviewHeader({ review, game, user, onClose }) {
  const { t } = useTranslation("profile")
  const { getTimeAgo } = useDateTime()

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        {user && (
          <>
            <Link
              to={`/u/${user.username}`}
              onClick={onClose}
              className="text-base font-semibold text-white hover:text-zinc-300 transition-colors"
            >
              {user.username}
            </Link>
            <span className="text-zinc-500 text-sm">{t("reviews.rated")}</span>
          </>
        )}
        <Link
          to={`/game/${game?.slug}`}
          onClick={onClose}
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
    </div>
  )
}

export function ProfileReviewCard({ review, game, user, journey, onJourneyUpdate }) {
  const [showModal, setShowModal] = useState(false)
  const [showJourney, setShowJourney] = useState(false)
  const aspects = review.aspect_ratings || []

  return (
    <>
      <div className="rounded-xl p-5 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors">
        <div className="flex items-start gap-3.5">
          {user ? (
            <Link to={`/u/${user.username}`} className="flex-shrink-0">
              <AvatarWithDecoration
                src={user.avatar}
                alt={user.username}
                decoration={user.avatar_decoration}
                size="lg"
              />
            </Link>
          ) : (
            <GameCover game={game} />
          )}

          <div className="flex-1 min-w-0">
            <ReviewHeader review={review} game={game} user={user} />

            {aspects.length > 0 && (
              <div className="mt-3 p-3 bg-zinc-900/40 border border-zinc-700/30 rounded-lg">
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
            </div>
          </div>

          {user && game?.cover?.url && (
            <div className="hidden sm:block">
              <GameCover game={game} size="sm" />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        fullscreenMobile
        showCloseButton={false}
        maxWidth="max-w-2xl"
        className="!bg-zinc-900 !border-zinc-700 !rounded-t-2xl md:!rounded-xl !shadow-2xl"
      >
        <div className="flex items-center gap-3.5 p-5 border-b border-zinc-700/50 flex-shrink-0">
          <GameCover game={game} size="sm" onClose={() => setShowModal(false)} />
          <ReviewHeader
            review={review}
            game={game}
            user={user}
            onClose={() => setShowModal(false)}
          />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <ReviewModalContent review={review} />
          {journey && (
            <div className="px-5 pb-5">
              <JourneyBadge journey={journey} onClick={() => { setShowModal(false); setShowJourney(true) }} />
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-zinc-400" />
          {t("reviews.title")}
          {!loading && total > 0 && (
            <span className="text-sm text-zinc-500 font-normal">{total}</span>
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
                onJourneyUpdate={fetchReviews}
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
