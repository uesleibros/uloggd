import { useState, useCallback, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import {
  Star,
  Play,
  Clock,
  Gift,
  Heart,
  List,
  ChevronRight,
  Check,
  MoreHorizontal,
} from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { useMyLibrary } from "#hooks/useMyLibrary"
import AddToListModal from "@components/Lists/AddToListModal"
import { STATUS_OPTIONS, GAME_STATUS } from "#constants/game"

const COVER_FALLBACK =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"

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
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: "50%" }}
          >
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

function getCoverUrl(game) {
  if (!game?.cover?.url) return COVER_FALLBACK
  return game.cover.url.startsWith("http")
    ? game.cover.url
    : `https:${game.cover.url}`
}

function stopEvent(e) {
  e.preventDefault()
  e.stopPropagation()
}

function MoreMenu({
  state,
  onToggle,
  onStatusSelect,
  onAddToList,
  updating,
  position,
  onMouseEnter,
  onMouseLeave,
}) {
  const { t } = useTranslation("gameCard")
  const [showStatus, setShowStatus] = useState(false)
  const statusConfig = state?.status ? GAME_STATUS[state.status] : null

  const menuContent = showStatus ? (
    <div className="w-44 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden pointer-events-auto">
      <button
        type="button"
        onMouseDown={stopEvent}
        onClick={(e) => {
          stopEvent(e)
          setShowStatus(false)
        }}
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
          onClick={(e) => {
            stopEvent(e)
            onStatusSelect(s.id)
            setShowStatus(false)
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] cursor-pointer transition-colors ${
            state?.status === s.id
              ? "text-white bg-zinc-800"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`} />
          <span className="truncate flex-1 text-left">{s.label}</span>
          {state?.status === s.id && (
            <Check className="w-3 h-3 flex-shrink-0" />
          )}
        </button>
      ))}

      {state?.status && (
        <button
          type="button"
          onMouseDown={stopEvent}
          onClick={(e) => {
            stopEvent(e)
            onStatusSelect(null)
            setShowStatus(false)
          }}
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
        onClick={(e) => {
          stopEvent(e)
          setShowStatus(true)
        }}
        disabled={!!updating}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
      >
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            statusConfig?.color || "bg-zinc-600"
          }`}
        />
        <span className="flex-1 text-left truncate">
          {statusConfig?.label || t("markAsPlayed")}
        </span>
        <ChevronRight className="w-3 h-3 opacity-50" />
      </button>

      <div className="border-t border-zinc-700/50" />

      <button
        type="button"
        onMouseDown={stopEvent}
        onClick={(e) => {
          stopEvent(e)
          onToggle("playing", !state?.playing)
        }}
        disabled={!!updating}
        className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] cursor-pointer disabled:opacity-50 ${
          state?.playing
            ? "text-white bg-zinc-800"
            : "text-zinc-300 hover:text-white hover:bg-zinc-800"
        }`}
      >
        <Play className="w-3 h-3 flex-shrink-0 fill-current" />
        <span className="flex-1 text-left">{t("playing")}</span>
        {state?.playing && <Check className="w-3 h-3 flex-shrink-0" />}
      </button>

      <button
        type="button"
        onMouseDown={stopEvent}
        onClick={(e) => {
          stopEvent(e)
          onToggle("wishlist", !state?.wishlist)
        }}
        disabled={!!updating}
        className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] cursor-pointer disabled:opacity-50 ${
          state?.wishlist
            ? "text-white bg-zinc-800"
            : "text-zinc-300 hover:text-white hover:bg-zinc-800"
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
        onClick={(e) => {
          stopEvent(e)
          onAddToList()
        }}
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
        onClick={(e) => {
          stopEvent(e)
          onToggle("liked", !state?.liked)
        }}
        disabled={!!updating}
        className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] cursor-pointer disabled:opacity-50 ${
          state?.liked
            ? "text-red-400 bg-zinc-800"
            : "text-zinc-300 hover:text-white hover:bg-zinc-800"
        }`}
      >
        <Heart
          className={`w-3 h-3 flex-shrink-0 ${
            state?.liked ? "fill-current" : ""
          }`}
        />
        <span className="flex-1 text-left">{t("like")}</span>
        {state?.liked && <Check className="w-3 h-3 flex-shrink-0" />}
      </button>
    </div>
  )

  return createPortal(
    <div
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
