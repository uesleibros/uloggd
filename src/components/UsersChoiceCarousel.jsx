import { useEffect, useState, useRef } from "react"
import GameCard from "./GameCard"
import DragScrollRow from "./DragScrollRow"

export default function UsersChoiceCarousel() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const carouselRef = useRef(null)

  useEffect(() => {
    fetch("/api/igdb/users-choice")
      .then(res => res.json())
      .then(data => {
        setGames([...data, ...data, ...data])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!carouselRef.current || loading) return
    carouselRef.current.scrollLeft = carouselRef.current.scrollWidth / 3
  }, [loading])

  useEffect(() => {
    if (loading || isPaused || !carouselRef.current) return

    const carousel = carouselRef.current
    const sectionWidth = carousel.scrollWidth / 3

    const interval = setInterval(() => {
      carousel.scrollLeft += 0.5
      if (carousel.scrollLeft >= sectionWidth * 2) carousel.scrollLeft -= sectionWidth
      if (carousel.scrollLeft <= 0) carousel.scrollLeft += sectionWidth
    }, 20)

    return () => clearInterval(interval)
  }, [loading, isPaused])

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden py-2">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="w-32 h-44 bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
        ))}
      </div>
    )
  }

  return (
    <DragScrollRow
      ref={carouselRef}
      className="gap-4 overflow-x-hidden py-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {games.map((game, index) => (
        <GameCard
          key={`${game.id}-${index}`}
          game={game}
          draggable={false}
        />
      ))}
    </DragScrollRow>
  )
}