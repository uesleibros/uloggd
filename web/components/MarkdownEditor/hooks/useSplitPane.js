import { useState, useRef, useEffect, useCallback } from "react"

export function useSplitPane(initialPosition = 50, bounds = { min: 20, max: 80 }) {
  const [position, setPosition] = useState(initialPosition)
  const containerRef = useRef(null)
  const isDragging = useRef(false)

  const handleStart = useCallback((e) => {
    isDragging.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    e.preventDefault()
  }, [])

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging.current || !containerRef.current) return
      e.preventDefault()

      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const rect = containerRef.current.getBoundingClientRect()
      const pos = ((clientX - rect.left) / rect.width) * 100

      setPosition(Math.min(Math.max(pos, bounds.min), bounds.max))
    }

    const handleEnd = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleEnd)
    window.addEventListener("touchmove", handleMove, { passive: false })
    window.addEventListener("touchend", handleEnd)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleEnd)
      window.removeEventListener("touchmove", handleMove)
      window.removeEventListener("touchend", handleEnd)
    }
  }, [bounds])

  return { position, containerRef, handleStart }
}
