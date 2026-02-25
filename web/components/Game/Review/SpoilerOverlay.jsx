import { AlertTriangle, Eye } from "lucide-react"

export default function SpoilerOverlay({ onReveal }) {
	return (
		<div className="relative rounded-xl bg-zinc-800/50 border border-zinc-700 p-6 flex flex-col items-center justify-center gap-4">
			<div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
				<AlertTriangle className="w-5 h-5 text-amber-400" />
			</div>
			<div className="text-center">
				<p className="text-sm font-medium text-zinc-300">Esta review contém spoilers</p>
				<p className="text-xs text-zinc-500 mt-1">O conteúdo está oculto para proteger sua experiência.</p>
			</div>
			<button
				onClick={onReveal}
				className="px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 rounded-lg text-sm text-zinc-300 hover:text-white font-medium cursor-pointer transition-all duration-200 flex items-center gap-2"
			>
				<Eye className="w-4 h-4" />
				Revelar conteúdo
			</button>
		</div>
	)
}