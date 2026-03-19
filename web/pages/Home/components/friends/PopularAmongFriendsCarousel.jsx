import { useEffect, useState, useRef } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import DragScrollRow from "@components/UI/DragScrollRow"

function FriendsOverlay({ friends, friendsCount }) {
  if (!friends || friends.length === 0) return null

  return (
    <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
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
        <span className="text-[10px] font-medium text-white bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
          +{friendsCount - 3}
        </span>
      )}
    </div>
  )
}

function PopularGameCard({ game }) {
  return (
    <div className="relative flex-shrink-0">
      <FriendsOverlay friends={game.friends} friendsCount={game.friends_count} />
      <GameCard game={game} draggable={false} />
    </div>
  )
}

export default function PopularAmongFriendsCarousel() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  
  const abortControllerRef = useRef(null)
  const fetchedForUserRef = useRef(null)

  useEffect(() => {
    if (!user) {
      setGames([])
      setLoading(false)
      fetchedForUserRef.current = null
      return
    }

    if (fetchedForUserRef.current === user.user_id) {
      return
    }

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    
    const currentAbortController = abortControllerRef.current

    async function fetchData() {
      setLoading(true)
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (currentAbortController.signal.aborted) return
        
        if (!session) {
          setLoading(false)
          return
        }

        const res = await fetch("/api/home/popularAmongFriends?limit=15", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: currentAbortController.signal,
        })

        if (currentAbortController.signal.aborted) return

        const data = await res.json()

        if (currentAbortController.signal.aborted) return

        setGames(data.games || [])
        fetchedForUserRef.current = user.user_id
      } catch (err) {
        if (err.name === "AbortError") return
        console.error("Error fetching popular among friends:", err)
      } finally {
        if (!currentAbortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      currentAbortController.abort()
    }
  }, [user])

  if (!user) return null
  if (!loading && games.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
        {t("home.sections.popularAmongFriends")}
      </h2>
      <DragScrollRow className="gap-4 overflow-x-hidden py-2 touch-pan-y" autoScroll loop>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))
          : games.map((game) => (
              <PopularGameCard key={game.id} game={game} />
            ))}
      </DragScrollRow>
    </section>
  )
}