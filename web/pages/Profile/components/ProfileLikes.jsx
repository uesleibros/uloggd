import { useState, useEffect, useRef, useMemo } from "react"
import { Heart, Gamepad2, MessageSquare, List, LayoutGrid, Camera } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import { useCustomCovers } from "#hooks/useCustomCovers"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import { ListCard } from "@components/Lists/ListCard"
import { TierlistCard } from "@components/Tierlist/TierlistCard"
import Pagination from "@components/UI/Pagination"
import DragScrollRow from "@components/UI/DragScrollRow"
import { ProfileReviewCard } from "./ProfileReviews"

const GAMES_PER_PAGE = 24
const REVIEWS_PER_PAGE = 10
const LISTS_PER_PAGE = 12
const TIERLISTS_PER_PAGE = 12
const SCREENSHOTS_PER_PAGE = 18

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

function ListsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-[280px] bg-zinc-800/50 rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}

function TierlistsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse border border-zinc-800">
          <div className="h-24 sm:h-28 bg-zinc-800" />
          <div className="p-3 sm:p-3.5 space-y-2 bg-zinc-800/30">
            <div className="h-4 w-2/3 bg-zinc-700/50 rounded" />
            <div className="h-3 w-full bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ScreenshotsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
      {[...Array(SCREENSHOTS_PER_PAGE)].map((_, i) => (
        <div key={i} className="aspect-square bg-zinc-800/50 animate-pulse" />
      ))}
    </div>
  )
}

function ScreenshotGridItem({ screenshot }) {
  return (
    <Link
      to={`/screenshot/${screenshot.id}`}
      className="group relative aspect-square overflow-hidden bg-zinc-800 cursor-pointer block"
    >
      <img
        src={screenshot.image_url}
        alt={screenshot.caption || ""}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
    </Link>
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
        {description && <p className="text-sm text-zinc-500">{description}</p>}
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
    if (activeTab === "games") {
      return data.items.map((g) => g.slug)
    }
    return []
  }, [activeTab, data.items])

  const { getCustomCover, loading: coversLoading } = useCustomCovers(userId, slugs)

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    const limitMap = {
      games: GAMES_PER_PAGE,
      reviews: REVIEWS_PER_PAGE,
      lists: LISTS_PER_PAGE,
      tierlists: TIERLISTS_PER_PAGE,
      screenshots: SCREENSHOTS_PER_PAGE,
    }
    const limit = limitMap[activeTab]
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
        } else if (activeTab === "reviews") {
          setData({
            items: res.reviews || [],
            total: res.total || 0,
            totalPages: res.totalPages || 1,
          })
          setGames(res.games || {})
          setUsers(res.users || {})
        } else if (activeTab === "lists") {
          setData({
            items: res.lists || [],
            total: res.total || 0,
            totalPages: res.totalPages || 1,
          })
        } else if (activeTab === "tierlists") {
          setData({
            items: res.tierlists || [],
            total: res.total || 0,
            totalPages: res.totalPages || 1,
          })
        } else if (activeTab === "screenshots") {
          setData({
            items: res.screenshots || [],
            total: res.total || 0,
            totalPages: res.totalPages || 1,
          })
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

  function getEmptyMessage() {
    const messages = {
      games: isOwnProfile ? t("likes.emptyGames.own") : t("likes.emptyGames.other", { username }),
      reviews: isOwnProfile ? t("likes.emptyReviews.own") : t("likes.emptyReviews.other", { username }),
      lists: isOwnProfile ? t("likes.emptyLists.own") : t("likes.emptyLists.other", { username }),
      tierlists: isOwnProfile ? t("likes.emptyTierlists.own") : t("likes.emptyTierlists.other", { username }),
      screenshots: isOwnProfile ? t("likes.emptyScreenshots.own") : t("likes.emptyScreenshots.other", { username }),
    }
    return messages[activeTab]
  }

  function getEmptyIcon() {
    const icons = {
      games: Gamepad2,
      reviews: MessageSquare,
      lists: List,
      tierlists: LayoutGrid,
      screenshots: Camera,
    }
    return icons[activeTab]
  }

  const totalLikes = counts.games + counts.reviews + counts.lists + counts.tierlists + counts.screenshots

  if (totalLikes === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t("likes.empty.title")}
        description={isOwnProfile ? t("likes.empty.own") : t("likes.empty.other", { username })}
      />
    )
  }

  const isLoadingGames = loading || (activeTab === "games" && coversLoading)

  return (
    <div className="space-y-6" ref={containerRef}>
      <DragScrollRow className="gap-2 -mx-4 px-4 sm:mx-0 sm:px-0">
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
        <TabButton
          active={activeTab === "lists"}
          onClick={() => handleTabChange("lists")}
          icon={List}
          label={t("likes.tabs.lists")}
          count={counts.lists}
        />
        <TabButton
          active={activeTab === "tierlists"}
          onClick={() => handleTabChange("tierlists")}
          icon={LayoutGrid}
          label={t("likes.tabs.tierlists")}
          count={counts.tierlists}
        />
        <TabButton
          active={activeTab === "screenshots"}
          onClick={() => handleTabChange("screenshots")}
          icon={Camera}
          label={t("likes.tabs.screenshots")}
          count={counts.screenshots}
        />
      </DragScrollRow>

      {isLoadingGames && activeTab === "games" ? (
        <GamesSkeleton />
      ) : loading && activeTab === "reviews" ? (
        <ReviewsSkeleton />
      ) : loading && activeTab === "lists" ? (
        <ListsSkeleton />
      ) : loading && activeTab === "tierlists" ? (
        <TierlistsSkeleton />
      ) : loading && activeTab === "screenshots" ? (
        <ScreenshotsSkeleton />
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
                <ScreenshotGridItem key={screenshot.id} screenshot={screenshot} />
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
        <EmptyState icon={getEmptyIcon()} title={getEmptyMessage()} description="" />
      )}
    </div>
  )
}