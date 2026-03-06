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

function CoverFan({ slugs = [], isHovered }) {
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
      <div className="absolute inset-0 flex items-center justify-center">
        <Gamepad2 className="w-8 h-8 text-zinc-700" />
      </div>
    )
  }

  const positions = CARD_POSITIONS.slice(0, covers.length)
  const centerIndex = Math.floor(covers.length / 2)

  return (
    <div
      className="absolute inset-0"
      style={{
        transformStyle: "flat",
        transformOrigin: "center bottom",
        transform: isHovered ? "rotateX(15deg)" : "none",
        transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      {covers.map((url, i) => {
        const offset = i - centerIndex
        const pos = {
          x: offset * 32,
          y: Math.abs(offset) * 6,
          scale: 1 - Math.abs(offset) * 0.08,
          rotate: offset * 6,
          z: 10 - Math.abs(offset),
          brightness: 1 - Math.abs(offset) * 0.25,
          blur: Math.abs(offset) * 0.8,
        }

        return (
          <div
            key={i}
            className="absolute left-1/2 top-2"
            style={{
              zIndex: pos.z,
              transform: `translateX(calc(-50% + ${pos.x}px)) translateY(${pos.y}px) scale(${pos.scale}) rotate(${pos.rotate}deg)`,
              transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            <div className="h-24 w-16 overflow-hidden rounded-lg shadow-lg">
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                style={{
                  filter: `brightness(${pos.brightness}) contrast(1.08) saturate(${1 - Math.abs(offset) * 0.15}) blur(${pos.blur}px)`,
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
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ perspective: "1200px" }}
    >
      <Link to={`/list/${shortId}`} className="block">
        <div className="relative w-full" style={{ perspective: "1200px" }}>
          <div
            className="relative z-0 rounded-2xl"
            style={{
              height: "140px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              transformStyle: "preserve-3d",
              transformOrigin: "center bottom",
              transform: isHovered ? "rotateX(12deg)" : "none",
              transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
              backgroundColor: "#1e1e1e",
            }}
          >
            <CoverFan slugs={list.game_slugs || []} isHovered={isHovered} />
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl overflow-hidden"
            style={{
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              transformStyle: "preserve-3d",
              transformOrigin: "center bottom",
              transform: isHovered ? "rotateX(-20deg)" : "none",
              transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
              backgroundColor: "rgba(26, 26, 26, 0.8)",
            }}
          >
            <div className="relative py-3 px-4">
              <div
                className="absolute -inset-2 rounded-t-2xl pointer-events-none transition-opacity duration-500"
                style={{
                  opacity: isHovered ? 1 : 0,
                  background:
                    "radial-gradient(100% 80% at 50% 0%, rgba(129, 140, 248, 0.15) 0%, transparent 60%)",
                  filter: "blur(12px)",
                }}
              />

              <div
                className="absolute -inset-px rounded-t-lg pointer-events-none overflow-hidden transition-opacity duration-500"
                style={{
                  opacity: isHovered ? 1 : 0,
                  background:
                    "linear-gradient(rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                }}
              />

              <div
                className="absolute inset-x-2 -top-px h-px pointer-events-none transition-opacity duration-500"
                style={{
                  opacity: isHovered ? 1 : 0,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)",
                  filter: "blur(0.5px)",
                }}
              />

              <h3
                className="font-semibold text-white/70 text-sm leading-snug line-clamp-2 min-h-[2.5rem] relative z-0 transition-colors duration-200"
                style={{ color: isHovered ? "white" : undefined }}
              >
                {list.title}
              </h3>

              {list.description && (
                <p className="text-xs text-white/40 mt-1 line-clamp-1">
                  {list.description}
                </p>
              )}
            </div>

            <div className="relative h-10">
              <div className="absolute inset-x-0 top-0 h-px bg-white/[0.04]" />

              <div className="absolute inset-0 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-white/50" />
                    <span className="text-[13px] font-medium text-white/70 tabular-nums">
                      {gamesCount}
                    </span>
                    <span className="text-[13px] text-white/50">
                      {gamesCount === 1 ? "game" : "games"}
                    </span>
                  </div>

                  {list.is_public === false && (
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-white/40" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {showOwner && list.owner && (
                    <span className="text-xs text-white/50">
                      {list.owner.username}
                    </span>
                  )}
                  {list.updated_at && (
                    <span className="text-xs text-white/40">
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
        <div
          className="absolute top-2 right-2 z-20 transition-opacity duration-200"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
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