import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import { formatRating } from "../../../utils/rating"
import { MarkdownPreview } from "../MarkdownEditor"
import UserBadges from "../User/UserBadges"
import AvatarWithDecoration from "../User/AvatarWithDecoration"

const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"

const STATUS_MAP = {
  played: { label: "Jogado", classes: "bg-zinc-500/15 text-zinc-400 border-zinc-700" },
  completed: { label: "Completo", classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
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
        <svg key={`f${i}`} className={`${sizeClass} text-amber-400`} fill="currentColor" viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
      ))}
      {half && (
        <div className={`relative ${sizeClass}`}>
          <svg className="absolute inset-0 w-full h-full text-zinc-700" fill="currentColor" viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
          <svg className="absolute inset-0 w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 24 24" style={{ clipPath: "inset(0 50% 0 0)" }}><path d={STAR_PATH} /></svg>
        </div>
      )}
      {Array.from({ length: empty }, (_, i) => (
        <svg key={`e${i}`} className={`${sizeClass} text-zinc-700`} fill="currentColor" viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
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
        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
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
      {log.liked && (
        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )}
      {log.mastered && (
        <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
      )}
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
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
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
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
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
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-300">Esta review contém spoilers</p>
        <p className="text-xs text-zinc-500 mt-1">O conteúdo está oculto para proteger sua experiência.</p>
      </div>
      <button
        onClick={onReveal}
        className="px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 rounded-lg text-sm text-zinc-300 hover:text-white font-medium cursor-pointer transition-all duration-200 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
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
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
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
        <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
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
