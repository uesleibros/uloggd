import { useEffect, useState } from "react"
import GameCard from "../Game/GameCard"
import DragScrollRow from "../UI/DragScrollRow"

export default function UsersChoiceCarousel() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/igdb?action=users-choice")
      .then(res => res.json())
      .then(data => {
        setGames(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    const skeletons = [...Array(27)]
    return (
      <DragScrollRow
        className="gap-4 overflow-x-hidden py-2 touch-pan-y"
        autoScroll
        autoScrollSpeed={0.04}
        loop
      >
        {skeletons.map((_, i) => (
          <div key={i} className="w-32 h-44 bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
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
