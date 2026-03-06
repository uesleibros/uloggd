import { useState } from "react"
import { Link } from "react-router-dom"
import { Gamepad2, Lock } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { useDateTime } from "#hooks/useDateTime"
import { encode } from "#utils/shortId.js"

function CoverStrip({ slugs = [] }) {
  const { getGame } = useGamesBatch(slugs)

  if (slugs.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800/30">
        <Gamepad2 className="w-6 h-6 text-zinc-700" />
      </div>
    )
  }

  const covers = slugs
    .map(s => {
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
          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
      {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
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

export function ListCard({ 
  list, 
  showOwner = false,
  actions = null,
}) {
  const { t } = useTranslation()
  const { formatDateShort } = useDateTime()
  const [isHovered, setIsHovered] = useState(false)
  
  const gamesCount = list.games_count || 0
  const shortId = list.shortId || encode(list.id)

  return (
    <div 
      className="group relative h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ perspective: "1000px" }}
    >
      <Link 
        to={`/list/${shortId}`} 
        className="block rounded-xl overflow-hidden bg-zinc-800/50 border border-zinc-700/50 h-full flex flex-col transition-colors duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isHovered ? "rotateX(4deg) translateY(-4px)" : "rotateX(0deg) translateY(0px)",
          transformOrigin: "center bottom",
          transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.3s, background-color 0.3s",
          borderColor: isHovered ? "rgba(113, 113, 122, 0.8)" : undefined,
          backgroundColor: isHovered ? "rgba(39, 39, 42, 0.8)" : undefined,
        }}
      >
        <div 
          className="relative h-20 sm:h-24 overflow-hidden flex-shrink-0"
          style={{
            transformStyle: "preserve-3d",
            transform: isHovered ? "translateZ(10px)" : "translateZ(0px)",
            transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <CoverStrip slugs={list.game_slugs || []} />
          <div 
            className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/30 to-zinc-900/10 transition-opacity duration-300"
            style={{ opacity: isHovered ? 0.7 : 1 }}
          />
        </div>

        <div 
          className="p-3 sm:p-3.5 flex flex-col flex-1"
          style={{
            transformStyle: "preserve-3d",
            transform: isHovered ? "translateZ(20px)" : "translateZ(0px)",
            transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <div className="flex items-start justify-between gap-2 flex-1">
            <div className="flex-1 min-w-0">
              <h3 
                className="text-sm font-semibold text-white truncate transition-colors duration-300"
                style={{ color: isHovered ? "rgb(129, 140, 248)" : undefined }}
              >
                {list.title}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 sm:line-clamp-2 min-h-[1rem] sm:min-h-[2rem]">
                {list.description || ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-2">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" />
              {gamesCount}
            </span>
            {list.is_public === false && (
              <span className="text-xs text-zinc-600 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">{t("common.private")}</span>
              </span>
            )}
            {showOwner && list.owner && (
              <span className="text-xs text-zinc-500">
                {list.owner.username}
              </span>
            )}
            {list.updated_at && (
              <span className="text-[11px] text-zinc-600 ml-auto hidden sm:block">
                {formatDateShort(list.updated_at)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div 
        className="absolute inset-x-0 -bottom-2 h-4 rounded-b-xl transition-opacity duration-500 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(99, 102, 241, 0.15), transparent)",
          opacity: isHovered ? 1 : 0,
          filter: "blur(8px)",
        }}
      />

      {actions && (
        <div className="absolute top-2 right-2 z-10">
          {actions}
        </div>
      )}
    </div>
  )
}

export { CoverStrip }