import { useState } from "react"
import { Link } from "react-router-dom"
import { Gamepad2, Lock } from "lucide-react"
import { motion } from "framer-motion"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { useCustomCovers } from "#hooks/useCustomCovers"
import { useDateTime } from "#hooks/useDateTime"
import { encode } from "#utils/shortId.js"

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1]
const TRANSITION_DURATION = 0.3

function getPositions(count) {
	if (count <= 1) return { base: [{ x: 0, rotate: 0 }], hover: [{ x: 0, rotate: 0 }] }
	const base = []
	const hover = []
	for (let i = 0; i < count; i++) {
		const t = (i / (count - 1)) * 2 - 1
		base.push({ x: t * 40, rotate: t * 6 })
		hover.push({ x: t * 120, rotate: t * 12 })
	}
	return { base, hover }
}

function reorderForCenter(items) {
	if (items.length <= 1) return items
	const left = []
	const right = []
	for (let i = 1; i < items.length; i++) {
		if ((i - 1) % 2 === 0) left.unshift(items[i])
		else right.push(items[i])
	}
	return [...left, items[0], ...right]
}

function FanImages({ slugs = [], isActive, ranked = false, ownerId = null }) {
	const orderedSlugs = ranked ? reorderForCenter(slugs) : slugs
	const { getGame, loading: gamesLoading } = useGamesBatch(slugs)
	const { getCustomCover, loading: coversLoading } = useCustomCovers(ownerId, slugs)

	const isLoading = gamesLoading || (ownerId && coversLoading)

	if (isLoading) {
		return (
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="h-[200px] w-[134px] rounded-xl bg-zinc-800 animate-pulse" />
			</div>
		)
	}

	const covers = orderedSlugs
		.map((s) => {
			const custom = getCustomCover(s)
			if (custom) return custom

			const g = getGame(s)
			if (!g?.cover?.url || typeof g.cover.url !== "string") return null
			return `https:${g.cover.url.replace("t_thumb", "t_cover_big")}`
		})
		.filter(Boolean)

	if (covers.length === 0) {
		return (
			<div className="absolute inset-0 flex items-center justify-center">
				<Gamepad2 className="w-12 h-12 text-white/10" />
			</div>
		)
	}

	const count = covers.length
	const positions = getPositions(count)
	const centerOffset = (count - 1) / 2

	return (
		<div
			className="absolute inset-0 flex items-center justify-center"
			style={{ top: "-25px", overflow: "visible" }}
		>
			{covers.map((imageUrl, imgIndex) => {
				const basePos = positions.base[imgIndex]
				const hoverPos = positions.hover[imgIndex]
				const dist = Math.abs(imgIndex - centerOffset)
				const zIndex = 10 - Math.round(dist)

				const idleBrightness = dist < 0.01 ? 1 : dist < 1.5 ? 0.6 : 0.4
				const hoverBrightness = dist < 0.01 ? 1 : dist < 1.5 ? 0.8 : 0.65
				const baseScale = dist < 0.01 ? 1 : dist < 1.5 ? 0.95 : 0.9
				const hoverScale = dist < 0.01 ? 1.02 : dist < 1.5 ? 0.97 : 0.92
				const yOffset = dist < 0.01 ? 0 : dist < 1.5 ? 6 : 12

				const xPos = isActive ? hoverPos.x : basePos.x
				const yPos = isActive ? yOffset - 4 : yOffset
				const rotation = isActive ? hoverPos.rotate : basePos.rotate
				const finalScale = isActive ? hoverScale : baseScale
				const staggerDelay = dist * 0.02

				return (
					<motion.div
						key={imgIndex}
						className="absolute"
						initial={false}
						animate={{ x: xPos, y: yPos, rotate: rotation, scale: finalScale }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 22,
							mass: 0.7,
							delay: staggerDelay,
						}}
						style={{ zIndex }}
					>
						<div className="h-[200px] w-[134px] overflow-hidden rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] bg-zinc-900 border border-white/10">
							<motion.img
								src={imageUrl}
								alt=""
								className="h-full w-full object-cover"
								animate={{
									filter: `brightness(${isActive ? hoverBrightness : idleBrightness}) contrast(1.05) saturate(0.95)`,
								}}
								transition={{ duration: TRANSITION_DURATION, ease: EASE_OUT_EXPO }}
							/>
						</div>
					</motion.div>
				)
			})}
		</div>
	)
}

export function ListCard({ list, showOwner = false, actions = null }) {
	const { t } = useTranslation("common")
	const { formatDateShort } = useDateTime()
	const [isHovered, setIsHovered] = useState(false)

	const gamesCount = list.games_count || 0
	const shortId = encode(list.id)
	const ownerId = list.user_id

	return (
		<motion.div
			className="group relative w-full cursor-pointer h-[280px]"
			style={{ perspective: "1200px", zIndex: isHovered ? 50 : 1 }}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Link to={`/list/${shortId}`} className="absolute inset-0 z-40 rounded-2xl" />

			<div className="relative w-full h-full" style={{ perspective: "1200px" }}>
				<motion.div
					className="relative z-0"
					animate={{ rotateX: isHovered ? 12 : 0 }}
					transition={{ type: "spring", stiffness: 200, damping: 25 }}
					style={{ height: "280px", transformOrigin: "center bottom" }}
				>
					<div className="absolute inset-0 rounded-2xl pointer-events-none bg-[#1e1e1e] border border-white/6" />

					<motion.div
						className="absolute inset-0"
						animate={{ rotateX: isHovered ? -12 : 0 }}
						transition={{ type: "spring", stiffness: 200, damping: 25 }}
					>
						<FanImages
							slugs={list.game_slugs || []}
							isActive={isHovered}
							ranked={!!list.ranked}
							ownerId={ownerId}
						/>
					</motion.div>
				</motion.div>

				<div className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl bg-zinc-900/90 border border-white/6">
					<div className="px-4 py-4">
						<h3 className="font-semibold text-white/70 text-base line-clamp-1 group-hover:text-white">
							{list.title}
						</h3>
						{list.description && (
							<p className="text-xs text-white/40 mt-1 line-clamp-1 group-hover:text-white/60">
								{list.description}
							</p>
						)}
					</div>

					<div className="h-[48px] flex items-center justify-between px-4 border-t border-white/4">
						<div className="flex items-center gap-1.5">
							<span className="text-[13px] text-white/60">
								{gamesCount === 1
									? t("games", { count: gamesCount })
									: t("games_plural", { count: gamesCount })}
							</span>
							{list.is_public === false && (
								<Lock className="w-3 h-3 text-white/30 ml-1" />
							)}
						</div>
						<div className="text-xs text-white/50">
							{showOwner && list.owner
								? list.owner.username
								: list.updated_at
								? formatDateShort(list.updated_at)
								: ""}
						</div>
					</div>
				</div>
			</div>

			{actions && (
				<div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
					{actions}
				</div>
			)}
		</motion.div>
	)
}

mesmo erro namoral, vou te mandar aqui:

import { useState, useEffect, useRef, useMemo } from "react"
import { Heart, Gamepad2, MessageSquare, List, LayoutGrid } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useCustomCovers } from "#hooks/useCustomCovers"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import { ListCard } from "@components/Lists/ListCard"
import { TierlistCard } from "@components/Tierlist/TierlistCard"
import Pagination from "@components/UI/Pagination"
import { ProfileReviewCard } from "./ProfileReviews"

const GAMES_PER_PAGE = 24
const REVIEWS_PER_PAGE = 10
const LISTS_PER_PAGE = 12
const TIERLISTS_PER_PAGE = 12

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
  const [counts, setCounts] = useState({ games: 0, reviews: 0, lists: 0, tierlists: 0 })
  const containerRef = useRef(null)

  const slugs = useMemo(() => {
    if (activeTab === "games") {
      return data.items.map((g) => g.slug)
    }
    return []
  }, [activeTab, data.items])

  const { getCustomCover, loading: coversLoading } = useCustomCovers(userId, slugs)

  useEffect(() => {
    if (!userId) return

    const gamesParams = new URLSearchParams({ userId, type: "games", page: 1, limit: 1 })
    const reviewsParams = new URLSearchParams({ userId, type: "reviews", page: 1, limit: 1 })
    const listsParams = new URLSearchParams({ userId, type: "lists", page: 1, limit: 1 })
    const tierlistsParams = new URLSearchParams({ userId, type: "tierlists", page: 1, limit: 1 })

    Promise.all([
      fetch(`/api/likes/byUser?${gamesParams}`).then((r) => r.json()),
      fetch(`/api/likes/byUser?${reviewsParams}`).then((r) => r.json()),
      fetch(`/api/likes/byUser?${listsParams}`).then((r) => r.json()),
      fetch(`/api/likes/byUser?${tierlistsParams}`).then((r) => r.json()),
    ])
      .then(([gamesRes, reviewsRes, listsRes, tierlistsRes]) => {
        setCounts({
          games: gamesRes.total || 0,
          reviews: reviewsRes.total || 0,
          lists: listsRes.total || 0,
          tierlists: tierlistsRes.total || 0,
        })
      })
      .finally(() => setInitialLoading(false))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    const limitMap = {
      games: GAMES_PER_PAGE,
      reviews: REVIEWS_PER_PAGE,
      lists: LISTS_PER_PAGE,
      tierlists: TIERLISTS_PER_PAGE,
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
    }
    return messages[activeTab]
  }

  function getEmptyIcon() {
    const icons = {
      games: Gamepad2,
      reviews: MessageSquare,
      lists: List,
      tierlists: LayoutGrid,
    }
    return icons[activeTab]
  }

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <GamesSkeleton />
      </div>
    )
  }

  if (!counts.games && !counts.reviews && !counts.lists && !counts.tierlists) {
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
      </div>

      {isLoadingGames && activeTab === "games" ? (
        <GamesSkeleton />
      ) : loading && activeTab === "reviews" ? (
        <ReviewsSkeleton />
      ) : loading && activeTab === "lists" ? (
        <ListsSkeleton />
      ) : loading && activeTab === "tierlists" ? (
        <TierlistsSkeleton />
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

export function CoverStrip({ slugs = [], ownerId = null }) {
	const { getGame, loading: gamesLoading } = useGamesBatch(slugs)
	const { getCustomCover, loading: coversLoading } = useCustomCovers(ownerId, slugs)

	const isLoading = gamesLoading || (ownerId && coversLoading)

	if (slugs.length === 0) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
				<Gamepad2 className="w-6 h-6 text-zinc-700" />
			</div>
		)
	}

	if (isLoading) {
		return <div className="w-full h-full bg-zinc-800 animate-pulse" />
	}

	const covers = slugs
		.map((s) => {
			const custom = getCustomCover(s)
			if (custom) return custom

			const g = getGame(s)
			if (!g?.cover?.url) return null
			return `https:${g.cover.url.replace("t_thumb", "t_cover_big")}`
		})
		.filter(Boolean)

	if (covers.length === 0) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
				<Gamepad2 className="w-6 h-6 text-zinc-700" />
			</div>
		)
	}

	const emptySlots = 4 - covers.length

	return (
		<div className="flex h-full">
			{covers.map((url, i) => (
				<div key={i} className="h-full flex-1 min-w-0 overflow-hidden">
					<img
						src={url}
						alt=""
						className="w-full h-full object-cover"
						loading="lazy"
					/>
				</div>
			))}
			{emptySlots > 0 &&
				Array.from({ length: emptySlots }).map((_, i) => (
					<div
						key={`empty-${i}`}
						className="h-full flex-1 min-w-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border-l border-zinc-700/30"
					>
						<Gamepad2 className="w-4 h-4 text-zinc-700/50" />
					</div>
				))}
		</div>
	)
}