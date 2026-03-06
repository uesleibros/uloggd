import { useState } from "react"
import { Link } from "react-router-dom"
import { Gamepad2, Lock } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { useDateTime } from "#hooks/useDateTime"
import { encode } from "#utils/shortId.js"

const CARD_POSITIONS = [
  { x: -80, y: 8, scale: 0.88, rotate: -10, z: 8, brightness: 0.3, blur: 1.5 },
  { x: -40, y: 0, scale: 0.95, rotate: -5, z: 9, brightness: 0.55, blur: 0.5 },
  { x: 0, y: -8, scale: 1.05, rotate: 0, z: 10, brightness: 1, blur: 0 },
  { x: 40, y: 0, scale: 0.95, rotate: 5, z: 9, brightness: 0.55, blur: 0.5 },
  { x: 80, y: 8, scale: 0.88, rotate: 10, z: 8, brightness: 0.3, blur: 1.5 },
]

function CoverFan({ slugs = [] }) {
  const { getGame } = useGamesBatch(slugs)

  const covers = slugs
    .slice(0, 5)
    .map((s) => {
      const g = getGame(s)
      if (!g?.cover?.url) return null
      return `https:${g.cover.url.replace("t_thumb", "t_cover_big")}`
    })
    .filter(Boolean)

  if (covers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800/30 rounded-t-2xl">
        <Gamepad2 className="w-8 h-8 text-zinc-700" />
      </div>
    )
  }

  const positions = CARD_POSITIONS.slice(0, covers.length)
  const offsetIndex = Math.floor((5 - covers.length) / 2)

  return (
    <div className="absolute inset-0 pt-4" style={{ transformStyle: "flat" }}>
      {covers.map((url, i) => {
        const pos = CARD_POSITIONS[i + offsetIndex] || CARD_POSITIONS[i]
        
        return (
          <div
            key={i}
            className="absolute left-1/2 top-0"
            style={{
              zIndex: pos.z,
              transform: `translateX(calc(-50% + ${pos.x}px)) translateY(${pos.y}px) scale(${pos.scale}) rotate(${pos.rotate}deg)`,
            }}
          >
            <div className="h-[140px] w-[90px] overflow-hidden rounded-lg shadow-xl ring-1 ring-white/10">
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                style={{
                  filter: `brightness(${pos.brightness}) contrast(1.08) saturate(0.8) blur(${pos.blur}px)`,
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
      className="group relative cursor-pointer h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ perspective: "1200px" }}
    >
      <Link to={`/list/${shortId}`} className="block h-full">
        <div className="relative w-full h-full min-h-[260px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ perspective: "1200px" }}>
          
          <div
            className="relative z-0 rounded-2xl transition-all duration-500 overflow-hidden"
            style={{
              height: "200px",
              transformStyle: "preserve-3d",
              transformOrigin: "center bottom",
              transform: isHovered ? "rotateX(15deg)" : "rotateX(0deg)",
              background: "#1e1e1e",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <CoverFan slugs={list.game_slugs || []} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-transparent to-transparent opacity-80" />
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl overflow-hidden transition-all duration-500"
            style={{
              background: "rgba(26, 26, 26, 0.85)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              transformStyle: "preserve-3d",
              transformOrigin: "center bottom",
              transform: isHovered ? "rotateX(-15deg)" : "rotateX(0deg)",
              boxShadow: isHovered ? "0 -10px 30px -10px rgba(0,0,0,0.5)" : "none",
            }}
          >
            <div className="relative py-4 px-4">
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

              <h3 className="font-semibold text-white/80 text-base leading-snug line-clamp-2 min-h-[2.5rem] relative z-0 transition-colors duration-200 group-hover:text-white">
                {list.title}
              </h3>
              
              {list.description && (
                <p className="text-xs text-white/50 mt-1 line-clamp-1 relative z-0">
                  {list.description}
                </p>
              )}
            </div>

            <div className="relative h-[48px]">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/[0.04]" />
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <div className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[13px] font-medium text-white/70 tabular-nums">
                    {gamesCount}
                  </span>
                  {list.is_public === false && (
                    <Lock className="w-3 h-3 text-white/30 ml-1" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {showOwner && list.owner && (
                    <span className="text-[12px] text-white/50">
                      {list.owner.username}
                    </span>
                  )}
                  {list.updated_at && !showOwner && (
                    <span className="text-[12px] text-white/40">
                      {formatDateShort(list.updated_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {actions && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {actions}
        </div>
      )}
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