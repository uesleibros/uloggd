import { useState, useEffect, useRef } from "react"
import { Heart, Gamepad2, MessageSquare } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import Pagination from "@components/UI/Pagination"
import { ProfileReviewCard } from "./ProfileReviews"

const GAMES_PER_PAGE = 24
const REVIEWS_PER_PAGE = 10

function GamesSkeleton() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {[...Array(12)].map((_, i) => (
        <GameCardSkeleton key={i} responsive />
      ))}
    </div>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-32 bg-zinc-800/50 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="rounded-xl p-10 sm:p-14 bg-zinc-800/30 border border-zinc-700/50 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <Icon className="w-6 h-6 text-zinc-500" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-zinc-400 font-medium">{title}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
        active
          ? "bg-white text-black border-white"
          : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border-zinc-700/50"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <span
        className={`text-xs min-w-5 px-1.5 py-0.5 rounded-md text-center ${
          active ? "bg-black/10 text-zinc-600" : "bg-zinc-700/50 text-zinc-500"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

export default function ProfileLikes({ userId, isOwnProfile, username }) {
  const { t } = useTranslation("profile")
  const [activeTab, setActiveTab] = useState("games")
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 })
  const [games, setGames] = useState({})
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [counts, setCounts] = useState({ games: 0, reviews: 0 })
  const containerRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    const gamesParams = new URLSearchParams({ userId, type: "games", page: 1, limit: 1 })
    const reviewsParams = new URLSearchParams({ userId, type: "reviews", page: 1, limit: 1 })

    Promise.all([
      fetch(`/api/likes/byUser?${gamesParams}`).then((r) => r.json()),
      fetch(`/api/likes/byUser?${reviewsParams}`).then((r) => r.json()),
    ])
      .then(([gamesRes, reviewsRes]) => {
        setCounts({
          games: gamesRes.total || 0,
          reviews: reviewsRes.total || 0,
        })
      })
      .finally(() => setInitialLoading(false))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    const limit = activeTab === "games" ? GAMES_PER_PAGE : REVIEWS_PER_PAGE
    const params = new URLSearchParams({ userId, type: activeTab, page, limit })

    fetch(`/api/likes/byUser?${params}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((res) => {
        if (activeTab === "games") {
          setData({
            items: res.games || [],
            total: res.total || 0,
            totalPages: res.totalPages || 1,
          })
        } else {
          setData({
            items: res.reviews || [],
            total: res.total || 0,
            totalPages: res.totalPages || 1,
          })
          setGames(res.games || {})
          setUsers(res.users || {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, activeTab, page])

  function handleTabChange(tab) {
    if (tab === activeTab) return
    setActiveTab(tab)
    setPage(1)
  }

  function handlePageChange(newPage) {
    setPage(newPage)
    const el = containerRef.current
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-zinc-800/50 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-zinc-800/50 rounded-xl animate-pulse" />
        </div>
        <GamesSkeleton />
      </div>
    )
  }

  if (!counts.games && !counts.reviews) {
    return (
      <EmptyState
        icon={Heart}
        title={t("likes.empty.title")}
        description={isOwnProfile ? t("likes.empty.own") : t("likes.empty.other", { username })}
      />
    )
  }

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={activeTab === "games"}
          onClick={() => handleTabChange("games")}
          icon={Gamepad2}
          label={t("likes.tabs.games")}
          count={counts.games}
        />
        <TabButton
          active={activeTab === "reviews"}
          onClick={() => handleTabChange("reviews")}
          icon={MessageSquare}
          label={t("likes.tabs.reviews")}
          count={counts.reviews}
        />
      </div>

      {loading ? (
        activeTab === "games" ? (
          <GamesSkeleton />
        ) : (
          <ReviewsSkeleton />
        )
      ) : data.items.length > 0 ? (
        <div className="space-y-6">
          {activeTab === "games" ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {data.items.map((game) => (
                <GameCard key={game.slug} game={game} userRating={game.avgRating} responsive />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data.items.map((review) => (
                <ProfileReviewCard
                  key={review.id}
                  review={review}
                  game={games[review.game_id]}
                  user={users[review.user_id]}
                />
              ))}
            </div>
          )}

          {data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : (
        <EmptyState
          icon={activeTab === "games" ? Gamepad2 : MessageSquare}
          title={
            activeTab === "games"
              ? isOwnProfile
                ? t("likes.emptyGames.own")
                : t("likes.emptyGames.other", { username })
              : isOwnProfile
                ? t("likes.emptyReviews.own")
                : t("likes.emptyReviews.other", { username })
          }
          description=""
        />
      )}
    </div>
  )
}
