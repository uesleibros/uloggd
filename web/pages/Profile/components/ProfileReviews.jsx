import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { MessageSquare } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { SORT_OPTIONS } from "#constants/game"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import StatusBadge from "@components/Game/StatusBadge"
import ReviewRating from "@components/Game/ReviewRating"
import Playtime from "@components/Game/Playtime"
import Modal from "@components/UI/Modal"
import Pagination from "@components/UI/Pagination"
import {
  AspectRatingsPreview,
  ReviewIndicators,
  ReviewModalContent,
  ReviewContent,
  ReviewEmptyState,
  ReviewSkeleton,
} from "@components/Game/Review"

function SortButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all border ${
        active
          ? "bg-white text-black border-white"
          : "text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50"
      }`}
    >
      {children}
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

export function ProfileReviewCard({ review, game, user }) {
  const [showModal, setShowModal] = useState(false)
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

            <div className="mt-4 pt-4 border-t border-zinc-700/30">
              <Playtime hours={review.hours_played} minutes={review.minutes_played} />
            </div>
          </div>

          {user && game?.cover?.url && (
            <GameCover game={game} size="sm" className="hidden sm:block" />
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
        </div>
      </Modal>
    </>
  )
}

export default function ProfileReviews({ userId }) {
  const { t } = useTranslation("profile")
  const { t: tReviews } = useTranslation("reviews")
  const [reviews, setReviews] = useState([])
  const [games, setGames] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("recent")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    const params = new URLSearchParams({
      userId,
      sortBy,
      page,
      limit: 10,
    })

    fetch(`/api/reviews/byUser?${params}`)
      .then((r) => (r.ok ? r.json() : { reviews: [], games: {} }))
      .then((data) => {
        setReviews(data.reviews || [])
        setGames(data.games || {})
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, sortBy, page])

  function handleSortChange(newSort) {
    if (newSort === sortBy) return
    setSortBy(newSort)
    setPage(1)
  }

  function handlePageChange(newPage) {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (loading) {
    return <ReviewSkeleton count={3} showCover />
  }

  if (!reviews.length) {
    return (
      <ReviewEmptyState
        title={t("reviews.empty.title")}
        subtitle={t("reviews.empty.subtitle")}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-zinc-400" />
          {t("reviews.title")}
          {total > 0 && <span className="text-sm text-zinc-500 font-normal">{total}</span>}
        </h2>

        <div className="flex gap-1">
          {SORT_OPTIONS.map((option) => (
            <SortButton
              key={option.key}
              active={sortBy === option.key}
              onClick={() => handleSortChange(option.key)}
            >
              {tReviews(`sort.${option.key}`)}
            </SortButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <ProfileReviewCard key={review.id} review={review} game={games[review.game_id]} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
      )}
    </div>
  )
}
