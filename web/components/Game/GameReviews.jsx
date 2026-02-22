import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Heart, Trophy, ThumbsUp, AlertTriangle, Eye, FileText, MessageSquare } from "lucide-react"
import { MarkdownPreview } from "@components/MarkdownEditor"
import UserBadges from "@components/User/UserBadges"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import StatusBadge from "@components/Game/StatusBadge"
import ReviewRating from "@components/Game/ReviewRating"
import StarsDisplay from "@components/Game/StarsDisplay"
import Playtime from "@components/Game/Playtime"
import Modal from "@components/UI/Modal"
import LikeListModal from "@components/Game/LikeListModal"
import CountUp from "@components/UI/CountUp"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"
import { getTimeAgo } from "#utils/formatDate"
import { formatRating } from "#utils/rating"
import { SORT_OPTIONS } from "#constants/game"

function AspectRatingDisplay({ aspect }) {
  const mode = aspect.ratingMode || "stars_5h"
  const isStars = mode === "stars_5" || mode === "stars_5h"

  if (aspect.rating == null) return <span className="text-xs text-zinc-700">—</span>

  if (isStars) return <StarsDisplay rating={aspect.rating} ratingMode={mode} size="sm" />

  const formatted = formatRating(aspect.rating, mode)
  if (!formatted) return null

  return (
    <span className="text-xs font-semibold text-zinc-300 tabular-nums">
      {formatted.display}<span className="text-zinc-600">/{formatted.max}</span>
    </span>
  )
}

function AspectRatingsPreview({ aspects, compact = false }) {
  if (!aspects?.length) return null

  return (
    <div className={`space-y-1.5 ${compact ? "" : "pt-1"}`}>
      {aspects.map((aspect, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 truncate">{aspect.label}</span>
          <AspectRatingDisplay aspect={aspect} />
        </div>
      ))}
    </div>
  )
}

function ReviewIndicators({ review }) {
  return (
    <>
      {review.liked && <Heart className="w-5 h-5 text-red-500 fill-current flex-shrink-0" />}
      {review.mastered && <Trophy className="w-5 h-5 text-amber-400 fill-current flex-shrink-0" />}
    </>
  )
}

function SpoilerOverlay({ onReveal }) {
  return (
    <div className="relative rounded-xl bg-zinc-800/50 border border-zinc-700 p-6 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-300">Esta review contém spoilers</p>
        <p className="text-xs text-zinc-500 mt-1">O conteúdo está oculto para proteger sua experiência.</p>
      </div>
      <button
        onClick={onReveal}
        className="px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 rounded-lg text-sm text-zinc-300 hover:text-white font-medium cursor-pointer transition-all duration-200 flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        Revelar conteúdo
      </button>
    </div>
  )
}

function LikeButton({ reviewId, currentUserId }) {
  const [isLiked, setIsLiked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showLikes, setShowLikes] = useState(false)

  useEffect(() => {
    fetch("/api/reviews/likeStatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, currentUserId }),
    })
      .then(r => r.json())
      .then(data => {
        setCount(data.count || 0)
        setIsLiked(data.isLiked || false)
      })
      .catch(() => {})
  }, [reviewId, currentUserId])

  const handleLike = async () => {
    if (!currentUserId || loading) return
    setLoading(true)

    const action = isLiked ? "unlike" : "like"
    const newLiked = !isLiked
    const newCount = newLiked ? count + 1 : count - 1

    setIsLiked(newLiked)
    setCount(newCount)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsLiked(!newLiked)
        setCount(count)
        return
      }

      const r = await fetch("/api/reviews/@me/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reviewId, action }),
      })
      if (!r.ok) {
        setIsLiked(!newLiked)
        setCount(count)
      }
    } catch {
      setIsLiked(!newLiked)
      setCount(count)
    } finally {
      setLoading(false)
    }
  }

  const label = count === 1 ? "curtida" : "curtidas"

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={!currentUserId || loading}
          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer disabled:cursor-default ${
            isLiked
              ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/15"
              : "bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 hover:border-zinc-600/50"
          }`}
        >
          <ThumbsUp className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isLiked ? "fill-current" : ""}`} />
          <span className="text-sm font-medium">
            {isLiked ? "Curtido" : "Curtir"}
          </span>
        </button>
        {count > 0 && (
          <button
            onClick={() => setShowLikes(true)}
            className="text-sm text-zinc-500 hover:text-zinc-300 tabular-nums cursor-pointer transition-colors hover:underline"
          >
            <CountUp end={count} /> {label}
          </button>
        )}
      </div>

      <LikeListModal
        isOpen={showLikes}
        reviewId={reviewId}
        onClose={() => setShowLikes(false)}
      />
    </>
  )
}

function ReviewModalHeader({ review, user, currentUserId, onClose }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-zinc-700 flex-shrink-0">
      <div className="flex items-center gap-3.5 min-w-0">
        <Link to={`/u/${user?.username}`} onClick={onClose} className="flex-shrink-0">
          <AvatarWithDecoration
            src={user.avatar}
            alt={user.username}
            decoration={user.avatar_decoration}
            size="lg"
          />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/u/${user?.username}`} onClick={onClose} className="text-base font-semibold text-white hover:text-zinc-300 transition-colors">
              {user?.username || "Usuário"}
            </Link>
            <UserBadges user={user} size="md" clickable />
            <StatusBadge status={review.status} />
            <ReviewIndicators review={review} />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
            <span className="text-sm text-zinc-600">{getTimeAgo(review.created_at)}</span>
          </div>
        </div>
      </div>
      <LikeButton reviewId={review.id} currentUserId={currentUserId} />
    </div>
  )
}

function ReviewModalContent({ review }) {
  const aspects = review.aspect_ratings || []

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain p-5 md:p-7">
      {review.contain_spoilers && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 mb-5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-400 font-medium">Esta review contém spoilers</span>
        </div>
      )}

      {aspects.length > 0 && (
        <div className="mb-5 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Avaliação por aspecto</h4>
          <div className="space-y-2.5">
            {aspects.map((aspect, i) => (
              <div key={i}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">{aspect.label}</span>
                  <AspectRatingDisplay aspect={aspect} />
                </div>
                {aspect.review && (
                  <div className="mt-1.5 pl-0 text-xs text-zinc-500 leading-relaxed">
                    <MarkdownPreview content={aspect.review} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <MarkdownPreview content={review.review || ""} />

      <Playtime hours={review.hours_played} minutes={review.minutes_played} className="mt-6 pt-5 border-t border-zinc-700/50" />
    </div>
  )
}

function ReviewCard({ review, user, currentUserId }) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const hasReview = !!review.review
  const isLong = hasReview && review.review.length > 300
  const isSpoilerHidden = review.contain_spoilers && !spoilerRevealed
  const aspects = review.aspect_ratings || []
  const hasAspects = aspects.length > 0

  return (
    <>
      <div className="rounded-xl p-5 sm:p-6 bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-all duration-200">
        <div className="flex items-start gap-3.5">
          <Link to={`/u/${user?.username}`} className="flex-shrink-0">
            <AvatarWithDecoration
              src={user.avatar}
              alt={user.username}
              decoration={user.avatar_decoration}
              size="lg"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/u/${user?.username}`} className="text-base font-semibold text-white hover:text-zinc-300 transition-colors truncate">
                {user?.username || "Usuário"}
              </Link>
              <UserBadges user={user} size="md" clickable />
              <StatusBadge status={review.status} />
              <ReviewIndicators review={review} />
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
              <span className="text-sm text-zinc-600">{getTimeAgo(review.created_at)}</span>
            </div>

            {hasAspects && (
              <div className="mt-3 p-3 bg-zinc-900/40 border border-zinc-700/30 rounded-lg">
                <AspectRatingsPreview aspects={aspects} compact />
              </div>
            )}

            {hasReview && (
              <div className="mt-4">
                {isSpoilerHidden ? (
                  <SpoilerOverlay onReveal={() => setSpoilerRevealed(true)} />
                ) : isLong ? (
                  <div className="relative">
                    <div className="max-h-36 overflow-hidden">
                      <MarkdownPreview content={review.review} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-800/90 to-transparent pointer-events-none rounded-b-lg" />
                    <button
                      onClick={() => setShowModal(true)}
                      className="relative z-10 mt-2 px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer transition-all duration-200 flex items-center gap-2 font-medium bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg border border-zinc-700/50"
                    >
                      <FileText className="w-4 h-4" />
                      Ler review completa
                    </button>
                  </div>
                ) : (
                  <MarkdownPreview content={review.review} />
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <Playtime hours={review.hours_played} minutes={review.minutes_played} />
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
        className="!bg-zinc-900 !border-zinc-700 !rounded-t-2xl md:!rounded-xl !shadow-2xl"
      >
        <ReviewModalHeader review={review} user={user} currentUserId={currentUserId} onClose={() => setShowModal(false)} />
        <ReviewModalContent review={review} />
      </Modal>
    </>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-xl p-5 sm:p-6 bg-zinc-800/50 border border-zinc-700 animate-pulse">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-full bg-zinc-700 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-36 bg-zinc-700 rounded" />
              <div className="h-8 w-28 bg-zinc-700 rounded-lg" />
              <div className="space-y-2 mt-1">
                <div className="h-3.5 w-full bg-zinc-700 rounded" />
                <div className="h-3.5 w-3/4 bg-zinc-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl p-10 sm:p-14 bg-zinc-800/50 border border-zinc-700 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-zinc-600" />
      </div>
      <div className="text-center">
        <p className="text-sm text-zinc-400 font-medium">Nenhuma review ainda</p>
        <p className="text-sm text-zinc-600 mt-1">Seja o primeiro a avaliar este jogo!</p>
      </div>
    </div>
  )
}

export default function GameReviews({ gameId }) {
  const { user: currentUser } = useAuth()
  const [reviews, setReviews] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("recent")

  useEffect(() => {
    if (!gameId) return
    setLoading(true)

    fetch("/api/reviews/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, sortBy }),
    })
      .then((r) => r.ok ? r.json() : { reviews: [], users: {} })
      .then((data) => {
        setReviews(data.reviews || [])
        setUsers(data.users || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gameId, sortBy])

  const title = "Reviews da comunidade"

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-5">{title}</h2>
        <ReviewsSkeleton />
      </div>
    )
  }

  if (!reviews.length) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-5">{title}</h2>
        <EmptyState />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white">
          {title}
          <span className="text-sm text-zinc-500 font-normal ml-2">{reviews.length}</span>
        </h2>
        <div className="flex gap-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 ${
                sortBy === option.key
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} user={users[review.user_id]} currentUserId={currentUser?.id} />
        ))}
      </div>
    </div>
  )
}
