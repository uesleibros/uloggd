import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import { GripVertical, Check } from "lucide-react"

export default function ReorderModal({ isOpen, onClose, items, getGame, listId, onReordered }) {
  const [orderedItems, setOrderedItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const touchItemIndex = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setOrderedItems([...items])
      setSaving(false)
    }
  }, [isOpen, items])

  function handleDragStart(e, index) {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index)
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (overIndex !== index) setOverIndex(index)
  }

  function handleDrop(e, dropIndex) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }

    const updated = [...orderedItems]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setOrderedItems(updated)
    setDragIndex(null)
    setOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

  function handleTouchStart(e, index) {
    touchItemIndex.current = index
  }

  function handleTouchMove(e) {
    if (touchItemIndex.current === null || !listRef.current) return

    const touch = e.touches[0]
    const elements = listRef.current.querySelectorAll("[data-reorder-item]")
    let targetIndex = null

    elements.forEach((el, i) => {
      const rect = el.getBoundingClientRect()
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        targetIndex = i
      }
    })

    if (targetIndex !== null && targetIndex !== overIndex) {
      setOverIndex(targetIndex)
    }
  }

  function handleTouchEnd() {
    if (touchItemIndex.current !== null && overIndex !== null && touchItemIndex.current !== overIndex) {
      const updated = [...orderedItems]
      const [moved] = updated.splice(touchItemIndex.current, 1)
      updated.splice(overIndex, 0, moved)
      setOrderedItems(updated)
    }

    touchItemIndex.current = null
    setOverIndex(null)
  }

  function moveItem(fromIndex, direction) {
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= orderedItems.length) return

    const updated = [...orderedItems]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    setOrderedItems(updated)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/lists/@me/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          listId,
          items: orderedItems.map(i => i.id),
        }),
      })

      if (!res.ok) throw new Error()
      onReordered(orderedItems)
      onClose()
    } catch {} finally {
      setSaving(false)
    }
  }

  const hasChanges = useMemo(() => {
    return orderedItems.some((item, i) => item.id !== items[i]?.id)
  }, [orderedItems, items])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reordenar jogos" maxWidth="max-w-lg" fullscreenMobile showMobileGrip>
      <div className="flex flex-col h-full">
        <div className="px-5 sm:px-6 pt-2 pb-3">
          <p className="text-xs text-zinc-500">Arraste para reordenar ou use as setas.</p>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-5 sm:px-6 min-h-0 max-h-[55vh] md:max-h-96"
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {orderedItems.map((item, index) => {
            const game = getGame(item.game_slug)
            const coverUrl = game?.cover?.url
              ? `https:${game.cover.url}`
              : null
            const isDragging = dragIndex === index
            const isOver = overIndex === index

            return (
              <div
                key={item.id}
                data-reorder-item
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={e => handleTouchStart(e, index)}
                className={`flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0 transition-all select-none ${
                  isDragging ? "opacity-40" : ""
                } ${isOver && !isDragging ? "border-t-2 border-t-indigo-500" : ""}`}
              >
                <div className="cursor-grab active:cursor-grabbing touch-manipulation p-1 text-zinc-600 hover:text-zinc-400">
                  <GripVertical className="w-4 h-4" />
                </div>

                <span className="text-xs text-zinc-600 tabular-nums w-5 text-center flex-shrink-0">
                  {index + 1}
                </span>

                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-10 w-7 rounded object-cover bg-zinc-800 flex-shrink-0" />
                ) : (
                  <div className="h-10 w-7 rounded bg-zinc-800 flex-shrink-0" />
                )}

                <span className="text-sm text-white truncate flex-1 min-w-0">
                  {game?.name || item.game_slug}
                </span>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer rounded hover:bg-zinc-800"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === orderedItems.length - 1}
                    className="p-1.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer rounded hover:bg-zinc-800"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-zinc-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Salvar ordem
          </button>
        </div>
      </div>
    </Modal>
  )
}