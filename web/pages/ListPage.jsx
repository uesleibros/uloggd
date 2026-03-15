import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToWindowEdges } from "@dnd-kit/modifiers"
import usePageMeta from "#hooks/usePageMeta"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { useCustomCovers } from "#hooks/useCustomCovers"
import Pagination from "@components/UI/Pagination"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import GameCover from "@components/Game/GameCover"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import AddGameModal from "@components/Lists/AddGameModal"
import EditListModal from "@components/Lists/EditListModal"
import ReorderModal from "@components/Lists/ReorderModal"
import RemoveItemModal from "@components/Lists/RemoveItemModal"
import DeleteListModal from "@components/Lists/DeleteListModal"
import {
  List,
  Lock,
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  MoreHorizontal,
  X,
  Gamepad2,
  Calendar,
  Link as LinkIcon,
  Check,
  ArrowUpDown,
} from "lucide-react"
import { supabase } from "#lib/supabase.js"
import { encode } from "#utils/shortId.js"
import { useDateTime } from "#hooks/useDateTime"

const ITEMS_PER_PAGE = 24

function ListPageSkeleton() {
  return (
    <div className="py-6 sm:py-10">
      <div className="animate-pulse space-y-5">
        <div className="h-4 w-16 bg-zinc-800 rounded" />
        <div className="space-y-3">
          <div className="h-8 w-56 bg-zinc-800 rounded" />
          <div className="h-4 w-40 bg-zinc-800/50 rounded" />
          <div className="flex gap-3">
            <div className="h-4 w-20 bg-zinc-800/50 rounded" />
            <div className="h-4 w-24 bg-zinc-800/50 rounded" />
          </div>
        </div>
        <div className="border-t border-zinc-800 pt-6">
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ShareButton({ listId }) {
  const { t } = useTranslation("common")
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `${window.location.origin}/list/${listId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="p-2.5 sm:p-2 text-zinc-500 hover:text-white active:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
      title={t("copyLink")}
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
    </button>
  )
}

function MobileActionBar({ onAdd, onEdit, onDelete, onReorder, itemCount }) {
  const { t } = useTranslation("common")

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 px-4 py-3 flex items-center gap-2 sm:hidden safe-bottom">
      <button
        onClick={onAdd}
        className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-500 active:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {t("add")}
      </button>
      {itemCount > 1 && (
        <button
          onClick={onReorder}
          className="p-2.5 text-zinc-500 hover:text-white bg-zinc-800/50 border border-zinc-700 rounded-lg transition-all cursor-pointer"
          title={t("reorder")}
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onEdit}
        className="p-2.5 text-zinc-500 hover:text-white bg-zinc-800/50 border border-zinc-700 rounded-lg transition-all cursor-pointer"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="p-2.5 text-red-400 hover:text-red-300 bg-zinc-800/50 border border-zinc-700 rounded-lg transition-all cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function GameItemFooter({ globalIndex, showRank, marked, editMode, isOwner }) {
  const showCheck = marked && isOwner && editMode

  if (!showRank && !showCheck) return null

  return (
    <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
      {showRank && (
        <span className="text-[10px] sm:text-xs font-bold text-zinc-500 tabular-nums">
          #{globalIndex}
        </span>
      )}
      {showCheck && (
        <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-zinc-900" />
        </div>
      )}
    </div>
  )
}

function SortableGameCard({
  item,
  game,
  customCoverUrl,
  editMode,
  isOwner,
  globalIndex,
  showRank,
  togglingMark,
  onToggleMark,
  onRemove,
}) {
  const { t } = useTranslation("common")

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-30 z-10" : ""}
    >
      <div className="group relative">
        <div
          className={`transition-all duration-200 ${item.marked ? "grayscale opacity-50" : ""}`}
          {...attributes}
          {...listeners}
        >
          {game ? (
            <GameCard
              game={game}
              customCoverUrl={customCoverUrl}
              showQuickActions={!editMode}
              responsive
              disableLink={editMode}
            />
          ) : (
            <GameCardSkeleton responsive />
          )}
        </div>

        {isOwner && editMode && game && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleMark(item)
              }}
              className={`absolute bottom-1 left-1 z-10 p-1.5 rounded-lg transition-all cursor-pointer touch-manipulation opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${
                item.marked
                  ? "bg-white/90 text-zinc-900 hover:bg-white sm:!opacity-100"
                  : "bg-black/70 hover:bg-black/90 text-zinc-400 hover:text-white"
              }`}
              title={item.marked ? t("unmark") : t("mark")}
            >
              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(item)
              }}
              className="absolute top-1 right-1 z-10 p-1.5 bg-black/70 hover:bg-red-500 active:bg-red-600 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer touch-manipulation opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title={t("remove")}
            >
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </>
        )}
      </div>

      <GameItemFooter
        globalIndex={globalIndex}
        showRank={showRank}
        marked={item.marked}
        editMode={editMode}
        isOwner={isOwner}
      />
    </div>
  )
}

export default function ListPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { formatDateLong } = useDateTime()
  const { user: currentUser, loading: authLoading } = useAuth()
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [markedTotal, setMarkedTotal] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addGameOpen, setAddGameOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const [removingItem, setRemovingItem] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [togglingMark, setTogglingMark] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const menuRef = useRef(null)
  const gridRef = useRef(null)

  const slugs = useMemo(() => items.map((i) => i.game_slug), [items])
  const { getGame } = useGamesBatch(slugs)
  const { getCustomCover } = useCustomCovers(list?.user_id, slugs)

  const isOwner = !authLoading && currentUser?.user_id && list?.user_id === currentUser.user_id
  const encodedId = list ? encode(list.id) : id

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 12 } })
  )

  usePageMeta(
    list
      ? {
          title: `${list.title} - uloggd`,
          description: list.description || "Lista de jogos",
        }
      : undefined
  )

  const fetchList = useCallback(
    async (pageNum) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          listId: id,
          page: pageNum,
          limit: ITEMS_PER_PAGE,
        })

        const r = await fetch(`/api/lists/get?${params}`)

        if (!r.ok) throw new Error("not found")

        const data = await r.json()
        setList({
          id: data.id,
          user_id: data.user_id,
          title: data.title,
          description: data.description,
          is_public: data.is_public,
          ranked: data.ranked,
          created_at: data.created_at,
          updated_at: data.updated_at,
          owner: data.owner,
        })
        setItems(data.list_items || [])
        setTotalItems(data.items_total || 0)
        setTotalPages(data.items_totalPages || 1)
        setMarkedTotal(data.items_marked || 0)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    setCurrentPage(1)
    fetchList(1)
  }, [id, fetchList])

  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  async function saveNewOrder(newItems) {
    setSavingOrder(true)
    try {
      const token = (await supabase.auth.getSession())?.data?.session?.access_token

      const r = await fetch("/api/lists/@me/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listId: list.id,
          items: newItems.map((item) => item.id),
        }),
      })

      if (!r.ok) throw new Error()
    } catch {
      fetchList(currentPage)
    } finally {
      setSavingOrder(false)
    }
  }

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)
    saveNewOrder(newItems)
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  async function handleToggleMark(item) {
    if (togglingMark === item.id) return

    const newMarked = !item.marked
    setTogglingMark(item.id)

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, marked: newMarked } : i)))
    setMarkedTotal((prev) => (newMarked ? prev + 1 : prev - 1))

    try {
      const token = (await supabase.auth.getSession())?.data?.session?.access_token

      const r = await fetch("/api/lists/@me/toggleMark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId: item.id, marked: newMarked }),
      })

      if (!r.ok) throw new Error()
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, marked: !newMarked } : i)))
      setMarkedTotal((prev) => (newMarked ? prev - 1 : prev + 1))
    } finally {
      setTogglingMark(null)
    }
  }

  function handlePageChange(page) {
    setCurrentPage(page)
    fetchList(page)
    if (gridRef.current) {
      const y = gridRef.current.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  function handleUpdated(updated) {
    setList((prev) => ({ ...prev, ...updated }))
  }

  function handleDeleted() {
    const ownerUsername = list?.owner?.username || currentUser?.username
    navigate(ownerUsername ? `/u/${ownerUsername}` : "/")
  }

  function handleItemAdded(item) {
    fetchList(currentPage)
  }

  function handleItemRemoved(itemId) {
    const item = items.find((i) => i.id === itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setTotalItems((prev) => prev - 1)
    if (item?.marked) setMarkedTotal((prev) => prev - 1)
  }

  function handleReordered() {
    fetchList(currentPage)
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null
  const activeGame = activeItem ? getGame(activeItem.game_slug) : null
  const activeCustomCover = activeItem ? getCustomCover(activeItem.game_slug) : null

  if (loading && !list) return <ListPageSkeleton />

  if (error || !list) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <List className="w-6 h-6 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-white">{t("list.notFound.title")}</h1>
        <p className="text-sm text-zinc-500">{t("list.notFound.message")}</p>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          {t("common.backToHome")}
        </Link>
      </div>
    )
  }

  if (!list.is_public && !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <Lock className="w-6 h-6 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-white">{t("list.private.title")}</h1>
        <p className="text-sm text-zinc-500">{t("list.private.message")}</p>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          {t("common.backToHome")}
        </Link>
      </div>
    )
  }

  const createdAt = formatDateLong(list.created_at)
  const updatedAt = formatDateLong(list.updated_at)

  const removingGame = removingItem ? getGame(removingItem.game_slug) : null
  const canDrag = isOwner && editMode
  const showRank = list.ranked !== false

  return (
    <div className={`py-6 sm:py-8 pb-16 ${isOwner && editMode ? "pb-24 sm:pb-16" : ""}`}>
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-500 hover:text-white active:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.back")}
        </button>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white break-words">
              {list.title}
            </h1>
            {list.is_public === false && (
              <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md flex-shrink-0 mt-1.5">
                <Lock className="w-3 h-3" />
                {t("common.private")}
              </span>
            )}
          </div>

          {list.description && (
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">{list.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
            {list.owner && (
              <Link
                to={`/u/${list.owner.username}`}
                className="flex items-center gap-1.5 hover:text-white active:text-white transition-colors py-0.5"
              >
                <AvatarWithDecoration size="xs" src={list.owner.avatar} alt={list.owner.username} />
                {list.owner.username}
              </Link>
            )}
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5" />
              {t("common.games", { count: totalItems })}
            </span>
            {markedTotal > 0 && (
              <span className="flex items-center gap-1.5 text-zinc-600">
                <Check className="w-3.5 h-3.5" />
                {t("common.marked", { count: markedTotal })}
              </span>
            )}
            {createdAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {createdAt}
              </span>
            )}
            {updatedAt && (
              <span className="text-zinc-600">{t("common.updated", { date: updatedAt })}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShareButton listId={encodedId} />

          {isOwner && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-2.5 sm:py-2 text-sm font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                editMode
                  ? "text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700"
                  : "text-zinc-400 hover:text-white active:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <Pencil className="w-4 h-4" />
              {editMode ? t("common.done") : t("common.edit")}
            </button>
          )}

          {isOwner && editMode && (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setAddGameOpen(true)}
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {t("common.add")}
                </button>

                {totalItems > 1 && (
                  <button
                    onClick={() => setReorderOpen(true)}
                    className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    {t("common.reorder")}
                  </button>
                )}

                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[150px]">
                      <button
                        onClick={() => {
                          setEditOpen(true)
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t("list.actions.editList")}
                      </button>
                      <button
                        onClick={() => {
                          setDeleteOpen(true)
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("list.actions.deleteList")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-5 sm:pt-6" ref={gridRef}>
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 gap-4">
            <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <p className="text-sm text-zinc-500 text-center px-4">
              {isOwner ? t("list.empty.owner") : t("list.empty.visitor")}
            </p>
            {isOwner && (
              <button
                onClick={() => {
                  setEditMode(true)
                  setAddGameOpen(true)
                }}
                className="px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("list.actions.addGames")}
              </button>
            )}
          </div>
        ) : canDrag ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToWindowEdges]}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {items.map((item, index) => {
                  const game = getGame(item.game_slug)
                  const customCoverUrl = getCustomCover(item.game_slug)
                  const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1

                  return (
                    <SortableGameCard
                      key={item.id}
                      item={item}
                      game={game}
                      customCoverUrl={customCoverUrl}
                      editMode={editMode}
                      isOwner={isOwner}
                      globalIndex={globalIndex}
                      showRank={showRank}
                      togglingMark={togglingMark}
                      onToggleMark={handleToggleMark}
                      onRemove={(item) => setRemovingItem({ ...item, list_id: list.id })}
                    />
                  )
                })}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
              {activeGame && (
                <div className="w-[100px] sm:w-[130px] aspect-[3/4] rounded-lg overflow-hidden shadow-lg ring-1 ring-indigo-400/60 opacity-80">
                  <GameCover
                    game={activeGame}
                    customCoverUrl={activeCustomCover}
                    className="w-full h-full rounded-lg"
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item, index) => {
              const game = getGame(item.game_slug)
              const customCoverUrl = getCustomCover(item.game_slug)
              const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1

              return (
                <div key={item.id}>
                  <div className="group relative">
                    <div className={`transition-all duration-200 ${item.marked ? "grayscale opacity-50" : ""}`}>
                      {game ? (
                        <GameCard
                          game={game}
                          customCoverUrl={customCoverUrl}
                          showQuickActions={!editMode}
                          disableLink={editMode}
                          responsive
                        />
                      ) : (
                        <GameCardSkeleton responsive />
                      )}
                    </div>
                  </div>

                  <GameItemFooter
                    globalIndex={globalIndex}
                    showRank={showRank}
                    marked={item.marked}
                    editMode={editMode}
                    isOwner={isOwner}
                  />
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {isOwner && editMode && (
        <MobileActionBar
          onAdd={() => setAddGameOpen(true)}
          onEdit={() => setEditOpen(true)}
          onDelete={() => setDeleteOpen(true)}
          onReorder={() => setReorderOpen(true)}
          itemCount={totalItems}
        />
      )}

      <EditListModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        list={list}
        onUpdated={handleUpdated}
      />

      <DeleteListModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        list={list}
        onDeleted={handleDeleted}
      />

      <AddGameModal
        isOpen={addGameOpen}
        onClose={() => setAddGameOpen(false)}
        listId={list.id}
        existingSlugs={slugs}
        onAdded={handleItemAdded}
      />

      <ReorderModal
        isOpen={reorderOpen}
        onClose={() => setReorderOpen(false)}
        listId={list.id}
        onReordered={handleReordered}
      />

      <RemoveItemModal
        isOpen={!!removingItem}
        onClose={() => setRemovingItem(null)}
        item={removingItem}
        gameName={removingGame?.name}
        onRemoved={handleItemRemoved}
      />
    </div>
  )
}
