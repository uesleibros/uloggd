import { useEffect, useState, useRef } from "react"
import { Users } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import DragScrollRow from "@components/UI/DragScrollRow"

function FriendsOverlay({ friends, friendsCount }) {
  if (!friends || friends.length === 0) return null

  return (
    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 pointer-events-none">
      <div className="flex -space-x-1.5">
        {friends.slice(0, 3).map((friend) => (
          <img
            key={friend.user_id}
            src={friend.avatar}
            alt={friend.username}
            title={friend.username}
            className="w-5 h-5 rounded-full border-2 border-zinc-900 object-cover"
          />
        ))}
      </div>
      {friendsCount > 3 && (
        <span className="text-[10px] font-medium text-white/80 bg-black/50 px-1.5 py-0.5 rounded-full">
          +{friendsCount - 3}
        </span>
      )}
    </div>
  )
}

function PopularGameCard({ game }) {
  return (
    <div className="relative flex-shrink-0">
      <GameCard game={game} draggable={false} />
      <FriendsOverlay friends={game.friends} friendsCount={game.friends_count} />
    </div>
  )
}

export default function PopularAmongFriendsCarousel() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!user || fetchedRef.current) return

    let cancelled = false

    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        const res = await fetch("/api/home/popularAmongFriends?limit=15", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        const data = await res.json()

        if (!cancelled) {
          setGames(data.games || [])
          setLoading(false)
          fetchedRef.current = true
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => { cancelled = true }
  }, [user])

  if (!user) return null

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
            {t("home.sections.popularAmongFriends")}
          </h2>
        </div>
        <DragScrollRow
          className="gap-4 overflow-x-hidden py-2 touch-pan-y"
          autoScroll
          autoScrollSpeed={0.03}
          loop
        >
          {[...Array(20)].map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </DragScrollRow>
      </section>
    )
  }

  if (games.length === 0) return null

  const tripled = [...games, ...games, ...games]

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
          {t("home.sections.popularAmongFriends")}
        </h2>
      </div>
      <DragScrollRow
        className="gap-4 overflow-x-hidden py-2 touch-pan-y"
        autoScroll
        autoScrollSpeed={0.03}
        loop
      >
        {tripled.map((game, index) => (
          <PopularGameCard key={`${game.id}-${index}`} game={game} />
        ))}
      </DragScrollRow>
    </section>
  )
}
