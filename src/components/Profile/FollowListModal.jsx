import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import UserDisplay from "../User/UserDisplay"

export default function FollowListModal({ title, userId, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  useEffect(() => {
    fetch("/api/user?action=followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type: title === "Seguidores" ? "followers" : "following" }),
    })
      .then(r => r.json())
      .then(data => { setUsers(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId, title])

  const filtered = search.trim()
    ? users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    : users

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">
            {title}
            {!loading && <span className="text-sm text-zinc-500 font-normal ml-2">{users.length}</span>}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!loading && users.length > 0 && (
          <div className="px-4 pt-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar usuário..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              autoFocus
            />
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="p-2">
              {filtered.map(u => (
                <Link key={u.id} to={`/u/${u.username}`} onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors">
                  <UserDisplay user={u} size="md" showBadges={true} linkToProfile={false} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-zinc-500">{search.trim() ? "Nenhum usuário encontrado" : "Nenhum usuário"}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}