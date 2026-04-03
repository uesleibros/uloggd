import { useState, useEffect, useRef, useMemo } from "react"
import { Heart, Gamepad2, MessageSquare, List, LayoutGrid, Camera } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useCustomCovers } from "#hooks/useCustomCovers"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import { ListCard } from "@components/Lists/ListCard"
import { TierlistCard } from "@components/Tierlist/TierlistCard"
import Pagination from "@components/UI/Pagination"
import DragScrollRow from "@components/UI/DragScrollRow"
import ScreenshotCard, { ScreenshotCardSkeleton } from "@components/Screenshot/ScreenshotCard"
import { ProfileReviewCard } from "./ProfileReviews"

const LIMITS = {
  games: 24,
  reviews: 10,
  lists: 12,
  tierlists: 12,
  screenshots: 18,
}

const TAB_ICONS = {
  games: Gamepad2,
  reviews: MessageSquare,
  lists: List,
  tierlists: LayoutGrid,
  screenshots: Camera,
}

function Skeleton({ className }) {
  return <div className={`bg-zinc-800/50 rounded-xl animate-pulse ${className}`} />
}

function GamesSkeleton() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {Array.from({ length: 12 }, (_, i) => (
        <GameCardSkeleton key={i} responsive />
      ))}
    </div>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  )
}

function ListsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-[260px] rounded-2xl" />
      ))}
    </div>
  )
}

function TierlistsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  )
}

function ScreenshotsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
      {Array.from({ length: LIMITS.screenshots }, (_, i) => (
        <ScreenshotCardSkeleton key={i} />
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-zinc-500" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-zinc-400 font-medium">{title}</p>
        {description && <p className="text-xs text-zinc-500">{description}</p>}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border whitespace-nowrap flex-shrink-0 ${
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

export default function ProfileLikes({ userId, isOwnProfile, username, initialCounts }) {
  const { t } = useTranslation("profile")
  const [activeTab, setActiveTab] = useState("games")
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 })
  const [games, setGames] = useState({})
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState(initialCounts || { games: 0, reviews: 0, lists: 0, tierlists: 0, screenshots: 0 })
  const containerRef = useRef(null)

  useEffect(() => {
    if (initialCounts) setCounts(initialCounts)
  }, [initialCounts])

  const slugs = useMemo(() => {
    if (activeTab === "games") return data.items.map((g) => g.slug)
    return []
  }, [activeTab, data.items])

  const { getCustomCover, loading: coversLoading } = useCustomCovers(userId, slugs)

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    const params = new URLSearchParams({ userId, type: activeTab, page, limit: LIMITS[activeTab] })

    fetch(`/api/likes/byUser?${params}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((res) => {
        const key = activeTab === "games" ? "games" : activeTab
        setData({
          items: res[key] || res.reviews || res.lists || res.tierlists || res.screenshots || [],
          total: res.total || 0,
          totalPages: res.totalPages || 1,
        })
        if (activeTab === "reviews") {
          setGames(res.games || {})
          setUsers(res.users || {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, activeTab, page])

  function handleTab(tab) {
    if (tab === activeTab) return
    setActiveTab(tab)
    setPage(1)
  }

  function handlePage(p) {
    setPage(p)
    if (containerRef.current) {
      const y = containerRef.current.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  const totalLikes = Object.values(counts).reduce((a, b) => a + b, 0)

  if (totalLikes === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t("likes.empty.title")}
        description={isOwnProfile ? t("likes.empty.own") : t("likes.empty.other", { username })}
      />
    )
  }

  const isLoading = loading || (activeTab === "games" && coversLoading)

  const skeletons = {
    games: <GamesSkeleton />,
    reviews: <ReviewsSkeleton />,
    lists: <ListsSkeleton />,
    tierlists: <TierlistsSkeleton />,
    screenshots: <ScreenshotsSkeleton />,
  }

  const emptyMessages = {
    games: isOwnProfile ? t("likes.emptyGames.own") : t("likes.emptyGames.other", { username }),
    reviews: isOwnProfile ? t("likes.emptyReviews.own") : t("likes.emptyReviews.other", { username }),
    lists: isOwnProfile ? t("likes.emptyLists.own") : t("likes.emptyLists.other", { username }),
    tierlists: isOwnProfile ? t("likes.emptyTierlists.own") : t("likes.emptyTierlists.other", { username }),
    screenshots: isOwnProfile ? t("likes.emptyScreenshots.own") : t("likes.emptyScreenshots.other", { username }),
  }

  return (
    <div ref={containerRef}>
      <DragScrollRow className="gap-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
        {Object.keys(LIMITS).map((tab) => (
          <TabButton
            key={tab}
            active={activeTab === tab}
            onClick={() => handleTab(tab)}
            icon={TAB_ICONS[tab]}
            label={t(`likes.tabs.${tab}`)}
            count={counts[tab]}
          />
        ))}
      </DragScrollRow>

      {isLoading ? (
        skeletons[activeTab]
      ) : data.items.length > 0 ? (
        <div className="space-y-6">
          {activeTab === "games" && (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {data.items.map((game) => (
                <GameCard
                  key={game.slug}
                  game={game}
                  userRating={game.avgRating}
                  customCoverUrl={getCustomCover(game.slug)}
                  responsive
                />
              ))}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="divide-y divide-zinc-800/60">
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

          {activeTab === "lists" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((list) => (
                <ListCard key={list.id} list={list} showOwner />
              ))}
            </div>
          )}

          {activeTab === "tierlists" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.items.map((tierlist) => (
                <TierlistCard key={tierlist.id} tierlist={tierlist} showOwner />
              ))}
            </div>
          )}

          {activeTab === "screenshots" && (
            <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
              {data.items.map((screenshot) => (
                <ScreenshotCard key={screenshot.id} screenshot={screenshot} />
              ))}
            </div>
          )}

          {data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={handlePage}
            />
          )}
        </div>
      ) : (
        <EmptyState icon={TAB_ICONS[activeTab]} title={emptyMessages[activeTab]} />
      )}
    </div>
  )
}
