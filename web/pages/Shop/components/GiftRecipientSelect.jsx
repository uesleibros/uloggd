import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Gift, Search, X } from "lucide-react"
import UserDisplay from "@components/User/UserDisplay"
import { useTranslation } from "#hooks/useTranslation"

const followingCache = new Map()

async function fetchAllFollowing(userId) {
  const all = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      userId,
      type: "following",
      page: page.toString(),
      limit: "100",
    })

    const res = await fetch(`/api/users/followers?${params}`)
    const data = await res.json()

    all.push(...(data.users || []))
    hasMore = page < data.totalPages
    page++
  }

  return all
}

export default function GiftRecipientSelect({ userId, recipient, onChange }) {
  const { t } = useTranslation("shop")
  const [users, setUsers] = useState(() => followingCache.get(userId) || [])
  const [loading, setLoading] = useState(Boolean(userId) && !followingCache.has(userId))
  const [query, setQuery] = useState("")
  const inputRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    if (followingCache.has(userId)) return

    setLoading(true)

    fetchAllFollowing(userId)
      .then(data => {
        followingCache.set(userId, data)
        setUsers(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const filtered = useMemo(() => {
    if (!query.trim()) return users
    const q = query.toLowerCase()
    return users.filter(u => u.username?.toLowerCase().includes(q))
  }, [users, query])

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-medium text-zinc-300">
          {t("detail.giftRecipient")}
        </span>
      </div>

      {recipient ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900/70 border border-zinc-800 px-3 py-2">
          <UserDisplay user={recipient} size="sm" showBadges={false} />
          <button
            onClick={() => {
              onChange(null)
              setQuery("")
              inputRef.current?.focus()
            }}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("detail.searchFollowing")}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-500/40"
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1">
            {loading ? (
              <div className="py-4 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500">
                {query ? t("detail.noUsersFound") : t("detail.noFollowing")}
              </div>
            ) : (
              filtered.slice(0, 8).map(u => (
                <button
                  key={u.user_id || u.id}
                  onClick={() => onChange(u)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-violet-500/10 transition-colors cursor-pointer"
                >
                  <UserDisplay user={u} size="sm" showBadges={false} />
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
