import { useEffect, useState, useRef } from "react"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import DragScrollRow from "@components/UI/DragScrollRow"

export default function UsersChoiceCarousel() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return

    let cancelled = false

    fetch("/api/igdb/usersChoice")
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setGames(data)
          setLoading(false)
          fetchedRef.current = true
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <DragScrollRow
        className="gap-4 overflow-x-hidden py-2 touch-pan-y"
        autoScroll
        autoScrollSpeed={0.04}
        loop
      >
        {[...Array(27)].map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </DragScrollRow>
    )
  }

  const tripled = [...games, ...games, ...games]

  return (
    <DragScrollRow
      className="gap-4 overflow-x-hidden py-2 touch-pan-y"
      autoScroll
      autoScrollSpeed={0.04}
      loop
    >
      {tripled.map((game, index) => (
        <GameCard
          key={`${game.id}-${index}`}
          game={game}
          draggable={false}
        />
      ))}
    </DragScrollRow>
  )
}