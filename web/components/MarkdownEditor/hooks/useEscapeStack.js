import { useEffect } from "react"

export function useEscapeStack(handlers) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return

      for (const { active, onClose } of handlers) {
        if (active) {
          onClose()
          e.stopPropagation()
          return
        }
      }
    }

    document.addEventListener("keydown", handler, true)
    return () => document.removeEventListener("keydown", handler, true)
  }, [handlers])
}
