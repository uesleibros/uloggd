import { useState } from "react"
import { Link } from "react-router-dom"
import { Gamepad2, Lock } from "lucide-react"
import { motion } from "framer-motion"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { useDateTime } from "#hooks/useDateTime"
import { encode } from "#utils/shortId.js"

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1]
const TRANSITION_DURATION = 0.3

const BASE_POSITIONS = [
  { x: -60, rotate: -10 },
  { x: -30, rotate: -5 },
  { x: 0, rotate: 0 },
  { x: 30, rotate: 5 },
  { x: 60, rotate: 10 },
]

function FanImages({ slugs = [], isActive }) {
  const { getGame } = useGamesBatch(slugs)

  const covers = slugs
    .map((s) => {
      const g = getGame(s)
      if (!g?.cover?.url) return null
      return `https:${g.cover.url.replace("t_thumb", "t_cover_big")}`
    })
    .filter(Boolean)

  if (covers.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Gamepad2 className="w-8 h-8 text-white/10" />
      </div>
    )
  }

  return (
    <>
      {[...Array(5)].map((_, imgIndex) => {
        const pos = BASE_POSITIONS[imgIndex]
        const imageUrl = covers[imgIndex % covers.length]
        
        const centerIndex = 2
        const distanceFromCenter = Math.abs(imgIndex - centerIndex)
        const zIndex = 10 - distanceFromCenter

        const brightness = distanceFromCenter === 0 ? 1 : distanceFromCenter === 1 ? 0.55 : 0.3
        const blurAmount = distanceFromCenter === 0 ? 0 : distanceFromCenter === 1 ? 0.5 : 1.5
        const yOffset = -16 * (1 - distanceFromCenter / centerIndex) || 0
        const scale = distanceFromCenter === 0 ? 1.05 : distanceFromCenter === 1 ? 0.95 : 0.88

        const xPos = isActive ? pos.x * 1.4 : pos.x
        const yPos = isActive ? -8 + yOffset : 8 + yOffset
        const rotation = isActive ? pos.rotate * 1.3 : pos.rotate
        const finalScale = isActive ? scale * 1.02 : scale

        const staggerDelay = distanceFromCenter * 0.08

        return (
          <motion.div
            key={imgIndex}
            className="absolute left-1/2 top-4"
            initial={false}
            animate={{
              x: `calc(-50% + ${xPos}px)`,
              y: yPos,
              rotate: rotation,
              scale: finalScale,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 16,
              mass: 1,
              delay: staggerDelay,
            }}
            style={{ zIndex }}
          >
            <div className="h-[160px] w-[100px] overflow-hidden rounded-lg shadow-xl bg-zinc-900 border border-white/5">
              <motion.img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
                animate={{
                  filter: `brightness(${isActive ? Math.min(1, brightness + 0.2) : brightness}) contrast(1.08) saturate(${1 - distanceFromCenter * 0.2}) blur(${isActive ? 0 : blurAmount}px)`,
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
    </>
  )
}

export function ListCard({ list, showOwner = false, actions = null }) {
  const { t } = useTranslation()
  const { formatDateShort } = useDateTime()
  const [isHovered, setIsHovered] = useState(false)

  const gamesCount = list.games_count || 0
  const shortId = list.shortId || encode(list.id)

  return (
    <motion.div
      className="group relative w-full cursor-pointer h-[240px]"
      style={{
        perspective: "1200px",
        transformStyle: "preserve-3d",
        zIndex: isHovered ? 50 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/list/${shortId}`} className="absolute inset-0 z-50 rounded-2xl" />

      <div className="relative w-full h-full" style={{ perspective: "1200px" }}>
        
        <motion.div
          className="relative z-0 rounded-2xl overflow-hidden"
          animate={{
            rotateX: isHovered ? 15 : 0,
            backgroundColor: "#1e1e1e",
          }}
          transition={{
            rotateX: { type: "spring", stiffness: 200, damping: 25, mass: 0.8 },
            backgroundColor: { duration: TRANSITION_DURATION, ease: EASE_OUT_EXPO },
          }}
          style={{
            height: "224px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
          }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              rotateX: isHovered ? -15 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 25,
              mass: 0.8,
            }}
            style={{
              transformStyle: "flat",
              transformOrigin: "center bottom",
            }}
          >
            <FanImages slugs={list.game_slugs || []} isActive={isHovered} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-transparent to-transparent opacity-80" />
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl overflow-hidden"
          animate={{
            rotateX: isHovered ? -25 : 0,
            backgroundColor: "rgba(26, 26, 26, 0.8)",
          }}
          transition={{
            rotateX: { type: "spring", stiffness: 180, damping: 22, mass: 0.8 },
            backgroundColor: { duration: TRANSITION_DURATION, ease: EASE_OUT_EXPO },
          }}
          style={{
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
            <motion.div
              className="absolute inset-0 flex items-center justify-between px-4"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-block text-[13px] font-medium text-white/70 tabular-nums">
                  {gamesCount}
                </span>
                <span className="text-[13px] text-white/60">
                  {gamesCount === 1 ? t("common.game") : t("common.games")}
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
            </motion.div>
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

export function CoverStrip({ slugs = [] }) {
  const { getGame } = useGamesBatch(slugs)

  if (slugs.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
        <Gamepad2 className="w-6 h-6 text-zinc-700" />
      </div>
    )
  }

  const covers = slugs
    .map((s) => {
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