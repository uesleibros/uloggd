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
  { x: -72, rotate: -10 },
  { x: -36, rotate: -5 },
  { x: 0, rotate: 0 },
  { x: 36, rotate: 5 },
  { x: 72, rotate: 10 },
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
    <div className="absolute inset-0 flex items-center justify-center" style={{ top: "-30px" }}>
      {[...Array(5)].map((_, imgIndex) => {
        const pos = BASE_POSITIONS[imgIndex]
        const imageUrl = covers[imgIndex % covers.length]
        
        const centerIndex = 2
        const distanceFromCenter = Math.abs(imgIndex - centerIndex)
        const zIndex = 10 - distanceFromCenter

        const idleBrightness = distanceFromCenter === 0 ? 1 : distanceFromCenter === 1 ? 0.65 : 0.45
        const hoverBrightness = distanceFromCenter === 0 ? 1 : distanceFromCenter === 1 ? 0.4 : 0.2
        
        const yOffset = distanceFromCenter === 0 ? 0 : distanceFromCenter === 1 ? 6 : 12
        const scale = distanceFromCenter === 0 ? 1 : distanceFromCenter === 1 ? 0.94 : 0.88

        const xPos = isActive ? pos.x * 1.15 : pos.x
        const yPos = isActive ? yOffset - 8 : yOffset
        const rotation = isActive ? pos.rotate * 1.15 : pos.rotate
        const finalScale = isActive ? scale * 1.02 : scale

        const staggerDelay = distanceFromCenter * 0.03

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
              stiffness: 150,
              damping: 20,
              mass: 0.8,
              delay: staggerDelay,
            }}
            style={{ zIndex }}
          >
            <div className="h-[140px] w-[92px] overflow-hidden rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.5)] bg-zinc-900 border border-white/10">
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

  return (
    <motion.div
      className="group relative w-full cursor-pointer h-[224px]"
      style={{
        perspective: "1200px",
        zIndex: isHovered ? 50 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/list/${shortId}`} className="absolute inset-0 z-40 rounded-2xl" />

      <div className="relative w-full h-full" style={{ perspective: "1200px" }}>
        
        <motion.div
          className="relative z-0 rounded-2xl overflow-hidden"
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
            height: "224px",
            background: "#1e1e1e",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
          }}
        >
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
            }}
          >
            <FanImages slugs={list.game_slugs || []} isActive={isHovered} />
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
                  {gamesCount === 1 ? t("common.game", { count: gamesCount }) : t("common.games", { count: gamesCount })}
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
