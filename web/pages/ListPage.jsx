import { useEffect, useState, useRef, useMemo } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import usePageMeta from "#hooks/usePageMeta"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"
import { useGamesBatch } from "#hooks/useGamesBatch"
import Pagination from "@components/Profile/Pagination"
import Modal from "@components/UI/Modal"
import GameCard from "@components/Game/GameCard"
import PlatformIcons from "@components/Game/PlatformIcons"
import { formatDateShort } from "#utils/formatDate"
import {
	List, Lock, Globe, ArrowLeft, Pencil, Trash2, Plus,
	MoreHorizontal, Search, X, Gamepad2, Calendar, User,
	Link as LinkIcon, Check,
} from "lucide-react"

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

function EditListModal({ isOpen, onClose, list, onUpdated }) {
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [isPublic, setIsPublic] = useState(true)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	useEffect(() => {
		if (isOpen && list) {
			setTitle(list.title || "")
			setDescription(list.description || "")
			setIsPublic(list.is_public !== false)
			setError(null)
		}
	}, [isOpen, list])

	async function handleSubmit(e) {
		e.preventDefault()
		if (!title.trim()) return setError("Título é obrigatório")
		setLoading(true)
		setError(null)

		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) throw new Error("Não autenticado")

			const res = await fetch("/api/lists/@me/update", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({
					listId: list.id,
					title: title.trim(),
					description: description.trim() || null,
					isPublic,
				}),
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.error || "Erro ao atualizar")
			}

			const updated = await res.json()
			onUpdated(updated)
			onClose()
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Editar lista" maxWidth="max-w-md" fullscreenMobile showMobileGrip>
			<form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
				<div>
					<label className="block text-sm font-medium text-zinc-300 mb-1.5">Título</label>
					<input
						type="text"
						value={title}
						onChange={e => setTitle(e.target.value)}
						maxLength={100}
						className="w-full px-3 py-2.5 sm:py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
						autoFocus
					/>
					<span className="text-xs text-zinc-600 mt-1 block text-right">{title.length}/100</span>
				</div>

				<div>
					<label className="block text-sm font-medium text-zinc-300 mb-1.5">
						Descrição <span className="text-zinc-600 font-normal">(opcional)</span>
					</label>
					<textarea
						value={description}
						onChange={e => setDescription(e.target.value)}
						maxLength={500}
						rows={3}
						className="w-full px-3 py-2.5 sm:py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
					/>
					<span className="text-xs text-zinc-600 mt-1 block text-right">{description.length}/500</span>
				</div>

				<div>
					<label className="block text-sm font-medium text-zinc-300 mb-2">Visibilidade</label>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setIsPublic(true)}
							className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
								isPublic
									? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
									: "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
							}`}
						>
							<Globe className="w-4 h-4" />
							Pública
						</button>
						<button
							type="button"
							onClick={() => setIsPublic(false)}
							className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
								!isPublic
									? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
									: "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
							}`}
						>
							<Lock className="w-4 h-4" />
							Privada
						</button>
					</div>
				</div>

				{error && (
					<p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
				)}

				<div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 sm:pt-1">
					<button type="button" onClick={onClose} className="px-4 py-2.5 sm:py-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg sm:rounded-none">
						Cancelar
					</button>
					<button
						type="submit"
						disabled={loading || !title.trim()}
						className="px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
					>
						{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : "Salvar"}
					</button>
				</div>
			</form>
		</Modal>
	)
}

function DeleteListModal({ isOpen, onClose, list, onDeleted }) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	useEffect(() => {
		if (isOpen) setError(null)
	}, [isOpen])

	async function handleDelete() {
		setLoading(true)
		setError(null)

		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) throw new Error("Não autenticado")

			const res = await fetch("/api/lists/@me/delete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ listId: list.id }),
			})

			if (!res.ok) throw new Error("Erro ao excluir")
			onDeleted()
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Excluir lista" maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
			<div className="p-4 sm:p-5 flex flex-col gap-4">
				<p className="text-sm text-zinc-400">
					Tem certeza que deseja excluir <span className="text-white font-medium">&quot;{list?.title}&quot;</span>? Esta ação não pode ser desfeita.
				</p>
				{error && (
					<p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
				)}
				<div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 sm:pt-1">
					<button onClick={onClose} className="px-4 py-2.5 sm:py-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg">
						Cancelar
					</button>
					<button
						onClick={handleDelete}
						disabled={loading}
						className="px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
					>
						{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
						Excluir
					</button>
				</div>
			</div>
		</Modal>
	)
}

function AddGameModal({ isOpen, onClose, listId, existingSlugs, onAdded }) {
	const [query, setQuery] = useState("")
	const [results, setResults] = useState([])
	const [searching, setSearching] = useState(false)
	const [adding, setAdding] = useState(null)
	const [recentlyAdded, setRecentlyAdded] = useState([])
	const debounceRef = useRef(null)
	const inputRef = useRef(null)

	useEffect(() => {
		if (isOpen) {
			setQuery("")
			setResults([])
			setRecentlyAdded([])
			setTimeout(() => inputRef.current?.focus(), 150)
		}
	}, [isOpen])

	useEffect(() => {
		if (!query.trim()) {
			setResults([])
			setSearching(false)
			return
		}

		setSearching(true)
		clearTimeout(debounceRef.current)

		debounceRef.current = setTimeout(async () => {
			try {
				const res = await fetch("/api/igdb/autocomplete", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query: query.trim() }),
				})
				const data = await res.json()
				setResults(Array.isArray(data) ? data : [])
			} catch {
				setResults([])
			} finally {
				setSearching(false)
			}
		}, 400)

		return () => clearTimeout(debounceRef.current)
	}, [query])

	async function handleAdd(game) {
		setAdding(game.slug)
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return

			const res = await fetch("/api/lists/@me/addItem", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({
					listId,
					gameId: game.id,
					gameSlug: game.slug,
				}),
			})

			if (!res.ok) throw new Error()
			const item = await res.json()
			onAdded(item)
			setRecentlyAdded(prev => [...prev, game.slug])
		} catch {} finally {
			setAdding(null)
		}
	}

	const allAdded = [...existingSlugs, ...recentlyAdded]

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Adicionar jogo" maxWidth="max-w-md" fullscreenMobile showMobileGrip>
			<div className="flex flex-col h-full">
				<div className="p-4 pb-3 border-b border-zinc-800 md:border-0 md:pb-0">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
						<input
							ref={inputRef}
							type="text"
							value={query}
							onChange={e => setQuery(e.target.value)}
							placeholder="Procurar jogos..."
							className="w-full pl-10 pr-10 py-3 sm:py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
						/>
						{query && (
							<button
								onClick={() => { setQuery(""); setResults([]) }}
								className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0 max-h-[60vh] md:max-h-80">
					{searching && (
						<div className="flex items-center justify-center py-12">
							<div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
						</div>
					)}

					{!searching && query.trim() && results.length === 0 && (
						<p className="text-sm text-zinc-500 text-center py-12">Nenhum resultado encontrado</p>
					)}

					{!searching && !query.trim() && (
						<div className="flex flex-col items-center justify-center py-12 gap-2">
							<Search className="w-8 h-8 text-zinc-700" />
							<p className="text-sm text-zinc-600">Digite para buscar jogos</p>
						</div>
					)}

					{!searching && results.map(game => {
						const alreadyAdded = allAdded.includes(game.slug)
						const isAdding = adding === game.slug

						return (
							<div
								key={game.id}
								className="flex items-center gap-3 py-3 sm:py-2.5 border-b border-zinc-800/50 last:border-0 active:bg-zinc-800/30 sm:active:bg-transparent transition-colors"
							>
								<Link
									to={`/game/${game.slug}`}
									target="_blank"
									className="flex-shrink-0"
									onClick={e => e.stopPropagation()}
								>
									{game.cover ? (
										<img
											src={`https:${game.cover.url}`}
											alt=""
											className="h-14 w-10 sm:h-12 sm:w-9 rounded object-cover bg-zinc-800"
										/>
									) : (
										<div className="h-14 w-10 sm:h-12 sm:w-9 rounded bg-zinc-800 flex items-center justify-center">
											<Gamepad2 className="w-4 h-4 text-zinc-600" />
										</div>
									)}
								</Link>

								<div className="flex-1 min-w-0">
									<Link
										to={`/game/${game.slug}`}
										target="_blank"
										className="text-sm font-medium text-white hover:text-indigo-400 transition-colors truncate block"
										onClick={e => e.stopPropagation()}
									>
										{game.name}
									</Link>
									<div className="flex items-center gap-2 mt-0.5">
										{game.first_release_date && (
											<span className="text-xs text-zinc-500">
												{formatDateShort(game.first_release_date)}
											</span>
										)}
										<PlatformIcons icons={game.platformIcons} />
									</div>
								</div>

								{alreadyAdded ? (
									<span className="flex items-center gap-1 text-xs text-emerald-500 px-2.5 py-2 sm:py-1.5 bg-emerald-500/10 rounded-lg flex-shrink-0">
										<Check className="w-3.5 h-3.5" />
										<span className="hidden sm:inline">Adicionado</span>
									</span>
								) : (
									<button
										onClick={() => handleAdd(game)}
										disabled={isAdding}
										className="px-3 py-2 sm:py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
									>
										{isAdding ? (
											<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										) : (
											<Plus className="w-3.5 h-3.5" />
										)}
										<span className="hidden sm:inline">Adicionar</span>
									</button>
								)}
							</div>
						)
					})}
				</div>

				{recentlyAdded.length > 0 && (
					<div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
						<p className="text-xs text-zinc-500 text-center sm:text-left">
							{recentlyAdded.length} jogo{recentlyAdded.length !== 1 ? "s" : ""} adicionado{recentlyAdded.length !== 1 ? "s" : ""}
						</p>
					</div>
				)}
			</div>
		</Modal>
	)
}

function RemoveItemModal({ isOpen, onClose, item, gameName, onRemoved }) {
	const [loading, setLoading] = useState(false)

	async function handleRemove() {
		setLoading(true)
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return

			const res = await fetch("/api/lists/@me/removeItem", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ listId: item.list_id || item.listId, itemId: item.id }),
			})

			if (!res.ok) throw new Error()
			onRemoved(item.id)
			onClose()
		} catch {} finally {
			setLoading(false)
		}
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Remover jogo" maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
			<div className="p-4 sm:p-5 flex flex-col gap-4">
				<p className="text-sm text-zinc-400">
					Remover <span className="text-white font-medium">{gameName || item?.game_slug}</span> desta lista?
				</p>
				<div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 sm:pt-1">
					<button onClick={onClose} className="px-4 py-2.5 sm:py-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg">
						Cancelar
					</button>
					<button
						onClick={handleRemove}
						disabled={loading}
						className="px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
					>
						{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
						Remover
					</button>
				</div>
			</div>
		</Modal>
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

function MobileActionBar({ onAdd, onEdit, onDelete, onShare, listId }) {
	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 px-4 py-3 flex items-center gap-2 sm:hidden safe-bottom">
			<button
				onClick={onAdd}
				className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-500 active:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
			>
				<Plus className="w-4 h-4" />
				Adicionar jogo
			</button>
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
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [editOpen, setEditOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [addGameOpen, setAddGameOpen] = useState(false)
	const [removingItem, setRemovingItem] = useState(null)
	const [menuOpen, setMenuOpen] = useState(false)
	const menuRef = useRef(null)
	const gridRef = useRef(null)

	const items = list?.list_items || []
	const slugs = useMemo(() => items.map(i => i.game_slug), [items])
	const { getGame } = useGamesBatch(slugs)

	const isOwner = !authLoading && currentUser?.id && list?.user_id === currentUser.id

	usePageMeta(list ? {
		title: `${list.title} - uloggd`,
		description: list.description || "Lista de jogos",
	} : undefined)

	useEffect(() => {
		setLoading(true)
		setError(null)
		setCurrentPage(1)

		const controller = new AbortController()

		fetch("/api/lists/@me/get", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ listId: id }),
			signal: controller.signal,
		})
			.then(r => {
				if (!r.ok) throw new Error("not found")
				return r.json()
			})
			.then(data => {
				setList(data)
				setLoading(false)
			})
			.catch(err => {
				if (err.name !== "AbortError") {
					setError(true)
					setLoading(false)
				}
			})

		return () => controller.abort()
	}, [id])

	useEffect(() => {
		function handle(e) {
			if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
		}
		document.addEventListener("mousedown", handle)
		return () => document.removeEventListener("mousedown", handle)
	}, [])

	const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
	const paginatedItems = items.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	)

	function handlePageChange(page) {
		setCurrentPage(page)
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
		navigate(ownerUsername ? `/${ownerUsername}` : "/")
	}

	function handleItemAdded(item) {
		setList(prev => ({
			...prev,
			list_items: [...(prev.list_items || []), item],
		}))
	}

	function handleItemRemoved(itemId) {
		setList(prev => ({
			...prev,
			list_items: (prev.list_items || []).filter(i => i.id !== itemId),
		}))
	}

	if (loading) return <ListPageSkeleton />

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
							<Link
								to={`/${list.owner.username}`}
								className="flex items-center gap-1.5 hover:text-white active:text-white transition-colors py-0.5"
							>
								<User className="w-3.5 h-3.5" />
								{list.owner.username}
							</Link>
						)}
						<span className="flex items-center gap-1.5">
							<Gamepad2 className="w-3.5 h-3.5" />
							{items.length} jogo{items.length !== 1 ? "s" : ""}
						</span>
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
					<ShareButton listId={list.id} />

					{isOwner && (
						<>
							<button
								onClick={() => setAddGameOpen(true)}
								className="px-3 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
							>
								<Plus className="w-4 h-4" />
								Adicionar
							</button>

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
				{items.length === 0 ? (
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
						<div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
							{paginatedItems.map((item, index) => {
								const game = getGame(item.game_slug)
								const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1

								return (
									<div key={item.id} className="group relative">
										<div className="absolute -top-1 -left-1 sm:-top-1.5 sm:-left-1.5 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-zinc-400 tabular-nums">
											{globalIndex}
										</div>

										{game ? (
											<GameCard game={game} newTab />
										) : (
											<div className="aspect-[3/4] bg-zinc-800 rounded-lg animate-pulse" />
										)}

										{isOwner && (
											<button
												onClick={() => setRemovingItem({ ...item, list_id: list.id })}
												className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-10 p-1.5 bg-black/70 hover:bg-red-500 active:bg-red-600 rounded-lg text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-all cursor-pointer touch-manipulation"
												title="Remover"
											>
												<X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
											</button>
										)}
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
					listId={list.id}
					onAdd={() => setAddGameOpen(true)}
					onEdit={() => setEditOpen(true)}
					onDelete={() => setDeleteOpen(true)}
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