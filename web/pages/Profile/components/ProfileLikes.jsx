import { useState, useEffect } from "react"
import { Heart, Gamepad2, MessageSquare } from "lucide-react"
import GameCard from "@components/Game/GameCard"
import { ProfileReviewCard } from "./ProfileReviews"

function LikesSkeleton() {
	return (
		<div className="space-y-6">
			<div>
				<div className="h-5 w-32 bg-zinc-800 rounded mb-4" />
				<div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
					{[...Array(8)].map((_, i) => (
						<div key={i} className="aspect-[3/4] bg-zinc-800 rounded-lg animate-pulse" />
					))}
				</div>
			</div>
			<div>
				<div className="h-5 w-40 bg-zinc-800 rounded mb-4" />
				<div className="space-y-3">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="bg-zinc-800/50 rounded-xl p-5 animate-pulse">
							<div className="flex gap-3">
								<div className="w-16 h-20 rounded-lg bg-zinc-700" />
								<div className="flex-1 space-y-2">
									<div className="h-4 w-32 bg-zinc-700 rounded" />
									<div className="h-3 w-full bg-zinc-700 rounded" />
								</div>
							</div>
						</div>
					))}
				</div>
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
	const [likedGames, setLikedGames] = useState([])
	const [likedReviews, setLikedReviews] = useState([])
	const [users, setUsers] = useState({})
	const [games, setGames] = useState({})
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState("games")

	useEffect(() => {
		if (!userId) return
		setLoading(true)

		fetch("/api/likes/byUser", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId }),
		})
			.then((r) => r.ok ? r.json() : { likedGames: [], likedReviews: [], games: {} })
			.then((data) => {
				setLikedGames(data.likedGames || [])
				setLikedReviews(data.likedReviews || [])
				setGames(data.games || {})
				setUsers(data.users || {})
			})
			.catch(() => {})
			.finally(() => setLoading(false))
	}, [userId])

	if (loading) return <LikesSkeleton />

	const hasGames = likedGames.length > 0
	const hasReviews = likedReviews.length > 0

	if (!hasGames && !hasReviews) {
		return <EmptyState isOwnProfile={isOwnProfile} username={username} />
	}

	return (
		<div className="space-y-8">
			<div className="flex gap-2">
				<button
					onClick={() => setActiveTab("games")}
					className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
						activeTab === "games"
							? "bg-white text-black"
							: "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
					}`}
				>
					<Gamepad2 className="w-4 h-4" />
					Jogos
					<span className={`text-xs ${activeTab === "games" ? "text-zinc-600" : "text-zinc-500"}`}>
						{likedGames.length}
					</span>
				</button>
				<button
					onClick={() => setActiveTab("reviews")}
					className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
						activeTab === "reviews"
							? "bg-white text-black"
							: "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
					}`}
				>
					<MessageSquare className="w-4 h-4" />
					Reviews
					<span className={`text-xs ${activeTab === "reviews" ? "text-zinc-600" : "text-zinc-500"}`}>
						{likedReviews.length}
					</span>
				</button>
			</div>

			{activeTab === "games" && (
				hasGames ? (
					<div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
						{likedGames.map((game) => (
							<div key={game.slug} className="aspect-[3/4]">
								<GameCard
									game={game}
									initialState={game.userState}
									className="!w-full !h-full"
								/>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-16 gap-3">
						<Gamepad2 className="w-10 h-10 text-zinc-700" />
						<p className="text-sm text-zinc-600">
							{isOwnProfile ? "Você ainda não curtiu nenhum jogo" : `${username} ainda não curtiu nenhum jogo`}
						</p>
					</div>
				)
			)}

			{activeTab === "reviews" && (
				hasReviews ? (
					<div className="space-y-3">
						{likedReviews.map((review) => (
							<ProfileReviewCard
								key={review.id}
								review={review}
								game={games[review.game_id]}
								user={users[review.user_id]}
							/>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-16 gap-3">
						<MessageSquare className="w-10 h-10 text-zinc-700" />
						<p className="text-sm text-zinc-600">
							{isOwnProfile ? "Você ainda não curtiu nenhuma review" : `${username} ainda não curtiu nenhuma review`}
						</p>
					</div>
				)
			)}
		</div>
	)
}