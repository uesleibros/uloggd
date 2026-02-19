import { Link } from "react-router-dom"
import { Star } from "lucide-react"
import { useUserGames } from "../../../hooks/useUserGames"

const COVER_FALLBACK = "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"

function MiniStars({ rating }) {
	const stars = Math.round((rating / 20) * 2) / 2
	const clamped = Math.min(Math.max(stars, 0), 5)
	const full = Math.floor(clamped)
	const half = clamped % 1 >= 0.5
	const empty = 5 - full - (half ? 1 : 0)

	return (
		<div className="flex items-center gap-px">
			{Array.from({ length: full }, (_, i) => (
				<Star key={`f${i}`} className="w-3 h-3 text-amber-400 fill-current" />
			))}
			{half && (
				<div className="relative w-3 h-3">
					<Star className="absolute inset-0 w-full h-full text-zinc-600 fill-current" />
					<div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
						<Star className="w-3 h-3 text-amber-400 fill-current" />
					</div>
				</div>
			)}
			{Array.from({ length: empty }, (_, i) => (
				<Star key={`e${i}`} className="w-3 h-3 text-zinc-600 fill-current" />
			))}
		</div>
	)
}

function FavoriteBadge() {
	return (
		<div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-amber-400 drop-shadow-md">
			<svg className="w-5 h-5 fill-current" viewBox="0 0 256 256">
				<path d="M239.2,97.29a16,16,0,0,0-13.81-9.43l-56.76-2.41L146.45,32.61a16,16,0,0,0-28.9,0L95.37,85.45,38.61,87.86a16,16,0,0,0-9.11,28.06l43.57,37.63L59.66,208.8a16,16,0,0,0,24.16,17.56L128,197.69l44.18,28.67a16,16,0,0,0,24.16-17.56l-13.41-55.25,43.57-37.63A16,16,0,0,0,239.2,97.29Zm-32.06,47.76,11.2,46.16L179.6,166.1a16,16,0,0,0-16.74-.49L128,187.37l-34.86-21.76a16,16,0,0,0-16.74.49l-38.74,25.11,11.2-46.16a16,16,0,0,0-5.08-15.63L47.36,97.77l47.42-2a16,16,0,0,0,13.26-9.64L128,41.22l19.95,44.91a16,16,0,0,0,13.26,9.64l47.42,2-36.42,31.65A16,16,0,0,0,207.14,145.05Z" opacity="0.2"/>
				<path d="M239.2,97.29a16,16,0,0,0-13.81-9.43l-56.76-2.41L146.45,32.61a16,16,0,0,0-28.9,0L95.37,85.45,38.61,87.86a16,16,0,0,0-9.11,28.06l43.57,37.63L59.66,208.8a16,16,0,0,0,24.16,17.56L128,197.69l44.18,28.67a16,16,0,0,0,24.16-17.56l-13.41-55.25,43.57-37.63A16,16,0,0,0,239.2,97.29Z"/>
			</svg>
		</div>
	)
}

function getCoverUrl(game) {
	if (!game?.cover?.url) return COVER_FALLBACK
	return game.cover.url.startsWith('http') ? game.cover.url : `https:${game.cover.url}`
}

export default function GameCard({ 
	game, 
	userRating: propRating,
	isFavorite = false,
	newTab = false,
	showRating = true,
}) {
	const { getRating } = useUserGames()
	
	const rating = propRating ?? getRating(game.slug)
	const hasRating = showRating && rating != null && rating > 0
	const coverUrl = getCoverUrl(game)

	const cardClasses = isFavorite
		? "ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/10"
		: ""

	const imageContent = (
		<>
			<img
				src={coverUrl}
				alt={game.name}
				draggable={false}
				className="w-32 h-44 object-cover select-none rounded-lg bg-zinc-800"
			/>
			<div className="absolute inset-0 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 gap-1.5 pointer-events-none">
				<span className="text-white select-none text-xs font-medium text-center leading-tight line-clamp-3">
					{game.name}
				</span>
				{hasRating && <MiniStars rating={rating} />}
			</div>
		</>
	)

	return (
		<div className="flex-shrink-0 group relative">
			{isFavorite && <FavoriteBadge />}
			
			{newTab ? (
				<a
					href={`/game/${game.slug}`}
					target="_blank"
					rel="noopener noreferrer"
					className={`block relative rounded-lg transition-all ${cardClasses}`}
					title={game.name}
				>
					{imageContent}
				</a>
			) : (
				<Link 
					to={`/game/${game.slug}`} 
					className={`block relative rounded-lg ${cardClasses}`}
				>
					{imageContent}
				</Link>
			)}
		</div>
	)
}

export function GameCardSkeleton() {
	return <div className="w-32 h-44 bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
}

export { MiniStars }