import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import { formatRating } from "../../../utils/rating"
import { MarkdownPreview } from "../MarkdownEditor"
import UserBadges from "../User/UserBadges"

function ReviewStars({ rating, ratingMode }) {
  if (rating == null) return null

  const isStars = ratingMode === "stars_5" || ratingMode === "stars_5h"

  if (!isStars) {
    const formatted = formatRating(rating, ratingMode)
    if (!formatted) return null
    return (
      <span className="text-sm font-semibold text-amber-400 tabular-nums">
        {formatted.display}<span className="text-zinc-500 font-normal">/{formatted.max}</span>
      </span>
    )
  }

  const starCount = ratingMode === "stars_5" ? Math.round(rating / 20) : rating / 10
  const fullStars = Math.floor(starCount)
  const hasHalf = starCount % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <svg key={`f${i}`} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {hasHalf && (
        <div className="relative w-4 h-4">
          <svg className="absolute inset-0 w-full h-full text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <svg className="absolute inset-0 w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 24 24" style={{ clipPath: "inset(0 50% 0 0)" }}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <svg key={`e${i}`} className="w-4 h-4 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  if (!status) return null

  const config = {
    played: { label: "Jogado", color: "bg-zinc-500/20 text-zinc-400 border-zinc-600" },
    completed: { label: "Completo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    retired: { label: "Aposentado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    shelved: { label: "Na prateleira", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    abandoned: { label: "Abandonado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  }

  const c = config[status]
  if (!c) return null

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.label}
    </span>
  )
}

function ReviewModal({ log, user, onClose }) {
  useEffect(() => {
    const sw = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (sw > 0) document.body.style.paddingRight = `${sw}px`
    return () => { document.body.style.overflow = ""; document.body.style.paddingRight = "" }
  }, [])

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full h-[90vh] md:h-auto md:max-w-2xl md:max-h-[85vh] bg-zinc-900 md:border md:border-zinc-700 rounded-t-2xl md:rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-700 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/user/${user?.username}`} onClick={onClose} className="flex-shrink-0">
              <img
                src={user?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt={user?.username}
                className="w-10 h-10 rounded-full border border-zinc-700 object-cover select-none"
                draggable={false}
              />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/user/${user?.username}`}
                  onClick={onClose}
                  className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
                >
                  {user?.username || "Usuário"}
                </Link>
                <UserBadges user={user} size="sm" clickable />
                <StatusBadge status={log.status} />
                {log.liked && (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                )}
                {log.mastered && (
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <ReviewStars rating={log.rating} ratingMode={log.rating_mode} />
                <span className="text-xs text-zinc-600">{getTimeAgo(log.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center flex-shrink-0">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:bg-zinc-800/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-[10px] font-bold text-zinc-600 mt-1 uppercase tracking-wide hidden md:block">ESC</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
          {log.contain_spoilers && (
            <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-xs text-amber-400 font-medium">Esta review contém spoilers</span>
            </div>
          )}

          <MarkdownPreview content={log.review || ""} />

          {(log.hours_played || log.minutes_played) && (
            <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-zinc-700/50 text-xs text-zinc-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {log.hours_played ? `${log.hours_played}h` : ""}
              {log.hours_played && log.minutes_played ? " " : ""}
              {log.minutes_played ? `${log.minutes_played}m` : ""}
              <span className="text-zinc-700 ml-1">de jogo</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function ReviewCard({ log, user }) {
  const [showSpoiler, setShowSpoiler] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const timeAgo = getTimeAgo(log.created_at)
  const hasReview = !!log.review
  const isLong = hasReview && log.review.length > 300
  const isSpoiler = log.contain_spoilers && !showSpoiler

  return (
    <>
      <div className="rounded-xl p-4 sm:p-5 bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-all duration-200">
        <div className="flex items-start gap-3">
          <Link to={`/user/${user?.username}`} className="flex-shrink-0">
            <img
              src={user?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
              alt={user?.username}
              className="w-10 h-10 rounded-full border border-zinc-700 object-cover select-none"
              draggable={false}
            />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/user/${user?.username}`}
                className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors truncate"
              >
                {user?.username || "Usuário"}
              </Link>
              <UserBadges user={user} size="sm" />
              <StatusBadge status={log.status} />
              {log.liked && (
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              )}
              {log.mastered && (
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                </svg>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <ReviewStars rating={log.rating} ratingMode={log.rating_mode} />
              <span className="text-xs text-zinc-600">{timeAgo}</span>
            </div>

            {hasReview && (
              <div className="mt-3">
                {isSpoiler ? (
                  <div>
                    <div className="relative overflow-hidden rounded-lg bg-zinc-900/50 border border-zinc-700/50 p-4">
                      <div className="blur-md select-none pointer-events-none opacity-50">
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          {log.review.slice(0, 200)}
                        </p>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                        <button
                          onClick={() => setShowSpoiler(true)}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-amber-400 hover:text-amber-300 font-medium cursor-pointer transition-all duration-200 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Revelar spoiler
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isLong ? (
                  <div className="relative">
                    <div className="max-h-32 overflow-hidden">
                      <MarkdownPreview content={log.review} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-800/50 via-zinc-800/40 to-transparent pointer-events-none" />
                    <button
                      onClick={() => setShowModal(true)}
                      className="relative z-10 mt-2 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors flex items-center gap-1.5 font-medium"
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

            {(log.hours_played || log.minutes_played) && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {log.hours_played ? `${log.hours_played}h` : ""}
                {log.hours_played && log.minutes_played ? " " : ""}
                {log.minutes_played ? `${log.minutes_played}m` : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ReviewModal log={log} user={user} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl p-4 sm:p-5 bg-zinc-800/50 border border-zinc-700 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-zinc-700 rounded" />
              <div className="h-3 w-24 bg-zinc-700 rounded" />
              <div className="h-3 w-full bg-zinc-700 rounded mt-3" />
              <div className="h-3 w-3/4 bg-zinc-700 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function getTimeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)

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

export default function GameReviews({ gameId }) {
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("recent")

  useEffect(() => {
    if (!gameId) return
    setLoading(true)

    fetch("/api/logs/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, sortBy }),
    })
      .then((r) => (r.ok ? r.json() : { logs: [], users: {} }))
      .then((data) => {
        setLogs(data.logs || [])
        setUsers(data.users || {})
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [gameId, sortBy])

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Reviews da comunidade</h2>
        <ReviewsSkeleton />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Reviews da comunidade</h2>
        <div className="rounded-xl p-8 sm:p-12 bg-zinc-800/50 border border-zinc-700 flex flex-col items-center justify-center gap-3">
          <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-sm text-zinc-500">Nenhuma review ainda</p>
          <p className="text-xs text-zinc-600">Seja o primeiro a avaliar este jogo!</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Reviews da comunidade
          <span className="text-sm text-zinc-500 font-normal ml-2">{logs.length}</span>
        </h2>
        <div className="flex gap-1">
          {[
            { key: "recent", label: "Recentes" },
            { key: "rating", label: "Nota" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                sortBy === s.key
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {s.label}
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