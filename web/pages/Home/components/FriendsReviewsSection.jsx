import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { useDateTime } from "#hooks/useDateTime"
import { supabase } from "#lib/supabase"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import StatusBadge from "@components/Game/StatusBadge"
import ReviewRating from "@components/Game/ReviewRating"
import GameCover from "@components/Game/GameCover"
import { ReviewIndicators, ReviewContent } from "@components/Game/Review"

function FriendReviewCard({ review, user, game }) {
  const { getTimeAgo } = useDateTime()

  if (!game) return null

  return (
    <div className="flex-shrink-0 w-80 rounded-xl p-4 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <Link to={`/u/${user?.username}`} className="flex-shrink-0">
          <AvatarWithDecoration
            src={user?.avatar}
            alt={user?.username}
            decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
            size="sm"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/u/${user?.username}`}
              className="text-sm font-medium text-white hover:text-zinc-300 transition-colors truncate"
            >
              {user?.username}
            </Link>
            <UserBadges user={user} size="sm" />
          </div>
          <span className="text-xs text-zinc-500">{getTimeAgo(review.created_at)}</span>
        </div>
      </div>

      <Link to={`/game/${game.slug}`} className="flex gap-3 group">
        <GameCover
          game={game}
          className="w-12 h-16 rounded flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
            {game.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <ReviewRating rating={review.rating} ratingMode={review.rating_mode} size="sm" />
            <StatusBadge status={review.status} size="sm" />
            <ReviewIndicators review={review} size="sm" />
          </div>
        </div>
      </Link>

      {review.review && (
        <div className="mt-3 pt-3 border-t border-zinc-700/50">
          <p className="text-xs text-zinc-400 line-clamp-2">{review.review}</p>
        </div>
      )}
    </div>
  )
}

function FriendReviewSkeleton() {
  return (
    <div className="flex-shrink-0 w-80 rounded-xl p-4 bg-zinc-800/50 border border-zinc-700/50 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-zinc-700" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 bg-zinc-700 rounded" />
          <div className="h-2 w-16 bg-zinc-700/50 rounded" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-12 h-16 bg-zinc-700 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 bg-zinc-700 rounded" />
          <div className="h-3 w-20 bg-zinc-700/50 rounded" />
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
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!user || fetchedRef.current) return

    let cancelled = false

    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        const res = await fetch("/api/home/friendsReviews?limit=10&sortBy=recent", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        const data = await res.json()

        if (!cancelled) {
          setReviews(data.reviews || [])
          setUsers(data.users || {})
          setGames(data.games || {})
          setLoading(false)
          fetchedRef.current = true
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => { cancelled = true }
  }, [user])

  if (!user) return null

  if (loading) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
          {t("home.sections.friendsReviews")}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {[...Array(4)].map((_, i) => (
            <FriendReviewSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (reviews.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
        {t("home.sections.friendsReviews")}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {reviews.map((review) => (
          <FriendReviewCard
            key={review.id}
            review={review}
            user={users[review.user_id]}
            game={games[review.game_id]}
          />
        ))}
      </div>
    </section>
  )
}
