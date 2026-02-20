import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import UserDisplay from "@components/User/UserDisplay"
import Modal from "@components/UI/Modal"

export default function LikeListModal({ isOpen, logId, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setUsers([])
    setSearch("")

    fetch("/api/logs?action=likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId }),
    })
      .then(r => r.json())
      .then(data => { setUsers(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [isOpen, logId])

  const filtered = search.trim()
    ? users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Curtidas"
      subtitle={!loading ? String(users.length) : undefined}
      maxWidth="max-w-md"
    >
      {!loading && users.length > 0 && (
        <div className="px-4 pt-3 flex-shrink-0">
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
              <Link
                key={u.id}
                to={`/u/${u.username}`}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <UserDisplay user={u} size="md" showBadges={true} linkToProfile={false} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-zinc-500">
              {search.trim() ? "Nenhum usuário encontrado" : "Nenhuma curtida"}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
