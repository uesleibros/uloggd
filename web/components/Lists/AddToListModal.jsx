import { useState, useEffect } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"
import Modal from "@components/UI/Modal"
import { List, Check, Lock } from "lucide-react"
import { encode } from "#utils/shortId.js"

export default function AddToListModal({ isOpen, onClose, game }) {
	const { user } = useAuth()
	const [lists, setLists] = useState([])
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [toggling, setToggling] = useState(null)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(false)

	async function fetchLists(pageNum, append = false) {
		if (pageNum === 1) setLoading(true)
		else setLoadingMore(true)

		try {
			const params = new URLSearchParams({
				userId: user.id,
				page: pageNum,
				limit: 20,
			})

			const r = await fetch(`/api/lists/get?${params}`)
			const data = await r.json()

			const mapped = (data.lists || []).map(list => ({
				...list,
				hasGame: (list.game_slugs || []).includes(game?.slug),
			}))

			if (append) {
				setLists(prev => [...prev, ...mapped])
			} else {
				setLists(mapped)
			}

			setHasMore(pageNum < data.totalPages)
		} catch {
			if (!append) setLists([])
		} finally {
			setLoading(false)
			setLoadingMore(false)
		}
	}

	useEffect(() => {
		if (!isOpen || !user) return
		setPage(1)
		setLists([])
		fetchLists(1)
	}, [isOpen, user, game?.slug])

	function handleLoadMore() {
		if (loadingMore || !hasMore) return
		const nextPage = page + 1
		setPage(nextPage)
		fetchLists(nextPage, true)
	}

	async function handleToggle(list) {
		if (toggling) return
		setToggling(list.id)

		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return

			if (list.hasGame) {
				const listId = encode(list.id)
				
				const fullList = await fetch(`/api/lists/get?listId=${listId}`)
					.then(r => r.json())

				const item = fullList.list_items?.find(i => i.game_slug === game.slug)
				if (!item) return

				await fetch("/api/lists/@me/removeItem", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({ listId: list.id, itemId: item.id }),
				})

				setLists(prev => prev.map(l =>
					l.id === list.id
						? { ...l, hasGame: false, games_count: Math.max(0, (l.games_count || 1) - 1) }
						: l
				))
			} else {
				await fetch("/api/lists/@me/addItem", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({
						listId: list.id,
						gameId: game.id,
						gameSlug: game.slug,
					}),
				})

				setLists(prev => prev.map(l =>
					l.id === list.id
						? { ...l, hasGame: true, games_count: (l.games_count || 0) + 1 }
						: l
				))
			}
		} catch {} finally {
			setToggling(null)
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Adicionar a lista"
			maxWidth="max-w-sm"
			fullscreenMobile
			showMobileGrip
		>
			<div className="flex flex-col h-full">
				{loading ? (
					<div className="flex items-center justify-center py-16">
						<div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
					</div>
				) : lists.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
						<div className="w-12 h-12 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
							<List className="w-5 h-5 text-zinc-600" />
						</div>
						<p className="text-sm text-zinc-500 text-center">Você ainda não tem listas.</p>
						<p className="text-xs text-zinc-600 text-center">Crie uma lista no seu perfil para começar.</p>
					</div>
				) : (
					<div className="max-h-[55vh] md:max-h-80 overflow-y-auto">
						{lists.map(list => {
							const isToggling = toggling === list.id

							return (
								<button
									key={list.id}
									onClick={() => handleToggle(list)}
									disabled={!!toggling}
									className={`w-full flex items-center gap-3 px-5 py-3.5 sm:px-4 sm:py-3 text-left transition-colors cursor-pointer disabled:cursor-wait border-b border-zinc-800/50 last:border-0 ${
										list.hasGame
											? "bg-indigo-500/5 hover:bg-indigo-500/10"
											: "hover:bg-zinc-800/50 active:bg-zinc-800"
									}`}
								>
									<div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
										list.hasGame
											? "bg-indigo-500 text-white"
											: "bg-zinc-800 border border-zinc-600"
									}`}>
										{isToggling ? (
											<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										) : list.hasGame ? (
											<Check className="w-3 h-3" />
										) : null}
									</div>

									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5">
											<span className={`text-sm font-medium truncate ${
												list.hasGame ? "text-indigo-400" : "text-white"
											}`}>
												{list.title}
											</span>
											{list.is_public === false && (
												<Lock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
											)}
										</div>
										<span className="text-xs text-zinc-500">
											{list.games_count || 0} jogo{(list.games_count || 0) !== 1 ? "s" : ""}
										</span>
									</div>
								</button>
							)
						})}

						{hasMore && (
							<button
								onClick={handleLoadMore}
								disabled={loadingMore}
								className="w-full py-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
							>
								{loadingMore ? (
									<div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin mx-auto" />
								) : (
									"Carregar mais"
								)}
							</button>
						)}
					</div>
				)}
			</div>
		</Modal>
	)
}