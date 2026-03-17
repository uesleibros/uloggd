// hooks/useReviewEvents.js
import { useEffect } from "react"

const listeners = new Set()

export function emitReviewUpdate(gameId) {
  listeners.forEach(fn => fn(gameId))
}

export function useReviewEvents(callback, gameId = null) {
  useEffect(() => {
    const handler = (updatedGameId) => {
      if (!gameId || gameId === updatedGameId) {
        callback()
      }
    }
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [callback, gameId])
}
