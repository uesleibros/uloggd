import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import UserDisplay from "@components/User/UserDisplay"

const followingCache = new Map()

export function MentionSuggestions({ query, position, onSelect, userId }) {
  const [users, setUsers] = useState(() => followingCache.get(userId) || [])
  const [loading, setLoading] = useState(!followingCache.has(userId))
  const containerRef = useRef(null)
  const [placement, setPlacement] = useState({ top: 0, left: 0, opacity: 0 })

  useEffect(() => {
    if (followingCache.has(userId)) return
    setLoading(true)
    fetch("/api/users/followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type: "following" }),
    })
      .then(r => r.json())
      .then(data => {
        followingCache.set(userId, data || [])
        setUsers(data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId])

  useLayoutEffect(() => {
    if (!position || !containerRef.current) return

    const menuRect = containerRef.current.getBoundingClientRect()
    const menuHeight = menuRect.height || 180
    const menuWidth = window.innerWidth < 640 ? window.innerWidth - 24 : 250
    
    const lineHeight = 22 
    
    let top = position.bottom + 5 
    let left = position.left

    if (top + menuHeight > window.innerHeight) {
      top = position.top - menuHeight - 5
    }

    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12
    }

    if (left < 12) left = 12

    setPlacement({ 
      top, 
      left, 
      width: menuWidth,
      opacity: 1 
    })
  }, [position, users.length, loading, query])

  const filtered = query 
    ? users.filter(u => u.username?.toLowerCase().includes(query.toLowerCase())) 
    : users

  if (!loading && filtered.length === 0) return null

  return createPortal(
    <div
      ref={containerRef}
      className="fixed z-[10005] bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl shadow-black py-1 overflow-y-auto transition-opacity duration-75"
      style={{ 
        top: placement.top, 
        left: placement.left, 
        width: placement.width,
        maxHeight: '200px',
        opacity: placement.opacity
      }}
    >
      {loading ? (
        <div className="px-3 py-4 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        filtered.slice(0, 8).map(u => (
          <button
            key={u.id}
            onMouseDown={(e) => { 
              e.preventDefault()
              e.stopPropagation()
              onSelect(u.username) 
            }}
            className="w-full px-3 py-1.5 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors cursor-pointer text-left flex items-center gap-2 group"
          >
            <UserDisplay user={u} size="xs" showBadges={false} />
            <span className="text-xs text-zinc-500 group-hover:text-indigo-400/70">@{u.username}</span>
          </button>
        ))
      )}
    </div>,
    document.body
  )
}
