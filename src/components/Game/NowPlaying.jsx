import { Link } from "react-router-dom"
import { Gamepad2, ChevronRight } from "lucide-react"

export default function NowPlaying({ games, igdbGames }) {
	const playingGames = Object.entries(games)
		.filter(([, g]) => g.playing)
		.sort((a, b) => new Date(b[1].latestAt || 0) - new Date(a[1].latestAt || 0))
		.slice(0, 3)

	if (playingGames.length === 0) return null

	return (
		<div className="mt-6">
			<div className="flex flex-col gap-2">
				{playingGames.map(([slug]) => {
					const game = igdbGames[slug]
					if (!game) return null

					const cover = game.cover?.url
						? game.cover.url.replace("t_cover_big", "t_cover_small")
						: null

					return (
						<Link
							key={slug}
							to={`/game/${slug}`}
							className="group flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-800 hover:border-zinc-700 transition-all duration-200"
						>
							<div className="relative flex-shrink-0">
								{cover ? (
									<img
										src={`https:${cover}`}
										alt={game.name}
										className="w-8 h-10 rounded object-cover bg-zinc-700"
										draggable={false}
									/>
								) : (
									<div className="w-8 h-10 rounded bg-zinc-700 flex items-center justify-center">
										<Gamepad2 className="w-4 h-4 text-zinc-500" />
									</div>
								)}
								<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
							</div>

							<div className="flex-1 min-w-0">
								<p className="text-[11px] font-medium text-green-400 uppercase tracking-wider leading-none">
									Jogando
								</p>
								<p className="text-sm font-medium text-white truncate mt-0.5 group-hover:text-zinc-200 transition-colors">
									{game.name}
								</p>
							</div>

							<ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
						</Link>
					)
				})}
			</div>
		</div>
	)
}