import { useEffect, useState, useRef, useCallback } from "react"
import GameCard from "./GameCard"
import DragScrollRow from "./DragScrollRow"

export default function UsersChoiceCarousel() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  const carouselRef = useRef(null)
  const rafRef = useRef(null)
  const virtualScrollLeft = useRef(0)
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const directionDecided = useRef(false)
  const isHorizontalSwipe = useRef(false)

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
    const initialPos = carousel.scrollWidth / 3
    carousel.scrollLeft = initialPos
    virtualScrollLeft.current = initialPos
  }, [loading])

  const normalizeScroll = useCallback(() => {
    const carousel = carouselRef.current
    if (!carousel) return

    const sectionWidth = carousel.scrollWidth / 3
    if (sectionWidth === 0) return

    if (virtualScrollLeft.current >= sectionWidth * 2) {
      virtualScrollLeft.current -= sectionWidth
      carousel.scrollLeft = virtualScrollLeft.current
    } else if (virtualScrollLeft.current <= 0) {
      virtualScrollLeft.current += sectionWidth
      carousel.scrollLeft = virtualScrollLeft.current
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

      virtualScrollLeft.current += 0.04 * delta
      carousel.scrollLeft = Math.floor(virtualScrollLeft.current)
      normalizeScroll()
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loading, isPaused, normalizeScroll])

  const syncVirtualScroll = useCallback(() => {
    if (carouselRef.current) {
      virtualScrollLeft.current = carouselRef.current.scrollLeft
    }
  }, [])

  useEffect(() => {
    const handleVisibility = () => setIsPaused(document.hidden)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  useEffect(() => {
    if (loading) return

    const handleResize = () => {
      const carousel = carouselRef.current
      if (!carousel) return
      const newPos = carousel.scrollWidth / 3
      carousel.scrollLeft = newPos
      virtualScrollLeft.current = newPos
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [loading])

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    directionDecided.current = false
    isHorizontalSwipe.current = false
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (directionDecided.current) return

    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartX.current)
    const dy = Math.abs(touch.clientY - touchStartY.current)

    if (dx + dy < 10) return

    directionDecided.current = true

    if (dx > dy) {
      isHorizontalSwipe.current = true
      setIsPaused(true)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (isHorizontalSwipe.current) {
      syncVirtualScroll()
      normalizeScroll()
      setTimeout(() => setIsPaused(false), 100)
    }
    directionDecided.current = false
    isHorizontalSwipe.current = false
  }, [syncVirtualScroll, normalizeScroll])

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
      onMouseLeave={() => {
        syncVirtualScroll()
        setIsPaused(false)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
