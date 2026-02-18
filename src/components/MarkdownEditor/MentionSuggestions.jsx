import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import UserDisplay from "../User/UserDisplay"

const followingCache = new Map()

export function MentionSuggestions({ query, position, onSelect, userId, editorContainerRef }) {
  const [users, setUsers] = useState(() => followingCache.get(userId) || [])
  const [loading, setLoading] = useState(!followingCache.has(userId))
  const containerRef = useRef(null)
  const [placement, setPlacement] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (followingCache.has(userId)) return
    setLoading(true)
    fetch("/api/user?action=followers", {
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

  useEffect(() => {
    if (!containerRef.current || !editorContainerRef?.current) return

    const editorRect = editorContainerRef.current.getBoundingClientRect()
    const menuHeight = containerRef.current.offsetHeight || 200
    const isMobile = window.innerWidth < 640

    const cursorTop = editorRect.bottom - position.bottom + 8
    const cursorLeft = editorRect.left + position.left

    const lineHeight = 24
    const gap = 6

    const spaceAbove = cursorTop - gap
    const spaceBelow = window.innerHeight - (cursorTop + lineHeight + gap)

    const fitsBelow = spaceBelow >= menuHeight
    const fitsAbove = spaceAbove >= menuHeight
    const placeAbove = !fitsBelow || (fitsAbove && spaceAbove > spaceBelow)

    let top
    if (placeAbove) {
      top = cursorTop - menuHeight - gap
    } else {
      top = cursorTop + lineHeight + gap
    }

    let left, width
    if (isMobile) {
      left = 12
      width = window.innerWidth - 24
    } else {
      const menuWidth = 280
      left = cursorLeft
      if (left + menuWidth > window.innerWidth - 16) left = window.innerWidth - menuWidth - 16
      if (left < 16) left = 16
      width = menuWidth
    }

    if (top < 8) top = 8
    if (top + menuHeight > window.innerHeight - 8) top = window.innerHeight - menuHeight - 8

    setPlacement({ top, left, width })
  }, [position, users, loading, editorContainerRef])

  const filtered = query ? users.filter(u => u.username?.toLowerCase().includes(query.toLowerCase())) : users

  if (!loading && filtered.length === 0) return null

  return createPortal(
    <div
      ref={containerRef}
      className="fixed z-[9999] bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl shadow-black/50 py-1 max-h-48 overflow-y-auto"
      style={{ top: placement.top, left: placement.left, width: placement.width }}
    >
      {loading ? (
        <div className="px-3 py-4 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
        </div>
      ) : (
        filtered.slice(0, 8).map(u => (
          <button
            key={u.id}
            onMouseDown={(e) => { e.preventDefault(); onSelect(u.username) }}
            className="w-full px-3 py-2 hover:bg-zinc-700/70 active:bg-zinc-700 transition-colors cursor-pointer text-left"
          >
            <UserDisplay user={u} size="xs" showBadges={false} />
          </button>
        ))
      )}
    </div>,
    document.body
  )
}
