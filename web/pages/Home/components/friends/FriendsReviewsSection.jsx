import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { useDateTime } from "#hooks/useDateTime"
import { supabase } from "#lib/supabase"
import GameCover from "@components/Game/GameCover"
import ReviewRating from "@components/Game/ReviewRating"
import StatusBadge from "@components/Game/StatusBadge"
import Playtime from "@components/Game/Playtime"
import LikeButton from "@components/UI/LikeButton"
import DragScrollRow from "@components/UI/DragScrollRow"
import { ReviewIndicators } from "@components/Game/Review"

function CardSkeleton() {
  return (
    <div className="w-72 flex-shrink-0 bg-zinc-800/50 rounded-lg overflow-hidden animate-pulse">
      <div className="p-3 flex gap-3">
        <div className="w-14 h-20 bg-zinc-700/50 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-zinc-700/50 rounded w-3/4" />
          <div className="h-3 bg-zinc-700/50 rounded w-1/2" />
          <div className="h-3 bg-zinc-700/50 rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}

function FriendReviewCard({ review, user, game }) {
  const { user: currentUser } = useAuth()
  const { getTimeAgo } = useDateTime()
  const { t } = useTranslation("reviews")

  if (!game || !user) return null

  return (
    <div className="w-72 flex-shrink-0 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 rounded-lg overflow-hidden transition-colors">
      <div className="p-3">
        <div className="flex gap-3">
          <Link to={`/game/${game.slug}`} className="flex-shrink-0">
            <GameCover
              game={game}
              customCoverUrl={game.customCoverUrl}
              className="w-14 h-20 rounded"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              to={`/game/${game.slug}`}
              className="text-sm font-medium text-white hover:text-indigo-400 transition-colors line-clamp-1"
            >
              {game.name}
            </Link>

            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <ReviewRating rating={review.rating} ratingMode={review.rating_mode} size="sm" />
              <StatusBadge status={review.status} size="sm" />
              <ReviewIndicators review={review} size="sm" />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Link to={`/u/${user.username}`} className="flex-shrink-0">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-4 h-4 rounded-full object-cover"
                />
              </Link>
              <Link
                to={`/u/${user.username}`}
                className="text-xs text-zinc-400 hover:text-white transition-colors truncate"
              >
                {user.username}
              </Link>
              <span className="text-xs text-zinc-600">·</span>
              <span className="text-xs text-zinc-600 flex-shrink-0">{getTimeAgo(review.created_at)}</span>
            </div>
          </div>
        </div>

        {review.review && (
          <div className="mt-3 pt-3 border-t border-zinc-700/50">
            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {review.review}
            </p>
            <Link
              to={`/review/${review.id}`}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1.5 inline-block"
            >
              {t("readFullReview")}
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700/50">
          <Playtime hours={review.hours_played} minutes={review.minutes_played} size="sm" />
          <LikeButton type="review" targetId={review.id} currentUserId={currentUser?.user_id} size="sm" />
        </div>
      </div>
    </div>
  )
}

export default function FriendsReviewsSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [users, setUsers] = useState({})
  const [games, setGames] = useState({})
  const [loading, setLoading] = useState(true)
  
  const abortControllerRef = useRef(null)
  const fetchedForUserRef = useRef(null)

  useEffect(() => {
    if (!user) {
      setReviews([])
      setUsers({})
      setGames({})
      setLoading(false)
      fetchedForUserRef.current = null
      return
    }

    if (fetchedForUserRef.current === user.user_id) {
      return
    }

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    
    const currentAbortController = abortControllerRef.current

    async function fetchData() {
      setLoading(true)
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (currentAbortController.signal.aborted) return
        
        if (!session) {
          setLoading(false)
          return
        }

        const res = await fetch("/api/home/friendsReviews?limit=12&sortBy=recent", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: currentAbortController.signal,
        })

        if (currentAbortController.signal.aborted) return

        const data = await res.json()

        if (currentAbortController.signal.aborted) return

        setReviews(data.reviews || [])
        setUsers(data.users || {})
        setGames(data.games || {})
        fetchedForUserRef.current = user.user_id
      } catch (err) {
        if (err.name === "AbortError") return
        console.error("Error fetching friends reviews:", err)
      } finally {
        if (!currentAbortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      currentAbortController.abort()
    }
  }, [user])

  if (!user) return null
  if (!loading && reviews.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
        {t("home.sections.friendsReviews")}
      </h2>

      <DragScrollRow className="gap-3 pb-2" autoScroll loop>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))
          : reviews.map((review) => (
              <FriendReviewCard
                key={review.id}
                review={review}
                user={users[review.user_id]}
                game={games[review.game_id]}
              />
            ))}
      </DragScrollRow>
    </div>
  )
}