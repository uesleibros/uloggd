import { useCallback, useEffect, useRef } from "react"

const listeners = new Set()

export function emitJournalUpdate() {
  listeners.forEach((fn) => fn())
}

export function useJournalEvents(callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const handler = () => callbackRef.current?.()
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [])
}
