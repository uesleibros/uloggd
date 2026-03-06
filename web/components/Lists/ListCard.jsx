import { useState } from "react"
import { Link } from "react-router-dom"
import { Gamepad2, Lock, MoreVertical } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { useDateTime } from "#hooks/useDateTime"
import { encode } from "#utils/shortId.js"

const FAN_POSITIONS = [
  {
    idle: { x: -10, y: 20, scale: 0.85, rotate: -4, z: 8, br: 0.4, blur: 1 },
    hover: { x: -90, y: 15, scale: 0.88, rotate: -12, z: 8, br: 0.3, blur: 1.5 },
  },
  {
    idle: { x: -5, y: 15, scale: 0.9, rotate: -2, z: 9, br: 0.6, blur: 0.5 },
    hover: { x: -45, y: 5, scale: 0.95, rotate: -6, z: 9, br: 0.55, blur: 0.5 },
  },
  {
    idle: { x: 0, y: 10, scale: 0.95, rotate: 0, z: 10, br: 0.8, blur: 0 },
    hover: { x: 0, y: -5, scale: 1.05, rotate: 0, z: 10, br: 1, blur: 0 },
  },
  {
    idle: { x: 5, y: 15, scale: 0.9, rotate: 2, z: 9, br: 0.6, blur: 0.5 },
    hover: { x: 45, y: 5, scale: 0.95, rotate: 6, z: 9, br: 0.55, blur: 0.5 },
  },
  {
    idle: { x: 10, y: 20, scale: 0.85, rotate: 4, z: 8, br: 0.4, blur: 1 },
    hover: { x: 90, y: 15, scale: 0.88, rotate: 12, z: 8, br: 0.3, blur: 1.5 },
  },
]

function CoverFan({ slugs = [], isHovered }) {
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

  const items = covers.slice(0, 5)
  const offsetIndex = Math.max(0, Math.floor((5 - items.length) / 2))

  return (
    <div className="absolute inset-0" style={{ transformStyle: "flat" }}>
      {items.map((url, i) => {
        const posData = FAN_POSITIONS[i + offsetIndex] || FAN_POSITIONS[2]
        const state = isHovered ? posData.hover : posData.idle
        
        const delay = Math.abs(2 - (i + offsetIndex)) * 50

        return (
          <div
            key={i}
            className="absolute left-1/2 top-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              zIndex: state.z,
              transform: `translateX(calc(-50% + ${state.x}px)) translateY(${state.y}px) scale(${state.scale}) rotate(${state.rotate}deg)`,
              transitionDelay: `${isHovered ? delay : 0}ms`,
            }}
          >
            <div className="h-[160px] w-[100px] overflow-hidden rounded-lg bg-zinc-900 shadow-xl border border-white/5">
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                loading="lazy"
                style={{
                  filter: `brightness(${state.br}) contrast(1.08) saturate(0.8) blur(${state.blur}px)`,
                  transitionDelay: `${isHovered ? delay : 0}ms`,
                }}
              />
            </div>
          </div>
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
    <div
      className="group relative cursor-pointer w-full max-w-[320px] mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="relative w-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" 
        style={{ perspective: "1200px" }}
      >
        <Link to={`/list/${shortId}`} className="absolute inset-0 z-50 rounded-2xl" />

        <div
          className="relative z-0 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            height: "224px",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
            transform: isHovered ? "rotateX(15deg)" : "rotateX(0deg)",
            background: "#1e1e1e",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div
            className="absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              transformStyle: "flat",
              transformOrigin: "center bottom",
              transform: isHovered ? "rotateX(-15deg)" : "rotateX(0deg)",
            }}
          >
            <CoverFan slugs={list.game_slugs || []} isHovered={isHovered} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] to-transparent opacity-80 rounded-2xl pointer-events-none" />
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            background: "rgba(26, 26, 26, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
            transform: isHovered ? "rotateX(-25deg)" : "rotateX(0deg)",
            boxShadow: isHovered ? "0 -20px 40px -20px rgba(0,0,0,0.5)" : "none",
          }}
        >
          <div className="relative py-4 px-4 min-h-[2.75rem]">
            <div
              className="absolute -inset-2 transition-all duration-500 rounded-t-2xl pointer-events-none"
              style={{
                opacity: isHovered ? 1 : 0,
                background: "radial-gradient(100% 80% at 50% 0%, rgba(120, 180, 255, 0.15) 0%, transparent 60%)",
                filter: "blur(12px)",
              }}
            />
            <div
              className="absolute -inset-px transition-all duration-500 rounded-t-lg pointer-events-none overflow-hidden"
              style={{
                opacity: isHovered ? 1 : 0,
                background: "linear-gradient(rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
              }}
            />
            <div
              className="absolute inset-x-2 -top-1 h-px transition-all duration-500 pointer-events-none"
              style={{
                opacity: isHovered ? 1 : 0,
                background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)",
                filter: "blur(0.5px)",
              }}
            />

            <h3 className="font-semibold text-white/70 text-base leading-snug line-clamp-1 transition-colors duration-200 group-hover:text-white relative z-0">
              {list.title}
            </h3>
            
            {list.description && (
              <p className="text-xs text-white/40 mt-1 line-clamp-1 transition-colors duration-200 group-hover:text-white/60 relative z-0">
                {list.description}
              </p>
            )}
          </div>

          <div className="relative h-[48px]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/[0.04]" />
            <div className="absolute inset-0 flex items-center justify-between px-4">
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
                
                {actions && (
                  <div className="relative z-50">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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