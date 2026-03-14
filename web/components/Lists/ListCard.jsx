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
	const { getGame } = useGamesBatch(slugs)
	const { getCustomCover } = useCustomCovers(ownerId, slugs)

	const covers = orderedSlugs
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
						animate={{
							x: xPos,
							y: yPos,
							rotate: rotation,
							scale: finalScale,
						}}
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
								transition={{
									duration: TRANSITION_DURATION,
									ease: EASE_OUT_EXPO,
								}}
							/>
						</div>
					</motion.div>
				)
			})}
		</div>
	)
}

export function ListCard({ list, showOwner = false, actions = null }) {
	const { t } = useTranslation()
	const { formatDateShort } = useDateTime()
	const [isHovered, setIsHovered] = useState(false)

	const gamesCount = list.games_count || 0
	const shortId = list.shortId || encode(list.id)
	const ownerId = list.user_id

	return (
		<motion.div
			className="group relative w-full cursor-pointer h-[280px]"
			style={{
				perspective: "1200px",
				zIndex: isHovered ? 50 : 1,
				overflow: "visible",
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Link to={`/list/${shortId}`} className="absolute inset-0 z-40 rounded-2xl" />

			<div
				className="relative w-full h-full"
				style={{
					perspective: "1200px",
					overflow: "visible",
				}}
			>
				<motion.div
					className="relative z-0"
					animate={{
						rotateX: isHovered ? 12 : 0,
					}}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						mass: 0.8,
					}}
					style={{
						height: "280px",
						transformStyle: "preserve-3d",
						transformOrigin: "center bottom",
						overflow: "visible",
					}}
				>
					<div
						className="absolute inset-0 rounded-2xl pointer-events-none"
						style={{
							background: "#1e1e1e",
							border: "1px solid rgba(255, 255, 255, 0.06)",
							overflow: "hidden",
							zIndex: 0,
						}}
					/>

					<motion.div
						className="absolute inset-0"
						animate={{
							rotateX: isHovered ? -12 : 0,
						}}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							mass: 0.8,
						}}
						style={{
							transformOrigin: "center bottom",
							overflow: "visible",
						}}
					>
						<FanImages
							slugs={list.game_slugs || []}
							isActive={isHovered}
							ranked={!!list.ranked}
							ownerId={ownerId}
						/>
					</motion.div>
				</motion.div>

				<motion.div
					className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl overflow-hidden"
					animate={{
						rotateX: isHovered ? -20 : 0,
					}}
					transition={{
						type: "spring",
						stiffness: 180,
						damping: 22,
						mass: 0.8,
					}}
					style={{
						background: "rgba(26, 26, 26, 0.9)",
						backdropFilter: "blur(16px)",
						WebkitBackdropFilter: "blur(16px)",
						border: "1px solid rgba(255, 255, 255, 0.06)",
						transformStyle: "preserve-3d",
						transformOrigin: "center bottom",
					}}
				>
					<div className="relative py-4 px-4 min-h-[2.75rem]">
						<div
							className="absolute -inset-2 transition-all duration-500 rounded-t-2xl pointer-events-none"
							style={{
								opacity: isHovered ? 1 : 0,
								background: "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(129,140,248,0.15) 0%, transparent 60%)",
								filter: "blur(12px)",
							}}
						/>
						<div
							className="absolute -inset-px transition-all duration-500 rounded-t-lg pointer-events-none overflow-hidden"
							style={{
								opacity: isHovered ? 1 : 0,
								background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
							}}
						/>
						<div
							className="absolute inset-x-2 -top-1 h-px transition-all duration-500 pointer-events-none"
							style={{
								opacity: isHovered ? 1 : 0,
								background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
								filter: "blur(0.5px)",
							}}
						/>

						<h3 className="font-semibold text-white/70 text-base leading-snug line-clamp-1 relative z-0 transition-colors duration-200 group-hover:text-white">
							{list.title}
						</h3>
						{list.description && (
							<p className="text-xs text-white/40 mt-1 line-clamp-1 relative z-0 transition-colors duration-200 group-hover:text-white/60">
								{list.description}
							</p>
						)}
					</div>

					<div className="relative h-[48px]">
						<div className="absolute inset-x-0 top-0 h-[1px] bg-white/[0.04]" />
						<div className="absolute inset-0 flex items-center justify-between px-4">
							<div className="flex items-center gap-1.5">
								<span className="text-[13px] text-white/60">
									{gamesCount === 1 ? t("common.games", { count: gamesCount }) : t("common.games_plural", { count: gamesCount })}
								</span>
								{list.is_public === false && (
									<Lock className="w-3 h-3 text-white/30 ml-1" />
								)}
							</div>
							<div className="flex items-center gap-2">
								<span className="text-xs text-white/50">
									{showOwner && list.owner ? list.owner.username : list.updated_at ? formatDateShort(list.updated_at) : ""}
								</span>
							</div>
						</div>
					</div>
				</motion.div>
			</div>

			{actions && (
				<div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
					{actions}
				</div>
			)}
		</motion.div>
	)
}

export function CoverStrip({ slugs = [], ownerId = null }) {
	const { getGame } = useGamesBatch(slugs)
	const { getCustomCover } = useCustomCovers(ownerId, slugs)

	if (slugs.length === 0) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
				<Gamepad2 className="w-6 h-6 text-zinc-700" />
			</div>
		)
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

	if (covers.length === 0 && slugs.length > 0) {
		return <div className="w-full h-full bg-zinc-800 animate-pulse" />
	}

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
