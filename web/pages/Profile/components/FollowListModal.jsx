import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import UserDisplay from "@components/User/UserDisplay"
import Modal from "@components/UI/Modal"

const LIMIT = 20

function FollowButton({ user, currentUserId, onFollowChange, t }) {
  const [isFollowing, setIsFollowing] = useState(user.is_following || false)
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  if (!currentUserId || user.user_id === currentUserId) {
    return null
  }

  async function handleFollow(e) {
    e.preventDefault()
    e.stopPropagation()

    if (loading) return
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          followingId: user.user_id,
          action: isFollowing ? "unfollow" : "follow",
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setIsFollowing(data.followed)
        onFollowChange?.(user.user_id, data.followed)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFollow}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading}
      className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
        isFollowing
          ? hovered
            ? "bg-red-500/10 text-red-400 border border-red-500/30"
            : "bg-zinc-800 text-zinc-300 border border-zinc-700"
          : "bg-indigo-500 text-white hover:bg-indigo-600 border border-transparent"
      } disabled:opacity-50`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isFollowing ? (
        hovered ? t("followModal.unfollow") : t("followModal.following")
      ) : (
        t("followModal.follow")
      )}
    </button>
  )
}

export default function FollowListModal({ isOpen, title, userId, onClose, onFollowChange }) {
  const { t } = useTranslation("profile")
  const { user: currentUser } = useAuth()
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

      if (currentUser?.user_id) {
        params.append("currentUserId", currentUser.user_id)
      }

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
  }, [userId, type, currentUser?.user_id])

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
                <div className="flex-1">
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="w-16 h-7 bg-zinc-800 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="p-2">
            {filtered.map(u => (
              <Link
                key={u.user_id}
                to={`/u/${u.username}`}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <UserDisplay user={u} size="md" showBadges={false} showStatus={true} linkToProfile={false} />
                </div>
                <FollowButton user={u} currentUserId={currentUser?.user_id} onFollowChange={onFollowChange} t={t} />
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
