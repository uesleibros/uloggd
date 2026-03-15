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