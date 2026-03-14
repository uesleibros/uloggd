import { useState, useCallback, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import { Star, Play, Clock, Gift, Heart, List, ChevronRight, Check, MoreHorizontal } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { useMyLibrary } from "#hooks/useMyLibrary"
import { useTranslation } from "#hooks/useTranslation"
import AddToListModal from "@components/Lists/AddToListModal"
import GameCover, { getCoverUrl } from "@components/Game/GameCover"
import { STATUS_OPTIONS, GAME_STATUS } from "#constants/game"

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

const DEFAULT_STATE = { status: null, playing: false, backlog: false, wishlist: false, liked: false }

function buildState(data) {
	if (!data) return DEFAULT_STATE
	return {
		status: data.status || null,
		playing: data.playing || false,
		backlog: data.backlog || false,
		wishlist: data.wishlist || false,
		liked: data.liked || false,
	}
}

function useCardActions(game, enabled, initialState = null) {
	const { user } = useAuth()
	const { refresh, getGameData } = useMyLibrary()
	const [updating, setUpdating] = useState(null)
	const [optimistic, setOptimistic] = useState(null)

	const cachedData = getGameData(game?.slug)
	const state = initialState || optimistic || buildState(cachedData)

	async function toggle(field, value) {
		if (!user || updating) return
		setUpdating(field)
		setOptimistic({ ...state, [field]: value })

		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) {
				setOptimistic(null)
				return
			}

			const res = await fetch("/api/userGames/@me/update", {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({ gameId: game.id, gameSlug: game.slug, field, value }),
			})

			if (res.ok) {
				refresh({ optimistic: { slug: game.slug, data: { [field]: value } } })
			}
		} catch {
		} finally {
			setOptimistic(null)
			setUpdating(null)
		}
	}

	return { user, state, toggle, updating }
}

function stopEvent(e) {
	e.preventDefault()
	e.stopPropagation()
}

function MoreMenu({ state, onToggle, onStatusSelect, onAddToList, updating, position, onMouseEnter, onMouseLeave, onClose }) {
	const { t } = useTranslation("gameCard")
	const { t: tQuickActions } = useTranslation("quickActions")
	const [showStatus, setShowStatus] = useState(false)
	const statusConfig = state?.status ? GAME_STATUS[state.status] : null
	const menuRef = useRef(null)

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				onClose()
			}
		}

		const handleScroll = () => {
			onClose()
		}

		const handleEscape = (e) => {
			if (e.key === "Escape") {
				onClose()
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		document.addEventListener("touchstart", handleClickOutside)
		window.addEventListener("scroll", handleScroll, true)
		document.addEventListener("keydown", handleEscape)

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
			document.removeEventListener("touchstart", handleClickOutside)
			window.removeEventListener("scroll", handleScroll, true)
			document.removeEventListener("keydown", handleEscape)
		}
	}, [onClose])

	const handleAction = useCallback((action) => {
		action()
		onClose()
	}, [onClose])

	const menuContent = showStatus ? (
		<div className="w-44 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden pointer-events-auto">
			<button
				type="button"
				onMouseDown={stopEvent}
				onClick={(e) => { stopEvent(e); setShowStatus(false) }}
				className="w-full flex items-center gap-1.5 px-2.5 py-2 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer border-b border-zinc-700/50"
			>
				<ChevronRight className="w-3 h-3 rotate-180" />
				{t("back")}
			</button>
			{STATUS_OPTIONS.map((s) => (
				<button
					key={s.id}
					type="button"
					onMouseDown={stopEvent}
					onClick={(e) => { stopEvent(e); handleAction(() => onStatusSelect(s.id)) }}
					className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] cursor-pointer transition-colors ${
						state?.status === s.id ? "text-white bg-zinc-800" : "text-zinc-300 hover:text-white hover:bg-zinc-800"
					}`}
				>
					<div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`} />
					<span className="truncate flex-1 text-left">{tQuickActions(`status.${s.id}.label`)}</span>
					{state?.status === s.id && <Check className="w-3 h-3 flex-shrink-0" />}
				</button>
			))}
			{state?.status && (
				<button
					type="button"
					onMouseDown={stopEvent}
					onClick={(e) => { stopEvent(e); handleAction(() => onStatusSelect(null)) }}
					className="w-full px-2.5 py-2 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 cursor-pointer text-left border-t border-zinc-700/50"
				>
					{t("removeStatus")}
				</button>
			)}
		</div>
	) : (
		<div className="w-44 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden pointer-events-auto">
			<button
				type="button"
				onMouseDown={stopEvent}
				onClick={(e) => { stopEvent(e); setShowStatus(true) }}
				disabled={!!updating}
				className="w-full flex items-center gap-2 px-2.5 py-2 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
			>
				<div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig?.color || "bg-zinc-600"}`} />
				<span className="flex-1 text-left truncate">{statusConfig ? t(`status.${state.status}`) : t("markAsPlayed")}</span>
				<ChevronRight className="w-3 h-3 opacity-50" />
			</button>

			<div className="border-t border-zinc-700/50" />

			<button
				type="button"
				onMouseDown={stopEvent}
				onClick={(e) => { stopEvent(e); handleAction(() => onToggle("playing", !state?.playing)) }}
				disabled={!!updating}
				className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] cursor-pointer disabled:opacity-50 ${
					state?.playing ? "text-white bg-zinc-800" : "text-zinc-300 hover:text-white hover:bg-zinc-800"
				}`}
			>
				<Play className="w-3 h-3 flex-shrink-0 fill-current" />
				<span className="flex-1 text-left">{t("playing")}</span>
				{state?.playing && <Check className="w-3 h-3 flex-shrink-0" />}
			</button>

			<button
				type="button"
				onMouseDown={stopEvent}
				onClick={(e) => { stopEvent(e); handleAction(() => onToggle("wishlist", !state?.wishlist)) }}
				disabled={!!updating}
				className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] cursor-pointer disabled:opacity-50 ${
					state?.wishlist ? "text-white bg-zinc-800" : "text-zinc-300 hover:text-white hover:bg-zinc-800"
				}`}
			>
				<Gift className="w-3 h-3 flex-shrink-0" />
				<span className="flex-1 text-left">{t("wishlist")}</span>
				{state?.wishlist && <Check className="w-3 h-3 flex-shrink-0" />}
			</button>

			<div className="border-t border-zinc-700/50" />

			<button
				type="button"
				onMouseDown={stopEvent}
				onClick={(e) => { stopEvent(e); handleAction(onAddToList) }}
				disabled={!!updating}
				className="w-full flex items-center gap-2 px-2.5 py-2 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
			>
				<List className="w-3 h-3 flex-shrink-0" />
				<span className="flex-1 text-left">{t("addToList")}</span>
			</button>

			<div className="border-t border-zinc-700/50" />

			<button
				type="button"
				onMouseDown={stopEvent}
				onClick={(e) => { stopEvent(e); handleAction(() => onToggle("liked", !state?.liked)) }}
				disabled={!!updating}
				className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] cursor-pointer disabled:opacity-50 ${
					state?.liked ? "text-red-400 bg-zinc-800" : "text-zinc-300 hover:text-white hover:bg-zinc-800"
				}`}
			>
				<Heart className={`w-3 h-3 flex-shrink-0 ${state?.liked ? "fill-current" : ""}`} />
				<span className="flex-1 text-left">{t("like")}</span>
				{state?.liked && <Check className="w-3 h-3 flex-shrink-0" />}
			</button>
		</div>
	)

	return createPortal(
		<div
			ref={menuRef}
			style={{
				position: "fixed",
				left: position.left,
				bottom: position.bottom,
				zIndex: 9999,
				paddingBottom: 8,
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			onClick={stopEvent}
			onMouseDown={stopEvent}
		>
			{menuContent}
		</div>,
		document.body
	)
}

function BottomBar({ state, onToggle, onStatusSelect, onAddToList, updating, onMenuOpen }) {
	const [showMore, setShowMore] = useState(false)
	const [menuPos, setMenuPos] = useState(null)
	const [isMobile, setIsMobile] = useState(false)
	const moreButtonRef = useRef(null)
	const closeTimeoutRef = useRef(null)
	const statusConfig = state?.status ? GAME_STATUS[state.status] : null

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768)
		checkMobile()
		window.addEventListener("resize", checkMobile)
		return () => window.removeEventListener("resize", checkMobile)
	}, [])

	useEffect(() => {
		onMenuOpen?.(showMore)
	}, [showMore, onMenuOpen])

	useEffect(() => {
		if (showMore && moreButtonRef.current) {
			const rect = moreButtonRef.current.getBoundingClientRect()
			const menuWidth = 176
			let left = rect.right - menuWidth

			if (left < 8) left = 8
			if (left + menuWidth > window.innerWidth - 8) {
				left = window.innerWidth - menuWidth - 8
			}

			setMenuPos({
				bottom: window.innerHeight - rect.top,
				left,
			})
		}
	}, [showMore])

	useEffect(() => {
		return () => {
			if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
		}
	}, [])

	const handleClose = useCallback(() => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current)
			closeTimeoutRef.current = null
		}
		setShowMore(false)
	}, [])

	const handleMouseEnter = useCallback(() => {
		if (isMobile) return
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current)
			closeTimeoutRef.current = null
		}
		setShowMore(true)
	}, [isMobile])

	const handleMouseLeave = useCallback(() => {
		if (isMobile) return
		closeTimeoutRef.current = setTimeout(() => {
			setShowMore(false)
		}, 150)
	}, [isMobile])

	const handleButtonClick = useCallback((e) => {
		stopEvent(e)
		setShowMore(prev => !prev)
	}, [])

	return (
		<div
			className="absolute bottom-0 inset-x-0 flex items-center gap-0.5 p-1 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg pointer-events-auto"
			onClick={stopEvent}
			onMouseDown={stopEvent}
		>
			<button
				type="button"
				onMouseDown={stopEvent}
				onClick={(e) => {
					stopEvent(e)
					onStatusSelect(state?.status ? null : STATUS_OPTIONS[0].id)
				}}
				disabled={!!updating}
				title="Jogado"
				className={`p-1.5 rounded cursor-pointer transition-all disabled:opacity-50 ${
					state?.status
						? `${statusConfig?.color || "bg-green-500"} text-white`
						: "text-zinc-400 hover:text-white hover:bg-white/10"
				}`}
			>
				<Check className="w-4 h-4" />
			</button>

			<button
				type="button"
				onMouseDown={stopEvent}
				onClick={(e) => {
					stopEvent(e)
					onToggle("backlog", !state?.backlog)
				}}
				disabled={!!updating}
				title="Backlog"
				className={`p-1.5 rounded cursor-pointer transition-all disabled:opacity-50 ${
					state?.backlog ? "text-white bg-white/20" : "text-zinc-400 hover:text-white hover:bg-white/10"
				}`}
			>
				<Clock className="w-4 h-4" />
			</button>

			<div
				className="relative ml-auto"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				<button
					ref={moreButtonRef}
					type="button"
					onMouseDown={stopEvent}
					onClick={handleButtonClick}
					className={`p-1.5 rounded cursor-pointer transition-all ${
						showMore ? "text-white bg-white/20" : "text-zinc-400 hover:text-white hover:bg-white/10"
					}`}
				>
					<MoreHorizontal className="w-4 h-4" />
				</button>

				{showMore && menuPos && (
					<MoreMenu
						state={state}
						onToggle={onToggle}
						onStatusSelect={onStatusSelect}
						onAddToList={onAddToList}
						updating={updating}
						position={menuPos}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
						onClose={handleClose}
					/>
				)}
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
	disableLink = false,
	className = "",
	customCoverUrl: propCoverUrl = null,
}) {
	const { getRating, getGameData } = useMyLibrary()
	const { user, state: actions, toggle, updating } = useCardActions(game, showQuickActions)
	const [showListModal, setShowListModal] = useState(false)
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	const rating = propRating ?? getRating(game.slug)
	const hasRating = showRating && rating != null && rating > 0
	const gameData = getGameData(game?.slug)
	const customCoverUrl = propCoverUrl || game?.customCoverUrl || gameData?.customCoverUrl || null
	const canShowActions = showQuickActions && user

	const cardClasses = isFavorite
		? "ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/10"
		: ""

	const sizeClasses = responsive
		? "w-full aspect-[3/4]"
		: "w-30 h-40 flex-shrink-0"

	const imageContent = (
		<>
			<GameCover
				game={game}
				customCoverUrl={customCoverUrl}
				className="w-full h-full rounded-lg"
			/>

			<div className={`absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 ${canShowActions ? "pb-10" : ""} gap-1.5 pointer-events-none`}>
				<span className="text-white select-none text-xs font-medium text-center leading-tight line-clamp-3">
					{game.name}
				</span>
				{hasRating && <MiniStars rating={rating} />}
			</div>

			{canShowActions && (
				<div className={`transition-opacity duration-200 ${
					isMenuOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-100 pointer-events-auto md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
				}`}>
					<BottomBar
						state={actions}
						onToggle={toggle}
						onStatusSelect={(val) => toggle("status", val)}
						onAddToList={() => setShowListModal(true)}
						updating={updating}
						onMenuOpen={setIsMenuOpen}
					/>
				</div>
			)}
		</>
	)

	return (
		<>
			<div className={`group relative ${sizeClasses} ${className}`}>
				{isFavorite && <FavoriteBadge />}
				{disableLink ? (
					<div className={`relative w-full h-full rounded-lg ${cardClasses}`}>
						{imageContent}
					</div>
				) : newTab ? (
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
		: "w-30 h-40 flex-shrink-0"

	return <div className={`${sizeClasses} bg-zinc-800 rounded-lg animate-pulse ${className}`} />
}

export { MiniStars }
