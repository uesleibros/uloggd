import { useState, useEffect, useMemo, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToWindowEdges } from "@dnd-kit/modifiers"
import {
  Plus, Trash2, Palette, Gamepad2, Search, X,
  ArrowUpDown, GripVertical,
} from "lucide-react"
import GameCard from "@components/Game/GameCard"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
  "#14b8a6", "#f43f5e", "#a855f7", "#84cc16",
]

const TIER_SORT_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
  { value: "newest", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
]

const CARD_SIZE = "w-[56px] h-[75px] sm:w-[75px] sm:h-[100px]"
const TIER_MIN_H = "min-h-[91px] sm:min-h-[116px]"

function getCoverUrl(game) {
  if (!game?.cover?.url) return null
  const url = game.cover.url.startsWith("http") ? game.cover.url : `https:${game.cover.url}`
  return url.replace("t_thumb", "t_cover_small")
}

function tierlistCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    const itemHits = pointerCollisions.filter(
      (c) => !String(c.id).startsWith("tier-") &&
             !String(c.id).startsWith("tier-row-") &&
             c.id !== "untiered-zone"
    )
    if (itemHits.length > 0) {
      if (itemHits.length === 1) return itemHits
      const subset = args.droppableContainers.filter((c) =>
        itemHits.some((h) => h.id === c.id)
      )
      return closestCenter({ ...args, droppableContainers: subset })
    }
    return pointerCollisions
  }
  const containers = args.droppableContainers.filter(
    (c) => String(c.id).startsWith("tier-") || c.id === "untiered-zone"
  )
  if (containers.length === 0) return []
  return closestCenter({ ...args, droppableContainers: containers })
}

function CardSkeleton() {
  return <div className={`${CARD_SIZE} rounded-lg bg-zinc-800 animate-pulse flex-shrink-0`} />
}

function TierSkeleton() {
  return (
    <div className="flex border rounded-xl overflow-hidden bg-zinc-900/50 border-zinc-700/80">
      <div className={`w-20 sm:w-28 md:w-32 flex-shrink-0 bg-zinc-700 animate-pulse ${TIER_MIN_H}`} />
      <div className="flex-1 p-2 sm:p-2.5 bg-zinc-800/40 flex items-center gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function TierlistSkeleton() {
  return (
    <div className="space-y-2 sm:space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <TierSkeleton key={i} />
      ))}
    </div>
  )
}

function DropIndicator() {
  return (
    <div className={`${CARD_SIZE} rounded-lg border-2 border-dashed border-indigo-400/40 bg-indigo-500/10 flex-shrink-0`} />
  )
}

function GameCover({ game }) {
  const coverUrl = getCoverUrl(game)
  return (
    <div className={`${CARD_SIZE} rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0`} title={game?.name}>
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={game?.name || ""}
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-zinc-500" />
        </div>
      )}
    </div>
  )
}

function SortableGameItem({ id, game, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id })

  const isActive = isDragging || isSortableDragging

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const coverUrl = getCoverUrl(game)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${CARD_SIZE} rounded-lg overflow-hidden bg-zinc-800 select-none cursor-grab active:cursor-grabbing flex-shrink-0 ${
        isActive
          ? "opacity-30 ring-2 ring-indigo-500/40 z-10"
          : "hover:ring-2 hover:ring-zinc-500"
      }`}
      title={game?.name}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={game?.name || ""}
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-zinc-500" />
        </div>
      )}
    </div>
  )
}

function SortableUntieredItem({ id, game, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id })

  const isActive = isDragging || isSortableDragging

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const coverUrl = getCoverUrl(game)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${CARD_SIZE} relative rounded-lg overflow-hidden bg-zinc-800 select-none cursor-grab active:cursor-grabbing flex-shrink-0 ${
        isActive
          ? "opacity-30 ring-2 ring-indigo-500/40 z-10"
          : "hover:ring-2 hover:ring-zinc-500"
      }`}
      title={game?.name}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={game?.name || ""}
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-zinc-500" />
        </div>
      )}
      {game?.name && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1 pt-3">
          <p className="text-[8px] sm:text-[9px] text-white font-medium leading-tight line-clamp-2 text-center">
            {game.name}
          </p>
        </div>
      )}
    </div>
  )
}

function ViewTier({ tier, items, getGame }) {
  return (
    <div
      className="flex border rounded-xl overflow-hidden bg-zinc-900/50 border-zinc-700/80"
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className={`w-16 sm:w-24 md:w-28 flex-shrink-0 flex items-center justify-center text-white p-1.5 ${TIER_MIN_H}`}
        style={{ backgroundColor: tier.color }}
      >
        <span className="select-none text-center leading-tight break-words hyphens-auto font-bold text-[11px] sm:text-sm md:text-base max-w-full overflow-hidden">
          {tier.label}
        </span>
      </div>
      <div className="flex-1 p-2 sm:p-2.5 bg-zinc-800/40">
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {items.map((item) => {
              const game = getGame(item.game_slug)
              if (!game) return null
              return (
                <div key={item.id} draggable={false} className="select-none">
                  <GameCover game={game} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className={`w-full flex items-center justify-center ${TIER_MIN_H}`}>
            <span className="text-xs text-zinc-600 select-none">Vazio</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SortableTierRow({
  tier,
  items,
  getGame,
  activeId,
  activeDragType,
  isTargeted,
  onEditTier,
  onDeleteTier,
  onSortTier,
  tierSort,
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `tier-row-${tier.id}` })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `tier-${tier.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isHighlighted = (isTargeted || isOver) && activeDragType === "game"
  const hasContent = items.length > 0 || isTargeted

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`flex border rounded-xl overflow-hidden bg-zinc-900/50 transition-[border-color,background-color,box-shadow] duration-200 ${
        isDragging
          ? "opacity-40 ring-2 ring-indigo-500/30 z-20"
          : isHighlighted
          ? "border-indigo-400/70 bg-indigo-500/5 shadow-[0_0_12px_rgba(99,102,241,0.08)]"
          : "border-zinc-700/80"
      }`}
    >
      <div
        className={`w-20 sm:w-28 md:w-32 flex-shrink-0 flex flex-col items-center justify-center text-white p-1.5 gap-1 ${TIER_MIN_H}`}
        style={{ backgroundColor: tier.color }}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-black/20 rounded transition-colors touch-none"
        >
          <GripVertical className="w-3.5 h-3.5 opacity-60" />
        </div>

        <span className="select-none text-center leading-tight break-words hyphens-auto font-bold text-[11px] sm:text-sm md:text-base max-w-full overflow-hidden">
          {tier.label}
        </span>

        <div className="flex items-center gap-0.5 flex-wrap justify-center">
          <button
            onClick={() => onEditTier(tier)}
            className="p-1 hover:bg-black/30 rounded transition-colors cursor-pointer"
          >
            <Palette className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDeleteTier(tier.id)}
            className="p-1 hover:bg-red-500/50 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        <select
          value={tierSort}
          onChange={(e) => onSortTier(tier.id, e.target.value)}
          className="w-full max-w-[5rem] text-[9px] sm:text-[10px] bg-black/30 border border-white/10 rounded px-0.5 py-0.5 text-white cursor-pointer focus:outline-none"
        >
          {TIER_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={setDropRef}
        className="flex-1 p-2 sm:p-2.5 bg-zinc-800/40"
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          {hasContent ? (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {items.map((item) => (
                <SortableGameItem
                  key={item.id}
                  id={item.id}
                  game={getGame(item.game_slug)}
                  isDragging={activeId === item.id}
                />
              ))}
              {isTargeted && <DropIndicator />}
            </div>
          ) : (
            <div className={`w-full flex items-center justify-center ${TIER_MIN_H}`}>
              <span className="text-xs text-zinc-600 select-none">
                Arraste jogos para cá
              </span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

function UntieredZone({
  games,
  getGame,
  activeId,
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "untiered-zone",
  })

  const sortedAndFilteredGames = useMemo(() => {
    let result = [...games]

    if (sortOrder === "az") {
      result.sort((a, b) => {
        const nameA = getGame(a.game_slug)?.name || ""
        const nameB = getGame(b.game_slug)?.name || ""
        return nameA.localeCompare(nameB)
      })
    } else if (sortOrder === "za") {
      result.sort((a, b) => {
        const nameA = getGame(a.game_slug)?.name || ""
        const nameB = getGame(b.game_slug)?.name || ""
        return nameB.localeCompare(nameA)
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((g) => {
        const game = getGame(g.game_slug)
        return game?.name?.toLowerCase().includes(query)
      })
    }

    return result
  }, [games, searchQuery, sortOrder, getGame])

  return (
    <div className="mt-6 sm:mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-zinc-500" />
          <p className="text-sm text-zinc-400 font-medium">
            Jogos não classificados
            <span className="text-zinc-600 ml-1.5">
              ({sortedAndFilteredGames.length}
              {searchQuery && ` de ${games.length}`})
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar jogo..."
              className="w-full pl-9 pr-9 py-2.5 sm:py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative flex-shrink-0">
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value)}
              className="pl-8 pr-3 py-2.5 sm:py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
            >
              <option value="default">Padrão</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
            </select>
          </div>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`border-2 border-dashed rounded-xl p-3 sm:p-4 transition-[border-color,background-color] duration-200 ${
          isOver
            ? "border-indigo-500/50 bg-indigo-500/5"
            : "border-zinc-700/60 bg-zinc-800/20"
        }`}
      >
        {sortedAndFilteredGames.length > 0 ? (
          <SortableContext
            items={sortedAndFilteredGames.map((g) => `untiered-${g.game_slug}`)}
            strategy={rectSortingStrategy}
          >
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {sortedAndFilteredGames.map((g) => {
                const game = getGame(g.game_slug)
                const itemId = `untiered-${g.game_slug}`
                return (
                  <SortableUntieredItem
                    key={itemId}
                    id={itemId}
                    game={game}
                    isDragging={activeId === itemId}
                  />
                )
              })}
            </div>
          </SortableContext>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 sm:py-10 gap-2">
            {searchQuery ? (
              <>
                <Search className="w-8 h-8 text-zinc-700" />
                <p className="text-sm text-zinc-600">Nenhum jogo encontrado</p>
                <button
                  onClick={() => onSearchChange("")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Limpar busca
                </button>
              </>
            ) : (
              <>
                <Gamepad2 className="w-8 h-8 text-zinc-700" />
                <p className="text-sm text-zinc-600">
                  Todos os jogos foram classificados!
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EditTierModal({ isOpen, onClose, tier, onSave }) {
  const [label, setLabel] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])

  useEffect(() => {
    if (tier) {
      setLabel(tier.label || "")
      setColor(tier.color || PRESET_COLORS[0])
    }
  }, [tier])

  if (!isOpen) return null

  function handleSave() {
    if (!label.trim()) return
    onSave({ ...tier, label: label.trim(), color })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-zinc-900 border border-zinc-700 sm:rounded-xl rounded-t-2xl p-5 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center sm:hidden mb-3">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-4">Editar tier</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Nome</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              maxLength={30}
              className="w-full px-4 py-3 sm:py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center text-lg font-bold focus:outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
            <span className="text-xs text-zinc-600 mt-1.5 block text-right">
              {label.length}/30
            </span>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Cor</label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`aspect-square rounded-lg transition-all cursor-pointer ${
                    color === c
                      ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-zinc-500">Cor personalizada:</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 sm:py-2.5 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!label.trim()}
            className="flex-1 py-3 sm:py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TierlistEditor({
  tiers,
  setTiers,
  items,
  setItems,
  untieredGames,
  getGame,
  isEditing = true,
  isLoading = false,
}) {
  const [activeId, setActiveId] = useState(null)
  const [activeDragType, setActiveDragType] = useState(null)
  const [editingTier, setEditingTier] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState("default")
  const [targetTier, setTargetTier] = useState(null)
  const [tierSorts, setTierSorts] = useState({})
  const targetRef = useRef(null)
  const [untieredOrder, setUntieredOrder] = useState(() =>
    untieredGames.map((g) => g.game_slug)
  )

  useEffect(() => {
    setUntieredOrder((prev) => {
      const currentSlugs = new Set(untieredGames.map((g) => g.game_slug))
      const kept = prev.filter((slug) => currentSlugs.has(slug))
      const keptSet = new Set(kept)
      const added = untieredGames
        .filter((g) => !keptSet.has(g.game_slug))
        .map((g) => g.game_slug)
      return [...kept, ...added]
    })
  }, [untieredGames])

  const orderedUntieredGames = useMemo(() => {
    const slugMap = new Map(untieredGames.map((g) => [g.game_slug, g]))
    return untieredOrder.map((slug) => slugMap.get(slug)).filter(Boolean)
  }, [untieredGames, untieredOrder])

  useEffect(() => {
    if (!isEditing) return
    function handleBeforeUnload(e) {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isEditing])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 12 } })
  )

  function sortTierItems(tierItems, tierId) {
    const sortMode = tierSorts[tierId] || "manual"
    if (sortMode === "manual") return tierItems

    const sorted = [...tierItems]
    switch (sortMode) {
      case "az":
        sorted.sort((a, b) => {
          const na = getGame(a.game_slug)?.name || ""
          const nb = getGame(b.game_slug)?.name || ""
          return na.localeCompare(nb)
        })
        break
      case "za":
        sorted.sort((a, b) => {
          const na = getGame(a.game_slug)?.name || ""
          const nb = getGame(b.game_slug)?.name || ""
          return nb.localeCompare(na)
        })
        break
      case "newest":
        sorted.sort((a, b) => {
          const da = getGame(a.game_slug)?.first_release_date || 0
          const db = getGame(b.game_slug)?.first_release_date || 0
          return db - da
        })
        break
      case "oldest":
        sorted.sort((a, b) => {
          const da = getGame(a.game_slug)?.first_release_date || 0
          const db = getGame(b.game_slug)?.first_release_date || 0
          return da - db
        })
        break
    }
    return sorted
  }

  function handleSortTier(tierId, sortMode) {
    setTierSorts((prev) => ({ ...prev, [tierId]: sortMode }))
    if (sortMode !== "manual") {
      setItems((prev) => {
        const tierItems = prev.filter((i) => i.tier_id === tierId)
        const rest = prev.filter((i) => i.tier_id !== tierId)
        const sorted = sortTierItems(tierItems, tierId)
        const reindexed = sorted.map((item, idx) => ({ ...item, position: idx }))
        return [...rest, ...reindexed].map((item, idx) => ({ ...item, position: idx }))
      })
    }
  }

  function getDragType(id) {
    if (String(id).startsWith("tier-row-")) return "tier"
    return "game"
  }

  function handleDragStart(event) {
    const type = getDragType(event.active.id)
    setActiveId(event.active.id)
    setActiveDragType(type)
  }

  function handleDragOver(event) {
    const { active, over } = event
    if (activeDragType === "tier") return

    if (!over) {
      if (targetRef.current !== null) {
        targetRef.current = null
        setTargetTier(null)
      }
      return
    }

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    if (overIdStr === "untiered-zone" || overIdStr.startsWith("untiered-")) {
      if (targetRef.current !== null) {
        targetRef.current = null
        setTargetTier(null)
      }
      return
    }

    let tierId = null
    if (overIdStr.startsWith("tier-row-")) {
      tierId = overIdStr.replace("tier-row-", "")
    } else if (overIdStr.startsWith("tier-")) {
      tierId = overIdStr.replace("tier-", "")
    } else {
      const overItem = items.find((i) => i.id === overIdStr)
      if (overItem) tierId = overItem.tier_id
    }

    if (!tierId) {
      if (targetRef.current !== null) {
        targetRef.current = null
        setTargetTier(null)
      }
      return
    }

    const isFromUntiered = activeIdStr.startsWith("untiered-")
    if (!isFromUntiered) {
      const activeItem = items.find((i) => i.id === activeIdStr)
      if (activeItem?.tier_id === tierId) {
        if (targetRef.current !== null) {
          targetRef.current = null
          setTargetTier(null)
        }
        return
      }
    }

    if (targetRef.current !== tierId) {
      targetRef.current = tierId
      setTargetTier(tierId)
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event
    const dragType = activeDragType

    setActiveId(null)
    setActiveDragType(null)
    setTargetTier(null)
    targetRef.current = null

    if (!over) return

    if (dragType === "tier") {
      const activeIdStr = String(active.id)
      const overIdStr = String(over.id)
      const activeTierId = activeIdStr.replace("tier-row-", "")
      let overTierId = null

      if (overIdStr.startsWith("tier-row-")) {
        overTierId = overIdStr.replace("tier-row-", "")
      } else if (overIdStr.startsWith("tier-")) {
        overTierId = overIdStr.replace("tier-", "")
      }

      if (overTierId && activeTierId !== overTierId) {
        setTiers((prev) => {
          const fromIdx = prev.findIndex((t) => t.id === activeTierId)
          const toIdx = prev.findIndex((t) => t.id === overTierId)
          if (fromIdx === -1 || toIdx === -1) return prev
          return arrayMove(prev, fromIdx, toIdx).map((t, idx) => ({
            ...t,
            position: idx,
          }))
        })
      }
      return
    }

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    const isFromUntiered = activeIdStr.startsWith("untiered-")
    const gameSlug = isFromUntiered
      ? activeIdStr.replace("untiered-", "")
      : items.find((i) => i.id === activeIdStr)?.game_slug

    if (!gameSlug) return

    if (overIdStr === "untiered-zone" || overIdStr.startsWith("untiered-")) {
      if (!isFromUntiered) {
        setItems((prev) => prev.filter((i) => i.game_slug !== gameSlug))
      } else if (overIdStr.startsWith("untiered-")) {
        const overSlug = overIdStr.replace("untiered-", "")
        if (gameSlug !== overSlug) {
          setUntieredOrder((prev) => {
            const from = prev.indexOf(gameSlug)
            const to = prev.indexOf(overSlug)
            if (from === -1 || to === -1) return prev
            return arrayMove(prev, from, to)
          })
        }
      }
      return
    }

    let dropTierId = null
    let overItemId = null

    if (overIdStr.startsWith("tier-row-")) {
      dropTierId = overIdStr.replace("tier-row-", "")
    } else if (overIdStr.startsWith("tier-")) {
      dropTierId = overIdStr.replace("tier-", "")
    } else {
      const overItem = items.find((i) => i.id === overIdStr)
      if (overItem) {
        dropTierId = overItem.tier_id
        overItemId = overItem.id
      }
    }

    if (!dropTierId || !tiers.some((t) => t.id === dropTierId)) return

    if (overItemId) {
      const verifyItem = items.find((i) => i.id === overItemId)
      if (!verifyItem || verifyItem.tier_id !== dropTierId) {
        overItemId = null
      }
    }

    setItems((prev) => {
      const existingItem = prev.find((i) => i.game_slug === gameSlug)

      if (existingItem) {
        if (existingItem.tier_id === dropTierId) {
          if (!overItemId || existingItem.id === overItemId) return prev
          const fromIdx = prev.findIndex((i) => i.id === existingItem.id)
          const toIdx = prev.findIndex((i) => i.id === overItemId)
          if (fromIdx === -1 || toIdx === -1) return prev
          return arrayMove(prev, fromIdx, toIdx).map((item, idx) => ({
            ...item,
            position: idx,
          }))
        }

        const withoutItem = prev.filter((i) => i.id !== existingItem.id)
        const movedItem = { ...existingItem, tier_id: dropTierId }

        if (overItemId) {
          const insertAt = withoutItem.findIndex((i) => i.id === overItemId)
          if (insertAt !== -1) {
            withoutItem.splice(insertAt, 0, movedItem)
          } else {
            withoutItem.push(movedItem)
          }
        } else {
          const lastInTier = withoutItem.reduce(
            (last, item, idx) => (item.tier_id === dropTierId ? idx : last),
            -1
          )
          withoutItem.splice(lastInTier + 1, 0, movedItem)
        }

        return withoutItem.map((item, idx) => ({ ...item, position: idx }))
      }

      const game = untieredGames.find((g) => g.game_slug === gameSlug)
      if (!game) return prev

      const newItem = {
        id: crypto.randomUUID(),
        game_id: game.game_id,
        game_slug: game.game_slug,
        tier_id: dropTierId,
        position: 0,
      }

      const newItems = [...prev]
      if (overItemId) {
        const insertAt = newItems.findIndex((i) => i.id === overItemId)
        if (insertAt !== -1) {
          newItems.splice(insertAt, 0, newItem)
        } else {
          newItems.push(newItem)
        }
      } else {
        const lastInTier = newItems.reduce(
          (last, item, idx) => (item.tier_id === dropTierId ? idx : last),
          -1
        )
        newItems.splice(lastInTier + 1, 0, newItem)
      }

      return newItems.map((item, idx) => ({ ...item, position: idx }))
    })
  }

  function handleDragCancel() {
    setActiveId(null)
    setActiveDragType(null)
    setTargetTier(null)
    targetRef.current = null
  }

  function handleAddTier() {
    const newTier = {
      id: crypto.randomUUID(),
      label:
        tiers.length < 26
          ? String.fromCharCode(65 + tiers.length)
          : `T${tiers.length + 1}`,
      color: PRESET_COLORS[tiers.length % PRESET_COLORS.length],
      position: tiers.length,
    }
    setTiers((prev) => [...prev, newTier])
  }

  function handleEditTier(updatedTier) {
    setTiers((prev) =>
      prev.map((t) => (t.id === updatedTier.id ? updatedTier : t))
    )
  }

  function handleDeleteTier(tierId) {
    setTiers((prev) => prev.filter((t) => t.id !== tierId))
    setItems((prev) => prev.filter((i) => i.tier_id !== tierId))
    setTierSorts((prev) => {
      const next = { ...prev }
      delete next[tierId]
      return next
    })
  }

  const activeIdStr = activeId ? String(activeId) : null
  const activeGameSlug = activeId
    ? activeIdStr.startsWith("untiered-")
      ? activeIdStr.replace("untiered-", "")
      : items.find((i) => i.id === activeIdStr)?.game_slug
    : null
  const activeGame = activeGameSlug ? getGame(activeGameSlug) : null
  const activeCoverUrl = getCoverUrl(activeGame)

  const activeTierForOverlay = useMemo(() => {
    if (!activeId || activeDragType !== "tier") return null
    const tierId = String(activeId).replace("tier-row-", "")
    return tiers.find((t) => t.id === tierId) || null
  }, [activeId, activeDragType, tiers])

  if (isLoading) return <TierlistSkeleton />

  if (!isEditing) {
    return (
      <div
        className="space-y-2 sm:space-y-2.5"
        onDragStart={(e) => e.preventDefault()}
      >
        {tiers.map((tier) => {
          const tierItems = items
            .filter((i) => i.tier_id === tier.id)
            .sort((a, b) => a.position - b.position)
          return (
            <ViewTier
              key={tier.id}
              tier={tier}
              items={tierItems}
              getGame={getGame}
            />
          )
        })}

        {tiers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Gamepad2 className="w-12 h-12 text-zinc-700" />
            <p className="text-sm text-zinc-500">Nenhum tier criado ainda</p>
          </div>
        )}
      </div>
    )
  }

  const tierRowIds = tiers.map((t) => `tier-row-${t.id}`)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={tierlistCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="space-y-2 sm:space-y-2.5">
        <SortableContext items={tierRowIds} strategy={verticalListSortingStrategy}>
          {tiers.map((tier) => {
            const rawItems = items
              .filter((i) => i.tier_id === tier.id)
              .sort((a, b) => a.position - b.position)
            const tierItems = sortTierItems(rawItems, tier.id)
            const isFromUntiered = activeIdStr?.startsWith("untiered-")
            const activeInThisTier =
              !isFromUntiered &&
              activeDragType === "game" &&
              tierItems.some((i) => i.id === activeIdStr)

            return (
              <SortableTierRow
                key={tier.id}
                tier={tier}
                items={tierItems}
                getGame={getGame}
                activeId={activeId}
                activeDragType={activeDragType}
                isTargeted={
                  !!activeId &&
                  activeDragType === "game" &&
                  !activeInThisTier &&
                  targetTier === tier.id
                }
                onEditTier={setEditingTier}
                onDeleteTier={handleDeleteTier}
                onSortTier={handleSortTier}
                tierSort={tierSorts[tier.id] || "manual"}
              />
            )
          })}
        </SortableContext>

        <button
          type="button"
          onClick={handleAddTier}
          className="w-full py-4 sm:py-3 border-2 border-dashed border-zinc-700/60 hover:border-zinc-600 hover:bg-zinc-800/30 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar tier
        </button>
      </div>

      <UntieredZone
        games={orderedUntieredGames}
        getGame={getGame}
        activeId={activeId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
      />

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeDragType === "game" && activeGame && (
          <div
            className={`${CARD_SIZE} rounded-lg overflow-hidden shadow-lg ring-1 ring-indigo-400/60 opacity-80`}
          >
            {activeCoverUrl ? (
              <img
                src={activeCoverUrl}
                alt={activeGame.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                <Gamepad2 className="w-3 h-3 text-zinc-500" />
              </div>
            )}
          </div>
        )}
        {activeDragType === "tier" && activeTierForOverlay && (
          <div className="flex border rounded-xl overflow-hidden bg-zinc-900/80 border-indigo-500/50 shadow-xl opacity-90 max-w-md">
            <div
              className="w-20 sm:w-28 flex-shrink-0 flex items-center justify-center text-white p-2"
              style={{ backgroundColor: activeTierForOverlay.color, minHeight: 60 }}
            >
              <span className="font-bold text-sm select-none">
                {activeTierForOverlay.label}
              </span>
            </div>
            <div className="flex-1 p-2 bg-zinc-800/60 flex items-center">
              <span className="text-xs text-zinc-500">
                {items.filter((i) => i.tier_id === activeTierForOverlay.id).length} jogos
              </span>
            </div>
          </div>
        )}
      </DragOverlay>

      <EditTierModal
        isOpen={!!editingTier}
        onClose={() => setEditingTier(null)}
        tier={editingTier}
        onSave={handleEditTier}
      />
    </DndContext>
  )
}