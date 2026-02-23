import { Search, X } from "lucide-react"

export function SearchHeader({ query, onChange, onClear, totalResults, loading }) {
	return (
		<div className="pt-6 pb-4">
			<div className="mb-5">
				<h1 className="text-xl font-bold text-white">Explorar</h1>
				<p className="text-sm text-zinc-500 mt-0.5">
					Encontre jogos, usuários e listas
				</p>
			</div>

			<div className="relative">
				<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
				<input
					type="text"
					value={query}
					onChange={(e) => onChange(e.target.value)}
					placeholder="O que você está procurando?"
					className="w-full h-11 pl-11 pr-11 bg-zinc-900/80 border border-zinc-700 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
					autoFocus
				/>
				{query && (
					<button
						onClick={onClear}
						className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-white flex items-center justify-center transition-all cursor-pointer hover:bg-zinc-800/50"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{query && !loading && totalResults > 0 && (
				<p className="mt-3 text-xs text-zinc-500">
					<span className="text-zinc-300 font-medium">{totalResults.toLocaleString()}</span>
					{" "}resultado{totalResults !== 1 && "s"} encontrado{totalResults !== 1 && "s"}
				</p>
			)}
		</div>
	)
}