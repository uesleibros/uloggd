import { useEffect, useState, useRef, useCallback } from "react"
import GameCard from "./GameCard"

export default function UsersChoiceCarousel() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  const carouselRef = useRef(null)
  const autoScrollRef = useRef(null)
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false
  })

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
    const carousel = carouselRef.current
    carousel.scrollLeft = carousel.scrollWidth / 3
  }, [loading])

  useEffect(() => {
    if (loading || isPaused || !carouselRef.current) return

    const carousel = carouselRef.current
    const sectionWidth = carousel.scrollWidth / 3

    autoScrollRef.current = setInterval(() => {
      if (dragRef.current.isDown) return

      carousel.scrollLeft += 0.5

      if (carousel.scrollLeft >= sectionWidth * 2) {
        carousel.scrollLeft -= sectionWidth
      }

      if (carousel.scrollLeft <= 0) {
        carousel.scrollLeft += sectionWidth
      }
    }, 20)

    return () => clearInterval(autoScrollRef.current)
  }, [loading, isPaused])

  const handlePointerDown = useCallback((e) => {
    const carousel = carouselRef.current
    if (!carousel) return

    const pageX = e.type === "touchstart" ? e.touches[0].pageX : e.pageX

    dragRef.current = {
      isDown: true,
      startX: pageX,
      scrollLeft: carousel.scrollLeft,
      hasMoved: false
    }
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.isDown) return

    const carousel = carouselRef.current
    if (!carousel) return

    const pageX = e.type === "touchmove" ? e.touches[0].pageX : e.pageX
    const diff = pageX - dragRef.current.startX

    if (Math.abs(diff) > 5) {
      dragRef.current.hasMoved = true

      if (e.type === "mousemove") {
        e.preventDefault()
      }
    }

    carousel.scrollLeft = dragRef.current.scrollLeft - diff

    const sectionWidth = carousel.scrollWidth / 3
    if (carousel.scrollLeft >= sectionWidth * 2) {
      carousel.scrollLeft -= sectionWidth
      dragRef.current.scrollLeft -= sectionWidth
    }
    if (carousel.scrollLeft <= 0) {
      carousel.scrollLeft += sectionWidth
      dragRef.current.scrollLeft += sectionWidth
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current.isDown = false
  }, [])

  const handleClick = useCallback((e) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault()
    }
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
    <div
      ref={carouselRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={() => {
        handlePointerUp()
        setIsPaused(false)
      }}
      onMouseEnter={() => setIsPaused(true)}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      className="flex gap-4 overflow-x-hidden select-none py-2"
    >
      {games.map((game, index) => (
        <GameCard
          key={`${game.id}-${index}`}
          game={game}
          onClick={handleClick}
          draggable={false}
        />
      ))}
    </div>
  )
}