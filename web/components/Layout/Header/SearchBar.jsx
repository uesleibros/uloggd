import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Gamepad2, Users, ListMusic, ArrowRight } from "lucide-react"
import PlatformIcons from "@components/Game/PlatformIcons"
import UserDisplay from "@components/User/UserDisplay"
import { formatDateShort } from "#utils/formatDate"
import { LoadingSpinner } from "./icons"

const TABS = [
	{ id: "games", label: "Jogos", icon: Gamepad2 },
	{ id: "users", label: "Usuários", icon: Users },
	{ id: "lists", label: "Listas", icon: ListMusic },
]

function GameResult({ item, onSelect }) {
	return (
		<li
			onMouseDown={() => onSelect(`/game/${item.slug}`)}
			className="group cursor-pointer px-3 py-2.5 hover:bg-indigo-500/10 transition-colors"
		>
			<div className="flex items-center gap-3">
				{item.cover ? (
					<img
						src={`https:${item.cover.url}`}
						alt=""
						className="h-12 w-9 rounded object-cover bg-zinc-800 flex-shrink-0"
					/>
				) : (
					<div className="h-12 w-9 rounded bg-zinc-800 flex-shrink-0" />
				)}
				<div className="flex-1 min-w-0">
					<span className="group-hover:text-indigo-400 transition-colors font-medium text-sm text-white truncate block">
						{item.name}
					</span>
					<div className="flex items-center gap-2 mt-1">
						{item.first_release_date && (
							<span className="text-xs text-zinc-500">
								{formatDateShort(item.first_release_date)}
							</span>
						)}
						<PlatformIcons icons={item.platformIcons} />
					</div>
				</div>
			</div>
		</li>
	)
}

function UserResult({ item, onSelect }) {
	return (
		<li
			onMouseDown={() => onSelect(`/u/${item.username}`)}
			className="group cursor-pointer px-3 py-2.5 hover:bg-indigo-500/10 transition-colors"
		>
			<div className="flex items-center gap-3">
				<UserDisplay user={item} size="sm" showUsername={false} showStatus={false} />
				<div className="flex-1 min-w-0">
					<span className="group-hover:text-indigo-400 transition-colors font-medium text-sm text-white truncate block">
						{item.username}
					</span>
					{item.is_moderator && (
						<span className="text-xs text-indigo-400">Moderador</span>
					)}
				</div>
			</div>
		</li>
	)
}

function ListResult({ item, onSelect }) {
	return (
		<li
			onMouseDown={() => onSelect(`/list/${item.shortId}`)}
			className="group cursor-pointer px-3 py-2.5 hover:bg-indigo-500/10 transition-colors"
		>
			<div className="flex items-center gap-3">
				<div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
					<ListMusic className="w-5 h-5 text-zinc-500" />
				</div>
				<div className="flex-1 min-w-0">
					<span className="group-hover:text-indigo-400 transition-colors font-medium text-sm text-white truncate block">
						{item.title}
					</span>
					<div className="flex items-center gap-2 text-xs text-zinc-500">
						<span>{item.games_count} jogos</span>
						{item.owner && (
							<>
								<span>•</span>
								<span>por {item.owner.username}</span>
							</>
						)}
					</div>
				</div>
			</div>
		</li>
	)
}

function SearchResults({ results, loading, activeTab, onSelect, onViewAll, query }) {
	const ResultComponent = {
		games: GameResult,
		users: UserResult,
		lists: ListResult,
	}[activeTab]

	if (loading) return <LoadingSpinner />

	if (results.length === 0) {
		return (
			<div className="px-3 py-6 text-sm text-zinc-500 text-center">
				Nenhum resultado encontrado
			</div>
		)
	}

	return (
		<>
			<ul className="py-1">
				{results.map((item) => (
					<ResultComponent key={item.id} item={item} onSelect={onSelect} />
				))}
			</ul>
			<button
				onMouseDown={onViewAll}
				className="w-full px-3 py-2.5 border-t border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2"
			>
				Ver todos os resultados para "{query}"
				<ArrowRight className="w-4 h-4" />
			</button>
		</>
	)
}

function TabBar({ activeTab, onChange, counts }) {
	return (
		<div className="flex border-b border-zinc-800">
			{TABS.map(({ id, label, icon: Icon }) => (
				<button
					key={id}
					onMouseDown={(e) => { e.preventDefault(); onChange(id) }}
					className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
						activeTab === id
							? "text-indigo-400 border-b-2 border-indigo-400 -mb-px"
							: "text-zinc-500 hover:text-zinc-300"
					}`}
				>
					<Icon className="w-3.5 h-3.5" />
					{label}
					{counts[id] > 0 && (
						<span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded-full">
							{counts[id]}
						</span>
					)}
				</button>
			))}
		</div>
	)
}

function SearchInput({ query, onChange, onFocus, onBlur, onKeyDown, focused = false, variant = "desktop" }) {
	const baseClasses = "rounded-md bg-zinc-800 text-sm text-white placeholder-zinc-500 outline-none border"

	const variants = {
		desktop: `h-8 w-48 lg:w-64 bg-zinc-800/80 pl-9 pr-3 transition-all duration-200 ${
			focused
				? "border-zinc-600 bg-zinc-800 w-56 lg:w-72"
				: "border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800"
		}`,
		mobile: "h-10 w-full pl-10 pr-3 border-zinc-700",
	}

	return (
		<div className="relative">
			<Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focused ? "text-zinc-300" : "text-zinc-500"}`} />
			<input
				type="text"
				value={query}
				onChange={onChange}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
				placeholder="Buscar jogos, usuários, listas..."
				className={`${baseClasses} ${variants[variant]}`}
			/>
		</div>
	)
}

export function SearchBar({ variant = "desktop", onSelect, className = "" }) {
	const [query, setQuery] = useState("")
	const [results, setResults] = useState({ games: [], users: [], lists: [] })
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const [focused, setFocused] = useState(false)
	const [activeTab, setActiveTab] = useState("games")
	const timeoutRef = useRef(null)
	const navigate = useNavigate()

	useEffect(() => {
		if (!query.trim()) {
			setResults({ games: [], users: [], lists: [] })
			setLoading(false)
			return
		}

		setLoading(true)
		setOpen(true)
		clearTimeout(timeoutRef.current)

		timeoutRef.current = setTimeout(async () => {
			try {
				const [gamesRes, usersRes, listsRes] = await Promise.all([
					fetch("/api/igdb/autocomplete", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ query }),
					}).then(r => r.json()),
					fetch("/api/users/search", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ query, limit: 5 }),
					}).then(r => r.json()),
					fetch("/api/lists/search", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ query, limit: 5 }),
					}).then(r => r.json()),
				])

				setResults({
					games: gamesRes || [],
					users: usersRes || [],
					lists: listsRes || [],
				})
				setOpen(true)
			} catch (err) {
				console.error(err)
			} finally {
				setLoading(false)
			}
		}, 400)

		return () => clearTimeout(timeoutRef.current)
	}, [query])

	function handleNavigate(path) {
		setQuery("")
		setOpen(false)
		onSelect?.()
		navigate(path)
	}

	function handleViewAll() {
		handleNavigate(`/search?q=${encodeURIComponent(query)}&tab=${activeTab}`)
	}

	function handleKeyDown(e) {
		if (e.key === "Enter" && query.trim()) {
			e.preventDefault()
			handleViewAll()
		}
	}

	function handleFocus() {
		setFocused(true)
		if (query) setOpen(true)
	}

	function handleBlur() {
		setFocused(false)
		setTimeout(() => setOpen(false), 200)
	}

	const counts = {
		games: results.games.length,
		users: results.users.length,
		lists: results.lists.length,
	}

	const hasResults = query.trim() && (loading || counts.games > 0 || counts.users > 0 || counts.lists > 0)
	const resultsClass = variant === "desktop" ? "right-0 w-96" : "left-0 right-0"

	return (
		<div className={`relative ${className}`}>
			<SearchInput
				query={query}
				onChange={(e) => setQuery(e.target.value)}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				focused={focused}
				variant={variant}
			/>

			{open && hasResults && (
				<div className={`absolute top-full z-50 mt-1.5 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden ${resultsClass}`}>
					<TabBar activeTab={activeTab} onChange={setActiveTab} counts={counts} />
					<div className="max-h-80 overflow-y-auto">
						<SearchResults
							results={results[activeTab]}
							loading={loading}
							activeTab={activeTab}
							onSelect={handleNavigate}
							onViewAll={handleViewAll}
							query={query}
						/>
					</div>
				</div>
			)}
		</div>
	)
}