import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import usePageMeta from "#hooks/usePageMeta"
import { useAuth } from "#hooks/useAuth"
import { useGamesBatch } from "#hooks/useGamesBatch"
import Pagination from "@components/UI/Pagination"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import AddGameModal from "@components/Lists/AddGameModal"
import EditListModal from "@components/Lists/EditListModal"
import ReorderModal from "@components/Lists/ReorderModal"
import RemoveItemModal from "@components/Lists/RemoveItemModal"
import DeleteListModal from "@components/Lists/DeleteListModal"
import {
	List, Lock, ArrowLeft, Pencil, Trash2, Plus,
	MoreHorizontal, X, Gamepad2, Calendar,
	Link as LinkIcon, Check, ArrowUpDown,
} from "lucide-react"
import { supabase } from "#lib/supabase.js"
import { encode } from "#utils/shortId.js"

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
			title="Copiar link"
		>
			{copied ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
		</button>
	)
}

function MobileActionBar({ listId, onAdd, onEdit, onDelete, onReorder, itemCount }) {
	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 px-4 py-3 flex items-center gap-2 sm:hidden safe-bottom">
			<button
				onClick={onAdd}
				className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-500 active:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
			>
				<Plus className="w-4 h-4" />
				Adicionar
			</button>
			{itemCount > 1 && (
				<button
					onClick={onReorder}
					className="p-2.5 text-zinc-500 hover:text-white bg-zinc-800/50 border border-zinc-700 rounded-lg transition-all cursor-pointer"
					title="Reordenar"
				>
					<ArrowUpDown className="w-4 h-4" />
				</button>
			)}
			<ShareButton listId={listId} />
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

export default function ListPage() {
	const { id } = useParams()
	const navigate = useNavigate()
	const { user: currentUser, loading: authLoading } = useAuth()
	const [list, setList] = useState(null)
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [totalItems, setTotalItems] = useState(0)
	const [editOpen, setEditOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [addGameOpen, setAddGameOpen] = useState(false)
	const [reorderOpen, setReorderOpen] = useState(false)
	const [removingItem, setRemovingItem] = useState(null)
	const [menuOpen, setMenuOpen] = useState(false)
	const [togglingMark, setTogglingMark] = useState(null)
	const menuRef = useRef(null)
	const gridRef = useRef(null)

	const slugs = useMemo(() => items.map(i => i.game_slug), [items])
	const { getGame } = useGamesBatch(slugs)

	const isOwner = !authLoading && currentUser?.id && list?.user_id === currentUser.id
	const encodedId = list ? encode(list.id) : id

	usePageMeta(list ? {
		title: `${list.title} - uloggd`,
		description: list.description || "Lista de jogos",
	} : undefined)

	const fetchList = useCallback(async (pageNum) => {
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
		} catch {
			setError(true)
		} finally {
			setLoading(false)
		}
	}, [id])

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

	async function handleToggleMark(item) {
		if (togglingMark === item.id) return

		const newMarked = !item.marked
		setTogglingMark(item.id)

		setItems(prev => prev.map(i =>
			i.id === item.id ? { ...i, marked: newMarked } : i
		))

		try {
			const token = (await supabase.auth.getSession())?.data?.session?.access_token

			const r = await fetch("/api/lists/@me/toggleMark", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}`,
				},
				body: JSON.stringify({ itemId: item.id, marked: newMarked }),
			})

			if (!r.ok) throw new Error()
		} catch {
			setItems(prev => prev.map(i =>
				i.id === item.id ? { ...i, marked: !newMarked } : i
			))
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
		setList(prev => ({ ...prev, ...updated }))
	}

	function handleDeleted() {
		const ownerUsername = list?.owner?.username || currentUser?.username
		navigate(ownerUsername ? `/u/${ownerUsername}` : "/")
	}

	function handleItemAdded(item) {
		setItems(prev => [...prev, item])
		setTotalItems(prev => prev + 1)
	}

	function handleItemRemoved(itemId) {
		setItems(prev => prev.filter(i => i.id !== itemId))
		setTotalItems(prev => prev - 1)
	}

	function handleReordered(newItems) {
		setItems(newItems)
	}

	if (loading && !list) return <ListPageSkeleton />

	if (error || !list) {
		return (
			<div className="flex flex-col items-center justify-center py-32 px-4 gap-4 text-center">
				<div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
					<List className="w-6 h-6 text-zinc-600" />
				</div>
				<h1 className="text-xl font-bold text-white">Lista não encontrada</h1>
				<p className="text-sm text-zinc-500">Esta lista não existe, foi removida ou é privada.</p>
				<Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Voltar ao início</Link>
			</div>
		)
	}

	if (!list.is_public && !isOwner) {
		return (
			<div className="flex flex-col items-center justify-center py-32 px-4 gap-4 text-center">
				<div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
					<Lock className="w-6 h-6 text-zinc-600" />
				</div>
				<h1 className="text-xl font-bold text-white">Lista privada</h1>
				<p className="text-sm text-zinc-500">Esta lista é privada e só pode ser vista pelo autor.</p>
				<Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Voltar ao início</Link>
			</div>
		)
	}

	const createdAt = list.created_at
		? new Date(list.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
		: null

	const updatedAt = list.updated_at
		? new Date(list.updated_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
		: null

	const removingGame = removingItem ? getGame(removingItem.game_slug) : null

	const markedCount = items.filter(i => i.marked).length

	return (
		<div className={`py-6 sm:py-8 pb-16 ${isOwner ? "pb-24 sm:pb-16" : ""}`}>
			<div className="mb-4">
				<button
					onClick={() => navigate(-1)}
					className="text-sm text-zinc-500 hover:text-white active:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1"
				>
					<ArrowLeft className="w-4 h-4" />
					Voltar
				</button>
			</div>

			<div className="flex flex-col gap-4 mb-6">
				<div className="flex-1 min-w-0">
					<div className="flex items-start gap-3 mb-2">
						<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white break-words">{list.title}</h1>
						{list.is_public === false && (
							<span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md flex-shrink-0 mt-1.5">
								<Lock className="w-3 h-3" />
								Privada
							</span>
						)}
					</div>

					{list.description && (
						<p className="text-sm text-zinc-400 leading-relaxed mb-3">{list.description}</p>
					)}

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
						{list.owner && (
							<Link to={`/u/${list.owner.username}`} className="flex items-center gap-1.5 hover:text-white active:text-white transition-colors py-0.5">
								<AvatarWithDecoration
									size="xs"
									src={list.owner.avatar}
									alt={list.owner.username}
									decoration={list.owner.avatar_decoration}
								/>
								{list.owner.username}
							</Link>
						)}
						<span className="flex items-center gap-1.5">
							<Gamepad2 className="w-3.5 h-3.5" />
							{totalItems} jogo{totalItems !== 1 ? "s" : ""}
						</span>
						{markedCount > 0 && (
							<span className="flex items-center gap-1.5 text-zinc-600">
								<Check className="w-3.5 h-3.5" />
								{markedCount} marcado{markedCount !== 1 ? "s" : ""}
							</span>
						)}
						{createdAt && (
							<span className="flex items-center gap-1.5">
								<Calendar className="w-3.5 h-3.5" />
								{createdAt}
							</span>
						)}
						{updatedAt && (
							<span className="text-zinc-600">Atualizada {updatedAt}</span>
						)}
					</div>
				</div>

				<div className="hidden sm:flex items-center gap-2">
					<ShareButton listId={encodedId} />

					{isOwner && (
						<>
							<button
								onClick={() => setAddGameOpen(true)}
								className="px-3 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
							>
								<Plus className="w-4 h-4" />
								Adicionar
							</button>

							{totalItems > 1 && (
								<button
									onClick={() => setReorderOpen(true)}
									className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
								>
									<ArrowUpDown className="w-4 h-4" />
									Reordenar
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
											onClick={() => { setEditOpen(true); setMenuOpen(false) }}
											className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors cursor-pointer"
										>
											<Pencil className="w-3.5 h-3.5" />
											Editar lista
										</button>
										<button
											onClick={() => { setDeleteOpen(true); setMenuOpen(false) }}
											className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
										>
											<Trash2 className="w-3.5 h-3.5" />
											Excluir lista
										</button>
									</div>
								)}
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
							{isOwner ? "Esta lista está vazia. Adicione alguns jogos!" : "Esta lista ainda não tem jogos."}
						</p>
						{isOwner && (
							<button
								onClick={() => setAddGameOpen(true)}
								className="px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
							>
								<Plus className="w-4 h-4" />
								Adicionar jogos
							</button>
						)}
					</div>
				) : (
					<>
						<div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
							{items.map((item, index) => {
								const game = getGame(item.game_slug)
								const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1
								const showRank = list.ranked !== false

								return (
									<div key={item.id} className={`relative ${showRank ? "pt-2 pl-2" : ""}`}>
										{showRank && (
											<div className="absolute top-0 left-0 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-zinc-400 tabular-nums">
												{globalIndex}
											</div>
										)}

										<div className="group relative">
											<div className={`transition-all duration-200 ${item.marked ? "grayscale opacity-50" : ""}`}>
												{game ? (
													<GameCard game={game} responsive />
												) : (
													<GameCardSkeleton responsive />
												)}
											</div>

											{isOwner && game && (
												<>
													<button
														onClick={() => handleToggleMark(item)}
														className={`absolute bottom-1 left-1 z-10 p-1.5 rounded-lg transition-all cursor-pointer touch-manipulation opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${
															item.marked
																? "bg-white/90 text-zinc-900 hover:bg-white sm:opacity-100"
																: "bg-black/70 hover:bg-black/90 text-zinc-400 hover:text-white"
														}`}
														title={item.marked ? "Desmarcar" : "Marcar"}
													>
														<Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
													</button>

													<button
														onClick={() => setRemovingItem({ ...item, list_id: list.id })}
														className="absolute top-1 right-1 z-10 p-1.5 bg-black/70 hover:bg-red-500 active:bg-red-600 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer touch-manipulation opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
														title="Remover"
													>
														<X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
													</button>
												</>
											)}

											{/* Visitante vê o check se marcado */}
											{!isOwner && item.marked && (
												<div className="absolute bottom-1 left-1 z-10 p-1.5 bg-white/90 text-zinc-900 rounded-lg">
													<Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
												</div>
											)}
										</div>
									</div>
								)
							})}
						</div>
						<Pagination
							currentPage={currentPage}
							totalPages={totalPages}
							onPageChange={handlePageChange}
						/>
					</>
				)}
			</div>

			{isOwner && (
				<MobileActionBar
					listId={encodedId}
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
				items={items}
				getGame={getGame}
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