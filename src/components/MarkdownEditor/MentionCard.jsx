import { useState, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import UserBadges from "../User/UserBadges"

export function MentionCard({ username, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => { requestAnimationFrame(() => setMounted(true)) })
  }, [])

  const handleClose = useCallback(() => {
    setMounted(false)
    setTimeout(onClose, 150)
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/user?action=profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setProfile(data); setLoading(false) })
      .catch(err => { if (err.name !== "AbortError") { setError(true); setLoading(false) } })
    return () => controller.abort()
  }, [username])

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") handleClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleClose])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalPadding = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPadding
    }
  }, [])

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-150 ${mounted ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={`relative bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/50 overflow-hidden transition-all duration-150 ${mounted ? "scale-100 translate-y-0" : "scale-95 translate-y-2"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-zinc-400 hover:text-white hover:bg-black/60 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {loading ? (
          <>
            <div className="h-28 bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse" />
            <div className="px-5 -mt-10 relative"><div className="w-20 h-20 rounded-full bg-zinc-700 border-4 border-zinc-900 animate-pulse" /></div>
            <div className="px-5 pt-3 pb-5 space-y-3">
              <div className="h-6 w-36 bg-zinc-800 rounded-md animate-pulse" />
              <div className="h-3.5 w-48 bg-zinc-800/60 rounded animate-pulse" />
              <div className="h-3.5 w-32 bg-zinc-800/40 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse mt-4" />
            </div>
          </>
        ) : error ? (
          <div className="px-6 py-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
              <svg className="w-7 h-7 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-zinc-300">Usuário não encontrado</p>
              <p className="text-xs text-zinc-500">@{username} não existe ou foi removido</p>
            </div>
            <button onClick={handleClose} className="px-5 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer">Fechar</button>
          </div>
        ) : (
          <>
            <div className="h-28 relative overflow-hidden">
              {profile.banner ? (
                <img src={profile.banner} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-zinc-800 to-zinc-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
            </div>
            <div className="px-5 -mt-10 relative">
              <img src={profile.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt={profile.username} className="w-20 h-20 rounded-full border-4 border-zinc-900 bg-zinc-800 select-none object-cover shadow-xl" draggable={false} />
            </div>
            <div className="px-5 pt-3 pb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white truncate">{profile.username}</h3>
                <UserBadges user={profile} size="lg" />
              </div>
              {profile.created_at && (
                <p className="text-xs text-zinc-600 mt-2.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Membro desde {new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </p>
              )}
              <a href={`/u/${profile.username}`} className="mt-4 w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group">
                Ver perfil completo
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}