import { useState } from "react"
import GameCard from "@components/Game/GameCard"
import DragScrollRow from "@components/UI/DragScrollRow"
import { VideoGrid } from "../components/VideoGrid"

function RelatedGamesNavigation({ tabs, activeTab, onTabChange }) {
	return (
		<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
			{tabs.map((tab) => (
				<button
					key={tab.key}
					onClick={() => onTabChange(tab.key)}
					className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
						activeTab === tab.key
							? "bg-white text-black"
							: "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
					}`}
				>
					{tab.label}
					<span
						className={`ml-1.5 text-xs ${
							activeTab === tab.key ? "text-zinc-600" : "text-zinc-500"
						}`}
					>
						{tab.data.length}
					</span>
				</button>
			))}
		</div>
	)
}

function RelatedGamesContent({ current }) {
	if (current.key === "altNames") {
		return (
			<div className="flex flex-wrap gap-2">
				{current.data.map((alt, i) => (
					<div
						key={i}
						className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg"
					>
						<span className="text-sm text-zinc-300">{alt.name}</span>
						{alt.comment && <span className="text-xs text-zinc-500">({alt.comment})</span>}
					</div>
				))}
			</div>
		)
	}

	if (current.key === "videos") {
		return <VideoGrid videos={current.data} />
	}

	return (
		<DragScrollRow className="gap-4 pb-2">
			{current.data.map((g) => (
				<GameCard key={g.id} game={g} draggable={false} />
			))}
		</DragScrollRow>
	)
}

export function RelatedGamesSection({ game }) {
	const tabs = [
		{ key: "dlcs", label: "DLCs", data: game.dlcs },
		{ key: "expansions", label: "Expansões", data: game.expansions },
		{ key: "standalone", label: "Standalone", data: game.standalone_expansions },
		{ key: "remakes", label: "Remakes", data: game.remakes },
		{ key: "remasters", label: "Remasters", data: game.remasters },
		{ key: "altNames", label: "Nomes Alternativos", data: game.alternative_names },
		{ key: "videos", label: "Vídeos", data: game.videos },
		{ key: "similar", label: "Similares", data: game.similar_games },
	].filter((t) => t.data?.length > 0)

	const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? null)

	if (!tabs.length) return null

	const current = tabs.find((t) => t.key === activeTab) ?? tabs[0]

	return (
		<div className="mt-12 md:mt-16">
			<div className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold text-white">Conteúdo relacionado</h2>
				<RelatedGamesNavigation
					tabs={tabs}
					activeTab={activeTab}
					onTabChange={setActiveTab}
				/>
			</div>
			<hr className="my-4 border-zinc-700" />
			<RelatedGamesContent current={current} />
		</div>
	)
}