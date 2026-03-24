import { useState, useEffect, useRef, useMemo } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import { GripVertical, Check, ChevronUp, ChevronDown, Search, Loader2 } from "lucide-react"

export default function ReorderModal({ isOpen, onClose, listId, onReordered }) {
  const { t } = useTranslation()
  const [allItems, setAllItems] = useState([])
  const [originalOrder, setOriginalOrder] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const [editingItemId, setEditingItemId] = useState(null)
  const [editValue, setEditValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const listRef = useRef(null)

  const allSlugs = useMemo(() => allItems.map((i) => i.game_slug), [allItems])
  const { getGame } = useGamesBatch(allSlugs)

  useEffect(() => {
    if (!isOpen || !listId) return

    async function fetchAllItems() {
      setLoading(true)
      setSearchQuery("")
      setEditingItemId(null)
      try {
        const params = new URLSearchParams({ listId, page: 1, limit: 9999 })
        const r = await fetch(`/api/lists/get?${params}`)
        if (!r.ok) throw new Error()
        const data = await r.json()
        const items = data.list_items || []
        setAllItems(items)
        setOriginalOrder(items.map((i) => i.id))
      } catch {
        setAllItems([])
        setOriginalOrder([])
      } finally {
        setLoading(false)
      }
    }

    fetchAllItems()
  }, [isOpen, listId])

  const displayItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems
    const q = searchQuery.toLowerCase()
    return allItems.filter((item) => {
      const game = getGame(item.game_slug)
      const name = game?.name || item.game_slug
      return name.toLowerCase().includes(q)
    })
  }, [allItems, searchQuery, getGame])

  const isFiltered = searchQuery.trim().length > 0

  function getActualIndex(item) {
    return allItems.findIndex((i) => i.id === item.id)
  }

  function startEditIndex(item) {
    const actualIndex = getActualIndex(item)
    setEditingItemId(item.id)
    setEditValue(String(actualIndex + 1))
  }

  function commitIndexEdit() {
    const target = parseInt(editValue, 10)
    const itemId = editingItemId
    setEditingItemId(null)

    if (!itemId) return
    if (isNaN(target) || target < 1 || target > allItems.length) return

    const currentActualIndex = allItems.findIndex((i) => i.id === itemId)
    if (currentActualIndex === -1) return

    const targetIndex = target - 1
    if (targetIndex === currentActualIndex) return

    const updated = [...allItems]
    const [moved] = updated.splice(currentActualIndex, 1)
    updated.splice(targetIndex, 0, moved)
    setAllItems(updated)
  }

  function handleDragStart(e, index) {
    if (isFiltered) return
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e, index) {
    if (isFiltered) return
    e.preventDefault()
    if (overIndex !== index) setOverIndex(index)
  }

  function handleDrop(e, dropIndex) {
    e.preventDefault()
    if (isFiltered || dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }

    const updated = [...allItems]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setAllItems(updated)
    setDragIndex(null)
    setOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

  function moveItem(item, direction) {
    const actualIndex = getActualIndex(item)
    const toIndex = actualIndex + direction

    if (toIndex < 0 || toIndex >= allItems.length) return

    const updated = [...allItems]
    const [moved] = updated.splice(actualIndex, 1)
    updated.splice(toIndex, 0, moved)
    setAllItems(updated)
  }

  function moveToPosition(item, position) {
    const actualIndex = getActualIndex(item)
    const targetIndex = position === "first" ? 0 : allItems.length - 1

    if (targetIndex === actualIndex) return

    const updated = [...allItems]
    const [moved] = updated.splice(actualIndex, 1)
    updated.splice(targetIndex, 0, moved)
    setAllItems(updated)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/lists/@me/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          listId,
          items: allItems.map((i) => i.id),
        }),
      })

      if (!res.ok) throw new Error()
      onReordered()
      onClose()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = useMemo(() => {
    if (allItems.length !== originalOrder.length) return false
    return allItems.some((item, i) => item.id !== originalOrder[i])
  }, [allItems, originalOrder])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("lists.reorder.title")}
      maxWidth="max-w-lg"
      fullscreenMobile
    >
      <div className="flex flex-col h-full">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="px-5 sm:px-6 pt-4 pb-3 space-y-3 border-b border-zinc-800">
              <p className="text-xs text-zinc-500">{t("lists.reorder.hint")}</p>

              {allItems.length > 10 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("lists.reorder.search")}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              )}

              {isFiltered && (
                <p className="text-xs text-amber-500/80">
                  {t("lists.reorder.filteredHint")}
                </p>
              )}
            </div>

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto px-5 sm:px-6 min-h-0 max-h-[55vh] md:max-h-[400px]"
            >
              {displayItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-500">
                  {t("lists.reorder.noResults")}
                </div>
              ) : (
                displayItems.map((item, index) => {
                  const game = getGame(item.game_slug)
                  const coverUrl = game?.cover?.url ? `https:${game.cover.url}` : null
                  const isDragging = dragIndex === index
                  const isOver = overIndex === index
                  const actualIndex = getActualIndex(item)
                  const isEditing = editingItemId === item.id

                  return (
                    <div
                      key={item.id}
                      draggable={!isFiltered}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0 transition-all select-none ${
                        isDragging ? "opacity-40" : ""
                      } ${isOver && !isDragging ? "border-t-2 border-t-indigo-500" : ""}`}
                    >
                      <div
                        className={`p-1 text-zinc-600 ${
                          isFiltered
                            ? "opacity-30 cursor-not-allowed"
                            : "cursor-grab active:cursor-grabbing hover:text-zinc-400"
                        }`}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
                          onBlur={commitIndexEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur()
                            if (e.key === "Escape") setEditingItemId(null)
                          }}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                          className="w-10 h-6 text-xs text-center text-white bg-zinc-800 border border-indigo-500 rounded outline-none tabular-nums flex-shrink-0"
                        />
                      ) : (
                        <button
                          onClick={() => startEditIndex(item)}
                          className="text-xs text-zinc-600 hover:text-indigo-400 tabular-nums w-10 h-6 text-center flex-shrink-0 cursor-pointer rounded hover:bg-zinc-800/80 transition-colors flex items-center justify-center"
                          title={t("lists.reorder.clickToEdit")}
                        >
                          {actualIndex + 1}
                        </button>
                      )}

                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt=""
                          className="h-10 w-7 rounded object-cover bg-zinc-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-7 rounded bg-zinc-800 flex-shrink-0" />
                      )}

                      <span className="text-sm text-white truncate flex-1 min-w-0">
                        {game?.name || item.game_slug}
                      </span>

                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => moveToPosition(item, "first")}
                          disabled={actualIndex === 0}
                          className="p-1.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer rounded hover:bg-zinc-800"
                          title={t("lists.reorder.moveToFirst")}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveItem(item, -1)}
                          disabled={actualIndex === 0}
                          className="p-1.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer rounded hover:bg-zinc-800"
                          title={t("lists.reorder.moveUp")}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveItem(item, 1)}
                          disabled={actualIndex === allItems.length - 1}
                          className="p-1.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer rounded hover:bg-zinc-800"
                          title={t("lists.reorder.moveDown")}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveToPosition(item, "last")}
                          disabled={actualIndex === allItems.length - 1}
                          className="p-1.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer rounded hover:bg-zinc-800"
                          title={t("lists.reorder.moveToLast")}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-zinc-800 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-zinc-600 tabular-nums">
                {t("lists.reorder.totalItems", { count: allItems.length })}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  {t("lists.reorder.cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t("lists.reorder.save")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}