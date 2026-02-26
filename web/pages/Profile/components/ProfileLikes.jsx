import { useState, useEffect, useRef } from "react"
import { Heart, Gamepad2, MessageSquare } from "lucide-react"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import Pagination from "@components/UI/Pagination"
import { ProfileReviewCard } from "./ProfileReviews"

const GAMES_PER_PAGE = 24
const REVIEWS_PER_PAGE = 10

function LikesSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
				{[...Array(8)].map((_, i) => (
					<GameCardSkeleton key={i} responsive />
				))}
			</div>
		</div>
	)
}

function EmptyState({ isOwnProfile, username }) {
	return (
		<div className="rounded-xl p-10 sm:p-14 bg-zinc-800/50 border border-zinc-700 flex flex-col items-center justify-center gap-4">
			<div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
				<Heart className="w-6 h-6 text-zinc-600" />
			</div>
			<div className="text-center">
				<p className="text-sm text-zinc-400 font-medium">Nenhuma curtida ainda</p>
				<p className="text-sm text-zinc-600 mt-1">
					{isOwnProfile
						? "Jogos e reviews que você curtir aparecerão aqui"
						: `${username} ainda não curtiu nada`}
				</p>
			</div>
		</div>
	)
}

export default function ProfileLikes({ userId, isOwnProfile, username }) {
	const [activeTab, setActiveTab] = useState("games")
	const [page, setPage] = useState(1)
	const [data, setData] = useState({ items: [], total: 0, totalPages: 1 })
	const [games, setGames] = useState({})
	const [users, setUsers] = useState({})
	const [loading, setLoading] = useState(true)
	const [counts, setCounts] = useState({ games: 0, reviews: 0 })
	const containerRef = useRef(null)

	useEffect(() => {
		if (!userId) return

		const gamesParams = new URLSearchParams({ userId, type: "games", page: 1, limit: 1 })
		const reviewsParams = new URLSearchParams({ userId, type: "reviews", page: 1, limit: 1 })

		Promise.all([
			fetch(`/api/likes/byUser?${gamesParams}`).then(r => r.json()),
			fetch(`/api/likes/byUser?${reviewsParams}`).then(r => r.json()),
		]).then(([gamesRes, reviewsRes]) => {
			setCounts({
				games: gamesRes.total || 0,
				reviews: reviewsRes.total || 0,
			})
		})
	}, [userId])

	useEffect(() => {
		if (!userId) return
		setLoading(true)

		const limit = activeTab === "games" ? GAMES_PER_PAGE : REVIEWS_PER_PAGE
		const params = new URLSearchParams({ userId, type: activeTab, page, limit })

		fetch(`/api/likes/byUser?${params}`)
			.then((r) => r.ok ? r.json() : {})
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

	if (loading && page === 1) return <LikesSkeleton />

	if (!counts.games && !counts.reviews && !loading) {
		return <EmptyState isOwnProfile={isOwnProfile} username={username} />
	}

	return (
		<div className="space-y-8" ref={containerRef}>
			<div className="flex gap-2">
				<button
					onClick={() => handleTabChange("games")}
					className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
						activeTab === "games"
							? "bg-white text-black"
							: "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
					}`}
				>
					<Gamepad2 className="w-4 h-4" />
					Jogos
					<span className={`text-xs ${activeTab === "games" ? "text-zinc-600" : "text-zinc-500"}`}>
						{counts.games}
					</span>
				</button>
				<button
					onClick={() => handleTabChange("reviews")}
					className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
						activeTab === "reviews"
							? "bg-white text-black"
							: "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
					}`}
				>
					<MessageSquare className="w-4 h-4" />
					Reviews
					<span className={`text-xs ${activeTab === "reviews" ? "text-zinc-600" : "text-zinc-500"}`}>
						{counts.reviews}
					</span>
				</button>
			</div>

			{loading ? (
				<LikesSkeleton />
			) : data.items.length > 0 ? (
				<>
					{activeTab === "games" ? (
						<div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
							{data.items.map((game) => (
								<div key={game.slug}>
									<GameCard
										game={game}
										userRating={game.avgRating}
										responsive
									/>
								</div>
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
					<Pagination
						currentPage={page}
						totalPages={data.totalPages}
						onPageChange={handlePageChange}
					/>
				</>
			) : (
				<div className="flex flex-col items-center justify-center py-16 gap-3">
					{activeTab === "games" ? <Gamepad2 className="w-10 h-10 text-zinc-700" /> : <MessageSquare className="w-10 h-10 text-zinc-700" />}
					<p className="text-sm text-zinc-600">
						{activeTab === "games"
							? (isOwnProfile ? "Você ainda não curtiu nenhum jogo" : `${username} ainda não curtiu nenhum jogo`)
							: (isOwnProfile ? "Você ainda não curtiu nenhuma review" : `${username} ainda não curtiu nenhuma review`)
						}
					</p>
				</div>
			)}
		</div>
	)
}