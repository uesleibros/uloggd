import { useState, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import { Star, Play, Clock, Gift, Heart, List, ChevronRight, Check, MoreHorizontal } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { useMyLibrary } from "#hooks/useMyLibrary"
import AddToListModal from "@components/Lists/AddToListModal"
import { STATUS_OPTIONS, GAME_STATUS } from "#constants/game"

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
	return game.cover.url.startsWith("http") ? game.cover.url : `https:${game.cover.url}`
}

function useCardActions(game, enabled) {
	const { user } = useAuth()
	const { refresh } = useMyLibrary()
	const [state, setState] = useState(null)
	const fetchedRef = useRef(false)
	const [updating, setUpdating] = useState(null)

	const prefetch = useCallback(async () => {
		if (!enabled || !user || fetchedRef.current || !game?.id) return
		fetchedRef.current = true
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return
			const res = await fetch("/api/userGames/@me/get", {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({ gameId: game.id }),
			})
			if (res.ok) {
				const d = await res.json()
				setState({
					status: d.status || null,
					playing: d.playing || false,
					backlog: d.backlog || false,
					wishlist: d.wishlist || false,
					liked: d.liked || false,
				})
			} else {
				setState({ status: null, playing: false, backlog: false, wishlist: false, liked: false })
			}
		} catch {
			setState({ status: null, playing: false, backlog: false, wishlist: false, liked: false })
		}
	}, [enabled, user, game?.id])

	const toggle = useCallback(async (field, value) => {
		if (!user || !state || updating) return
		const newValue = value !== undefined ? value : !state[field]
		const prev = { ...state }
		setState((s) => ({ ...s, [field]: newValue }))
		setUpdating(field)
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) { setState(prev); return }
			const res = await fetch("/api/userGames/@me/update", {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({ gameId: game.id, gameSlug: game.slug, field, value: newValue }),
			})
			if (res.ok) refresh()
			else setState(prev)
		} catch {
			setState(prev)
		} finally {
			setUpdating(null)
		}
	}, [user, state, updating, game?.id, game?.slug, refresh])

	return { user, state, prefetch, toggle, updating }
}

function StatusSubmenu({ status, onSelect, onBack }) {
	return (
		<div className="absolute inset-0 bg-black/95 rounded-lg flex flex-col">
			<button
				type="button"
				onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBack() }}
				className="flex items-center gap-1 px-2 py-1.5 text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer border-b border-zinc-700/50"
			>
				<ChevronRight className="w-3 h-3 rotate-180" />
				Voltar
			</button>
			<div className="flex-1 overflow-y-auto py-1">
				{STATUS_OPTIONS.map((s) => (
					<button
						key={s.id}
						type="button"
						onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(s.id) }}
						className={`w-full flex items-center gap-2 px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${
							status === s.id ? "text-white bg-zinc-700/50" : "text-zinc-300 hover:text-white hover:bg-zinc-700/30"
						}`}
					>
						<div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`} />
						<span className="truncate">{s.label}</span>
						{status === s.id && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
					</button>
				))}
				{status && (
					<button
						type="button"
						onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(null) }}
						className="w-full px-2 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors text-left"
					>
						Remover
					</button>
				)}
			</div>
		</div>
	)
}

function MoreSubmenu({ state, onToggle, onAddToList, updating, onBack }) {
	return (
		<div className="absolute inset-0 bg-black/95 rounded-lg flex flex-col">
			<button
				type="button"
				onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBack() }}
				className="flex items-center gap-1 px-2 py-1.5 text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer border-b border-zinc-700/50"
			>
				<ChevronRight className="w-3 h-3 rotate-180" />
				Voltar
			</button>
			<div className="flex-1 overflow-y-auto py-1">
				<button
					type="button"
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle("playing") }}
					disabled={!!updating}
					className={`w-full flex items-center gap-2 px-2 py-1.5 text-[10px] cursor-pointer transition-colors disabled:opacity-50 ${
						state?.playing ? "text-white bg-zinc-700/50" : "text-zinc-300 hover:text-white hover:bg-zinc-700/30"
					}`}
				>
					<Play className="w-3 h-3 flex-shrink-0 fill-current" />
					<span>Jogando</span>
					{state?.playing && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
				</button>

				<button
					type="button"
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle("liked") }}
					disabled={!!updating}
					className={`w-full flex items-center gap-2 px-2 py-1.5 text-[10px] cursor-pointer transition-colors disabled:opacity-50 ${
						state?.liked ? "text-red-400 bg-red-500/10" : "text-zinc-300 hover:text-white hover:bg-zinc-700/30"
					}`}
				>
					<Heart className={`w-3 h-3 flex-shrink-0 ${state?.liked ? "fill-current" : ""}`} />
					<span>Curtir</span>
					{state?.liked && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
				</button>

				<button
					type="button"
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToList() }}
					disabled={!!updating}
					className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-zinc-300 hover:text-white hover:bg-zinc-700/30 cursor-pointer transition-colors disabled:opacity-50"
				>
					<List className="w-3 h-3 flex-shrink-0" />
					<span>Adicionar à lista</span>
				</button>
			</div>
		</div>
	)
}

function QuickActionButton({ active, onClick, icon, disabled, activeClass = "bg-white/20 text-white" }) {
	return (
		<button
			type="button"
			onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
			disabled={disabled}
			className={`p-2 rounded-md cursor-pointer transition-all disabled:opacity-50 ${
				active ? activeClass : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white"
			}`}
		>
			{icon}
		</button>
	)
}

function CardActionsOverlay({ state, onToggle, onStatusSelect, onAddToList, updating }) {
	const [submenu, setSubmenu] = useState(null)
	const statusConfig = state?.status ? GAME_STATUS[state.status] : null

	if (submenu === "status") {
		return (
			<StatusSubmenu
				status={state?.status}
				onSelect={(val) => { onStatusSelect(val); setSubmenu(null) }}
				onBack={() => setSubmenu(null)}
			/>
		)
	}

	if (submenu === "more") {
		return (
			<MoreSubmenu
				state={state}
				onToggle={onToggle}
				onAddToList={onAddToList}
				updating={updating}
				onBack={() => setSubmenu(null)}
			/>
		)
	}

	const hasMoreActive = state?.playing || state?.liked

	return (
		<div className="absolute inset-0 bg-black/90 rounded-lg flex flex-col items-center justify-center gap-2 p-2">
			<button
				type="button"
				onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSubmenu("status") }}
				disabled={!!updating}
				className={`w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-[11px] font-medium cursor-pointer transition-all disabled:opacity-50 ${
					state?.status
						? `${statusConfig?.color || "bg-zinc-600"} text-white`
						: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
				}`}
			>
				<Check className={`w-3.5 h-3.5 ${state?.status ? "" : "opacity-50"}`} />
				{statusConfig?.label || "Jogado"}
				<ChevronRight className="w-3 h-3 opacity-50 ml-auto" />
			</button>

			<div className="flex items-center gap-1.5 w-full">
				<QuickActionButton
					active={state?.backlog}
					onClick={() => onToggle("backlog")}
					disabled={!!updating}
					icon={<Clock className="w-4 h-4" />}
				/>
				<QuickActionButton
					active={state?.wishlist}
					onClick={() => onToggle("wishlist")}
					disabled={!!updating}
					icon={<Gift className="w-4 h-4" />}
				/>
				<button
					type="button"
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSubmenu("more") }}
					disabled={!!updating}
					className={`flex-1 p-2 rounded-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center ${
						hasMoreActive
							? "bg-zinc-700 text-white"
							: "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white"
					}`}
				>
					<MoreHorizontal className="w-4 h-4" />
				</button>
			</div>
		</div>
	)
}

export default function GameCard({
	game,
	userRating: propRating,
	isFavorite = false,
	newTab = false,
	showRating = true,
	showQuickActions = true,
	responsive = false,
	className = "",
}) {
	const { getRating } = useMyLibrary()
	const { user, state: actions, prefetch, toggle, updating } = useCardActions(game, showQuickActions)
	const [showMenu, setShowMenu] = useState(false)
	const [showListModal, setShowListModal] = useState(false)

	const rating = propRating ?? getRating(game.slug)
	const hasRating = showRating && rating != null && rating > 0
	const coverUrl = getCoverUrl(game)
	const canShowActions = showQuickActions && user

	const cardClasses = isFavorite
		? "ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/10"
		: ""

	const sizeClasses = responsive
		? "w-full aspect-[3/4]"
		: "w-34 h-44 flex-shrink-0"

	const handleMenuToggle = (e) => {
		e.preventDefault()
		e.stopPropagation()
		setShowMenu(!showMenu)
	}

	const imageContent = (
		<>
			<img
				src={coverUrl}
				alt={game.name}
				draggable={false}
				className="w-full h-full object-cover select-none rounded-lg bg-zinc-800"
			/>
			
			{showMenu && canShowActions ? (
				<CardActionsOverlay
					state={actions}
					onToggle={toggle}
					onStatusSelect={(val) => toggle("status", val)}
					onAddToList={() => { setShowMenu(false); setShowListModal(true) }}
					updating={updating}
				/>
			) : (
				<div className="absolute inset-0 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 gap-1.5 pointer-events-none">
					<span className="text-white select-none text-xs font-medium text-center leading-tight line-clamp-3">
						{game.name}
					</span>
					{hasRating && <MiniStars rating={rating} />}
				</div>
			)}

			{canShowActions && (
				<button
					type="button"
					onClick={handleMenuToggle}
					className={`absolute top-1 right-1 p-1 rounded-md cursor-pointer transition-all duration-150 pointer-events-auto ${
						showMenu
							? "bg-white/20 text-white opacity-100"
							: "bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70"
					}`}
				>
					<MoreHorizontal className="w-4 h-4" />
				</button>
			)}

			{actions?.liked && !showMenu && (
				<div className="absolute bottom-1 right-1 p-1 pointer-events-none">
					<Heart className="w-3.5 h-3.5 text-red-500 fill-current drop-shadow-md" />
				</div>
			)}

			{actions?.status && !showMenu && (
				<div className="absolute bottom-1 left-1 pointer-events-none">
					<div className={`w-2.5 h-2.5 rounded-full ${GAME_STATUS[actions.status]?.color || "bg-zinc-500"} ring-1 ring-black/30`} />
				</div>
			)}
		</>
	)

	return (
		<>
			<div
				className={`group relative ${sizeClasses} ${className}`}
				onMouseEnter={canShowActions ? prefetch : undefined}
				onMouseLeave={() => setShowMenu(false)}
			>
				{isFavorite && <FavoriteBadge />}
				{newTab ? (
					<a
						href={`/game/${game.slug}`}
						target="_blank"
						rel="noopener noreferrer"
						className={`block relative w-full h-full rounded-lg transition-all ${cardClasses}`}
						title={game.name}
					>
						{imageContent}
					</a>
				) : (
					<Link
						to={`/game/${game.slug}`}
						className={`block relative w-full h-full rounded-lg ${cardClasses}`}
					>
						{imageContent}
					</Link>
				)}
			</div>

			<AddToListModal
				isOpen={showListModal}
				onClose={() => setShowListModal(false)}
				game={game}
			/>
		</>
	)
}

export function GameCardSkeleton({ responsive = false, className = "" }) {
	const sizeClasses = responsive
		? "w-full aspect-[3/4]"
		: "w-34 h-44 flex-shrink-0"

	return <div className={`${sizeClasses} bg-zinc-800 rounded-lg animate-pulse ${className}`} />
}

export { MiniStars }
