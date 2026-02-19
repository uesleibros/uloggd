import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import { Star, Heart, Trophy, Clock, X, AlertTriangle, Eye, FileText, MessageSquare } from "lucide-react"
import { formatRating } from "../../../utils/rating"
import { MarkdownPreview } from "../MarkdownEditor"
import UserBadges from "../User/UserBadges"
import AvatarWithDecoration from "../User/AvatarWithDecoration"

const STATUS_MAP = {
  played: { label: "Jogado", classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  retired: { label: "Aposentado", classes: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  shelved: { label: "Na prateleira", classes: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  abandoned: { label: "Abandonado", classes: "bg-red-500/15 text-red-400 border-red-500/30" },
}

const SORT_OPTIONS = [
  { key: "recent", label: "Recentes" },
  { key: "rating", label: "Nota" },
]

function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`
  if (diff < 31536000) {
    const months = Math.floor(diff / 2592000)
    return months === 1 ? "1 mês" : `${months} meses`
  }
  const years = Math.floor(diff / 31536000)
  return years === 1 ? "1 ano" : `${years} anos`
}

function StarsDisplay({ rating, ratingMode, size = "md" }) {
  if (rating == null) return null

  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5"
  const raw = rating / 20
  const count = ratingMode === "stars_5" ? Math.round(raw) : Math.round(raw * 2) / 2
  const clamped = Math.min(Math.max(count, 0), 5)
  const full = Math.floor(clamped)
  const half = clamped % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f${i}`} className={`${sizeClass} text-amber-400 fill-current`} />
      ))}
      {half && (
        <div className={`relative ${sizeClass}`}>
          <Star className="absolute inset-0 w-full h-full text-zinc-700 fill-current" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className={`${sizeClass} text-amber-400 fill-current`} />
          </div>
        </div>
      )}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e${i}`} className={`${sizeClass} text-zinc-700 fill-current`} />
      ))}
    </div>
  )
}

function ReviewRating({ rating, ratingMode }) {
  if (rating == null) return null

  const isStars = ratingMode === "stars_5" || ratingMode === "stars_5h"

  if (!isStars) {
    const formatted = formatRating(rating, ratingMode)
    if (!formatted) return null

    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Star className="w-4 h-4 text-amber-400 fill-current" />
        <span className="text-base font-bold text-amber-400 tabular-nums leading-none">{formatted.display}</span>
        <span className="text-sm text-zinc-500 font-normal leading-none">/{formatted.max}</span>
      </div>
    )
  }

  return <StarsDisplay rating={rating} ratingMode={ratingMode} />
}

function AspectRatingDisplay({ aspect }) {
  const mode = aspect.ratingMode || "stars_5h"
  const isStars = mode === "stars_5" || mode === "stars_5h"

  if (aspect.rating == null) return <span className="text-xs text-zinc-700">—</span>

  if (isStars) return <StarsDisplay rating={aspect.rating} ratingMode={mode} size="sm" />

  const formatted = formatRating(aspect.rating, mode)
  if (!formatted) return null

  return (
    <span className="text-xs font-semibold text-zinc-300 tabular-nums">
      {formatted.display}<span className="text-zinc-600">/{formatted.max}</span>
    </span>
  )
}

function AspectRatingsPreview({ aspects, compact = false }) {
  if (!aspects?.length) return null

  return (
    <div className={`space-y-1.5 ${compact ? "" : "pt-1"}`}>
      {aspects.map((aspect, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 truncate">{aspect.label}</span>
          <AspectRatingDisplay aspect={aspect} />
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const config = STATUS_MAP[status]
  if (!config) return null

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}>
      {config.label}
    </span>
  )
}

function LogIndicators({ log }) {
  return (
    <>
      {log.liked && <Heart className="w-5 h-5 text-red-500 fill-current flex-shrink-0" />}
      {log.mastered && <Trophy className="w-5 h-5 text-amber-400 fill-current flex-shrink-0" />}
    </>
  )
}

function Playtime({ hours, minutes, className = "" }) {
  if (!hours && !minutes) return null

  const parts = []
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)

  return (
    <div className={`flex items-center gap-2 text-sm text-zinc-500 ${className}`}>
      <Clock className="w-4 h-4 flex-shrink-0" />
      <span>{parts.join(" ")} de jogo</span>
    </div>
  )
}

function CloseButton({ onClick, showEsc = false }) {
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <button
        onClick={onClick}
        className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:bg-zinc-800/50"
      >
        <X className="w-4 h-4" />
      </button>
      {showEsc && (
        <span className="text-[10px] font-bold text-zinc-600 mt-1.5 uppercase tracking-wide hidden md:block">ESC</span>
      )}
    </div>
  )
}

function SpoilerOverlay({ onReveal }) {
  return (
    <div className="relative rounded-xl bg-zinc-800/50 border border-zinc-700 p-6 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-300">Esta review contém spoilers</p>
        <p className="text-xs text-zinc-500 mt-1">O conteúdo está oculto para proteger sua experiência.</p>
      </div>
      <button
        onClick={onReveal}
        className="px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 rounded-lg text-sm text-zinc-300 hover:text-white font-medium cursor-pointer transition-all duration-200 flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        Revelar conteúdo
      </button>
    </div>
  )
}

function ReviewModal({ log, user, onClose }) {
  const aspects = log.aspect_ratings || []

  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => { document.body.style.overflow = ""; document.body.style.paddingRight = "" }
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full h-[90vh] md:h-auto md:max-w-2xl md:max-h-[85vh] bg-zinc-900 md:border md:border-zinc-700 rounded-t-2xl md:rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-700 flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link to={`/u/${user?.username}`} onClick={onClose} className="flex-shrink-0">
              <AvatarWithDecoration
                src={user.avatar}
                alt={user.username}
                decoration={user.avatar_decoration}
                size="lg"
              />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/u/${user?.username}`} onClick={onClose} className="text-base font-semibold text-white hover:text-zinc-300 transition-colors">
                  {user?.username || "Usuário"}
                </Link>
                <UserBadges user={user} size="md" clickable />
                <StatusBadge status={log.status} />
                <LogIndicators log={log} />
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <ReviewRating rating={log.rating} ratingMode={log.rating_mode} />
                <span className="text-sm text-zinc-600">{getTimeAgo(log.created_at)}</span>
              </div>
            </div>
          </div>
          <CloseButton onClick={onClose} showEsc />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 md:p-7">
          {log.contain_spoilers && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 mb-5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span className="text-sm text-amber-400 font-medium">Esta review contém spoilers</span>
            </div>
          )}

          {aspects.length > 0 && (
            <div className="mb-5 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Avaliação por aspecto</h4>
              <div className="space-y-2.5">
                {aspects.map((aspect, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-300">{aspect.label}</span>
                      <AspectRatingDisplay aspect={aspect} />
                    </div>
                    {aspect.review && (
                      <div className="mt-1.5 pl-0 text-xs text-zinc-500 leading-relaxed">
                        <MarkdownPreview content={aspect.review} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <MarkdownPreview content={log.review || ""} />

          <Playtime hours={log.hours_played} minutes={log.minutes_played} className="mt-6 pt-5 border-t border-zinc-700/50" />
        </div>
      </div>
    </div>,
    document.body
  )
}

function ReviewCard({ log, user }) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const hasReview = !!log.review
  const isLong = hasReview && log.review.length > 300
  const isSpoilerHidden = log.contain_spoilers && !spoilerRevealed
  const aspects = log.aspect_ratings || []
  const hasAspects = aspects.length > 0

  return (
    <>
      <div className="rounded-xl p-5 sm:p-6 bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-all duration-200">
        <div className="flex items-start gap-3.5">
          <Link to={`/u/${user?.username}`} className="flex-shrink-0">
            <AvatarWithDecoration
              src={user.avatar}
              alt={user.username}
              decoration={user.avatar_decoration}
              size="lg"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/u/${user?.username}`} className="text-base font-semibold text-white hover:text-zinc-300 transition-colors truncate">
                {user?.username || "Usuário"}
              </Link>
              <UserBadges user={user} size="md" clickable />
              <StatusBadge status={log.status} />
              <LogIndicators log={log} />
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <ReviewRating rating={log.rating} ratingMode={log.rating_mode} />
              <span className="text-sm text-zinc-600">{getTimeAgo(log.created_at)}</span>
            </div>

            {hasAspects && (
              <div className="mt-3 p-3 bg-zinc-900/40 border border-zinc-700/30 rounded-lg">
                <AspectRatingsPreview aspects={aspects} compact />
              </div>
            )}

            {hasReview && (
              <div className="mt-4">
                {isSpoilerHidden ? (
                  <SpoilerOverlay onReveal={() => setSpoilerRevealed(true)} />
                ) : isLong ? (
                  <div className="relative">
                    <div className="max-h-36 overflow-hidden">
                      <MarkdownPreview content={log.review} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-800/90 to-transparent pointer-events-none rounded-b-lg" />
                    <button
                      onClick={() => setShowModal(true)}
                      className="relative z-10 mt-2 px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer transition-all duration-200 flex items-center gap-2 font-medium bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg border border-zinc-700/50"
                    >
                      <FileText className="w-4 h-4" />
                      Ler review completa
                    </button>
                  </div>
                ) : (
                  <MarkdownPreview content={log.review} />
                )}
              </div>
            )}

            <Playtime hours={log.hours_played} minutes={log.minutes_played} className="mt-4" />
          </div>
        </div>
      </div>

      {showModal && <ReviewModal log={log} user={user} onClose={() => setShowModal(false)} />}
    </>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-xl p-5 sm:p-6 bg-zinc-800/50 border border-zinc-700 animate-pulse">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-full bg-zinc-700 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-36 bg-zinc-700 rounded" />
              <div className="h-8 w-28 bg-zinc-700 rounded-lg" />
              <div className="space-y-2 mt-1">
                <div className="h-3.5 w-full bg-zinc-700 rounded" />
                <div className="h-3.5 w-3/4 bg-zinc-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl p-10 sm:p-14 bg-zinc-800/50 border border-zinc-700 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-zinc-600" />
      </div>
      <div className="text-center">
        <p className="text-sm text-zinc-400 font-medium">Nenhuma review ainda</p>
        <p className="text-sm text-zinc-600 mt-1">Seja o primeiro a avaliar este jogo!</p>
      </div>
    </div>
  )
}

export default function GameReviews({ gameId }) {
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("recent")

  useEffect(() => {
    if (!gameId) return
    setLoading(true)

    fetch("/api/logs?action=public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, sortBy }),
    })
      .then((r) => r.ok ? r.json() : { logs: [], users: {} })
      .then((data) => {
        setLogs(data.logs || [])
        setUsers(data.users || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gameId, sortBy])

  const title = "Reviews da comunidade"

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-5">{title}</h2>
        <ReviewsSkeleton />
      </div>
    )
  }

  if (!logs.length) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-5">{title}</h2>
        <EmptyState />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white">
          {title}
          <span className="text-sm text-zinc-500 font-normal ml-2">{logs.length}</span>
        </h2>
        <div className="flex gap-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 ${
                sortBy === option.key
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <ReviewCard key={log.id} log={log} user={users[log.user_id]} />
        ))}
      </div>
    </div>
  )

}
