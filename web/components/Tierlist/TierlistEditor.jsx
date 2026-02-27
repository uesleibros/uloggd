import { useState, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToWindowEdges } from "@dnd-kit/modifiers"
import { Plus, Trash2, Palette, Gamepad2 } from "lucide-react"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
]

function getCoverUrl(game) {
  if (!game?.cover?.url) return null
  const url = game.cover.url.startsWith("http") ? game.cover.url : `https:${game.cover.url}`
  return url.replace("t_thumb", "t_cover_small")
}

function SortableGameItem({ id, game, isDragging, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled })

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
      {...(disabled ? {} : listeners)}
      className={`w-12 h-16 sm:w-14 sm:h-[4.5rem] md:w-16 md:h-20 flex-shrink-0 rounded overflow-hidden bg-zinc-800 ${
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-40 scale-95" : ""}`}
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

function DroppableTier({ tier, items, getGame, activeId, isEditing, onEditTier, onDeleteTier }) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier.id}`, disabled: !isEditing })

  return (
    <div className={`flex border rounded-lg overflow-hidden bg-zinc-900/50 transition-colors ${
      isOver && isEditing ? "border-zinc-500 bg-zinc-800/50" : "border-zinc-700"
    }`}>
      <div
        className="w-12 sm:w-14 md:w-16 flex-shrink-0 flex items-center justify-center font-bold text-base sm:text-lg md:text-xl text-white relative group"
        style={{ backgroundColor: tier.color }}
      >
        <span className="select-none">{tier.label}</span>

        {isEditing && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
            <button
              onClick={() => onEditTier(tier)}
              className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
              title="Editar"
            >
              <Palette className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDeleteTier(tier.id)}
              className="p-1 hover:bg-red-500/50 rounded transition-colors cursor-pointer"
              title="Remover"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 min-h-[4rem] sm:min-h-[4.5rem] md:min-h-[5rem] p-1.5 sm:p-2 bg-zinc-800/50"
      >
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-1 sm:gap-1.5 content-start min-h-full">
            {items.map(item => {
              const game = getGame(item.game_slug)
              return (
                <SortableGameItem
                  key={item.id}
                  id={item.id}
                  game={game}
                  isDragging={activeId === item.id}
                  disabled={!isEditing}
                />
              )
            })}
            {items.length === 0 && (
              <div className="w-full h-full min-h-[3rem] flex items-center justify-center">
                <span className="text-xs text-zinc-600 select-none">
                  {isEditing ? "Arraste jogos aqui" : "Nenhum jogo"}
                </span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

function UntieredZone({ games, getGame, activeId, isEditing }) {
  const { setNodeRef, isOver } = useDroppable({ id: "untiered-zone", disabled: !isEditing })

  if (games.length === 0) return null

  return (
    <div className="mt-6">
      <p className="text-xs text-zinc-500 mb-2 flex items-center gap-2">
        <Gamepad2 className="w-3.5 h-3.5" />
        Jogos não classificados ({games.length})
      </p>
      <div
        ref={setNodeRef}
        className={`border border-dashed rounded-lg p-3 transition-colors ${
          isOver && isEditing ? "border-zinc-500 bg-zinc-800/50" : "border-zinc-700 bg-zinc-800/30"
        }`}
      >
        <SortableContext
          items={games.map(g => `untiered-${g.game_slug}`)}
          strategy={rectSortingStrategy}
        >
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {games.map(g => {
              const game = getGame(g.game_slug)
              const itemId = `untiered-${g.game_slug}`
              return (
                <SortableGameItem
                  key={itemId}
                  id={itemId}
                  game={game}
                  isDragging={activeId === itemId}
                  disabled={!isEditing}
                />
              )
            })}
          </div>
        </SortableContext>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Editar tier</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Nome</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              maxLength={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-zinc-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all cursor-pointer ${
                    color === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="mt-3 w-full h-10 rounded-lg cursor-pointer border-0"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!label.trim()}
            className="flex-1 py-2.5 text-sm text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
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
}) {
  const [activeId, setActiveId] = useState(null)
  const [editingTier, setEditingTier] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 8 } 
    }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 100,
        tolerance: 8,
      } 
    }),
    useSensor(KeyboardSensor, { 
      coordinateGetter: sortableKeyboardCoordinates 
    })
  )

  function handleDragStart(event) {
    if (!isEditing) return
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)

    if (!isEditing || !over) return

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    const isFromUntiered = activeIdStr.startsWith("untiered-")
    const gameSlug = isFromUntiered
      ? activeIdStr.replace("untiered-", "")
      : items.find(i => i.id === activeIdStr)?.game_slug

    if (!gameSlug) return

    // Soltou na zona de não classificados
    if (overIdStr === "untiered-zone" || overIdStr.startsWith("untiered-")) {
      setItems(prev => prev.filter(i => i.game_slug !== gameSlug))
      return
    }

    // Determina o tier de destino
    let targetTierId = null
    let overItemIndex = -1

    if (overIdStr.startsWith("tier-")) {
      targetTierId = overIdStr.replace("tier-", "")
    } else {
      const overItem = items.find(i => i.id === overIdStr)
      if (overItem) {
        targetTierId = overItem.tier_id
        overItemIndex = items.findIndex(i => i.id === overIdStr)
      }
    }

    if (!targetTierId) return

    const existingItem = items.find(i => i.game_slug === gameSlug)

    if (existingItem) {
      const activeIndex = items.findIndex(i => i.id === existingItem.id)
      const sameTier = existingItem.tier_id === targetTierId

      if (sameTier && overItemIndex !== -1 && activeIndex !== overItemIndex) {
        // Reordenação dentro do mesmo tier
        setItems(prev => {
          const newItems = arrayMove(prev, activeIndex, overItemIndex)
          return newItems.map((item, idx) => ({ ...item, position: idx }))
        })
      } else if (!sameTier) {
        // Movendo para outro tier
        setItems(prev => {
          const updated = prev.map(i =>
            i.game_slug === gameSlug ? { ...i, tier_id: targetTierId } : i
          )
          // Se soltou em cima de um item, insere na posição correta
          if (overItemIndex !== -1) {
            const itemToMove = updated.find(i => i.game_slug === gameSlug)
            const withoutItem = updated.filter(i => i.game_slug !== gameSlug)
            withoutItem.splice(overItemIndex, 0, itemToMove)
            return withoutItem.map((item, idx) => ({ ...item, position: idx }))
          }
          return updated.map((item, idx) => ({ ...item, position: idx }))
        })
      }
    } else {
      // Adicionando do untiered
      const game = untieredGames.find(g => g.game_slug === gameSlug)
      if (game) {
        setItems(prev => {
          const newItem = {
            id: crypto.randomUUID(),
            game_id: game.game_id,
            game_slug: game.game_slug,
            tier_id: targetTierId,
            position: prev.length,
          }
          
          if (overItemIndex !== -1) {
            const newItems = [...prev]
            newItems.splice(overItemIndex, 0, newItem)
            return newItems.map((item, idx) => ({ ...item, position: idx }))
          }
          
          return [...prev, newItem].map((item, idx) => ({ ...item, position: idx }))
        })
      }
    }
  }

  function handleAddTier() {
    const newTier = {
      id: crypto.randomUUID(),
      label: tiers.length < 26 ? String.fromCharCode(65 + tiers.length) : `T${tiers.length + 1}`,
      color: PRESET_COLORS[tiers.length % PRESET_COLORS.length],
      position: tiers.length,
    }
    setTiers(prev => [...prev, newTier])
  }

  function handleEditTier(updatedTier) {
    setTiers(prev => prev.map(t => t.id === updatedTier.id ? updatedTier : t))
  }

  function handleDeleteTier(tierId) {
    setTiers(prev => prev.filter(t => t.id !== tierId))
    setItems(prev => prev.filter(i => i.tier_id !== tierId))
  }

  const activeGameSlug = activeId
    ? String(activeId).startsWith("untiered-")
      ? String(activeId).replace("untiered-", "")
      : items.find(i => i.id === activeId)?.game_slug
    : null

  const activeGame = activeGameSlug ? getGame(activeGameSlug) : null
  const activeCoverUrl = getCoverUrl(activeGame)

  // Se não é editing, renderiza sem DnD
  if (!isEditing) {
    return (
      <div className="space-y-2">
        {tiers.map(tier => {
          const tierItems = items.filter(i => i.tier_id === tier.id)
          return (
            <DroppableTier
              key={tier.id}
              tier={tier}
              items={tierItems}
              getGame={getGame}
              activeId={null}
              isEditing={false}
              onEditTier={() => {}}
              onDeleteTier={() => {}}
            />
          )
        })}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="space-y-2">
        {tiers.map(tier => {
          const tierItems = items.filter(i => i.tier_id === tier.id)

          return (
            <DroppableTier
              key={tier.id}
              tier={tier}
              items={tierItems}
              getGame={getGame}
              activeId={activeId}
              isEditing={isEditing}
              onEditTier={setEditingTier}
              onDeleteTier={handleDeleteTier}
            />
          )
        })}

        <button
          type="button"
          onClick={handleAddTier}
          className="w-full py-3 border border-dashed border-zinc-700 hover:border-zinc-600 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar tier
        </button>
      </div>

      <UntieredZone
        games={untieredGames}
        getGame={getGame}
        activeId={activeId}
        isEditing={isEditing}
      />

      <DragOverlay>
        {activeGame && (
          <div className="w-12 h-16 sm:w-14 sm:h-[4.5rem] md:w-16 md:h-20 rounded overflow-hidden shadow-2xl rotate-3 scale-105">
            {activeCoverUrl ? (
              <img
                src={activeCoverUrl}
                alt={activeGame.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-zinc-500" />
              </div>
            )}
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