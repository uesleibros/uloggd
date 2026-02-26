import { useEffect, useState } from "react"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import DragScrollRow from "@components/UI/DragScrollRow"

export default function UsersChoiceCarousel() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/igdb/usersChoice")
      .then(res => res.json())
      .then(data => {
        setGames(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
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


