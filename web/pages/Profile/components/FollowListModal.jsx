import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import UserDisplay from "@components/User/UserDisplay"
import Modal from "@components/UI/Modal"

const LIMIT = 20

export default function FollowListModal({ isOpen, title, userId, onClose }) {
  const { t } = useTranslation("profile")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const observerRef = useRef(null)
  const loaderRef = useRef(null)

  const type = title === t("followModal.followers") ? "followers" : "following"

  const fetchUsers = useCallback(async (pageNum, append = false) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({
        userId,
        type,
        page: pageNum,
        limit: LIMIT,
      })

      const r = await fetch(`/api/users/followers?${params}`)
      const data = await r.json()

      if (append) {
        setUsers(prev => [...prev, ...(data.users || [])])
      } else {
        setUsers(data.users || [])
      }

      setTotal(data.total || 0)
      setHasMore(pageNum < data.totalPages)
    } catch {
      if (!append) setUsers([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId, type])

  useEffect(() => {
    if (!isOpen) return
    setUsers([])
    setSearch("")
    setPage(1)
    setHasMore(false)
    fetchUsers(1)
  }, [isOpen, userId, title, fetchUsers])

  useEffect(() => {
    if (!isOpen || !hasMore || loadingMore || search.trim()) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchUsers(nextPage, true)
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current = observer

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [isOpen, hasMore, loadingMore, page, search, fetchUsers])

  const filtered = search.trim()
    ? users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={!loading ? String(total) : undefined}
      maxWidth="max-w-md"
    >
      {!loading && users.length > 0 && (
        <div className="px-4 pt-3 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("followModal.searchPlaceholder")}
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
                <UserDisplay user={u} size="md" showBadges={true} showStatus={true} linkToProfile={false} />
              </Link>
            ))}

            {hasMore && !search.trim() && (
              <div ref={loaderRef} className="flex justify-center py-4">
                {loadingMore && (
                  <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-zinc-500">
              {search.trim() ? t("followModal.noResults") : t("followModal.empty")}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )

}
