import { useState, useEffect } from "react"
import { createPortal } from "react-dom"

const DROPDOWN_WIDTH = 160
const EDGE_MARGIN = 8

export function PortalDropdown({ anchorRef, open, onClose, children }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !anchorRef.current) return

    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      let left = rect.left

      if (left + DROPDOWN_WIDTH > window.innerWidth - EDGE_MARGIN) {
        left = window.innerWidth - DROPDOWN_WIDTH - EDGE_MARGIN
      }
      if (left < EDGE_MARGIN) left = EDGE_MARGIN

      setPos({ top: rect.bottom + 4, left })
    }

    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)

    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return

    const handler = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      onClose()
    }

    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose, anchorRef])

  if (!open) return null

  return createPortal(
    <div
      className="fixed z-[9999] bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[150px]"
      style={{ top: pos.top, left: pos.left }}
    >
      {children}
    </div>,
    document.body
  )
}
