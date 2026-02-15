import { useEffect, useState, useRef, useCallback } from "react"
import GameCard from "./GameCard"
import DragScrollRow from "./DragScrollRow"

export default function UsersChoiceCarousel() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const carouselRef = useRef(null)
  const rafRef = useRef(null)

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

  const normalizeScroll = useCallback(() => {
    const carousel = carouselRef.current
    if (!carousel) return

    const sectionWidth = carousel.scrollWidth / 3

    if (carousel.scrollLeft >= sectionWidth * 2) {
      carousel.scrollLeft -= sectionWidth
    } else if (carousel.scrollLeft <= 0) {
      carousel.scrollLeft += sectionWidth
    }
  }, [])

  useEffect(() => {
    if (loading || isPaused || !carouselRef.current) return

    let lastTime = performance.now()

    function step(now) {
      const delta = now - lastTime
      lastTime = now

      const carousel = carouselRef.current
      if (!carousel) return

      carousel.scrollLeft += 0.03 * delta
      normalizeScroll()

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [loading, isPaused, normalizeScroll])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

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
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onScrollEnd={normalizeScroll}
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