import { useState } from "react"
import {
  Puzzle, Package, Box, RefreshCw, Sparkles,
  Languages, Play, Gamepad2
} from "lucide-react"
import GameCard from "@components/Game/GameCard"
import DragScrollRow from "@components/UI/DragScrollRow"
import { VideoGrid } from "../components/VideoGrid"

const TAB_CONFIG = {
  dlcs: { label: "DLCs", icon: Puzzle },
  expansions: { label: "Expansões", icon: Package },
  standalone: { label: "Standalone", icon: Box },
  remakes: { label: "Remakes", icon: RefreshCw },
  remasters: { label: "Remasters", icon: Sparkles },
  altNames: { label: "Nomes Alternativos", icon: Languages },
  videos: { label: "Vídeos", icon: Play },
  similar: { label: "Similares", icon: Gamepad2 },
}

function RelatedGamesNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="border-b border-zinc-800/80">
      <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = TAB_CONFIG[tab.key]?.icon

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {Icon && (
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                />
              )}
              {tab.label}
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums transition-colors ${
                  isActive
                    ? "bg-indigo-500/15 text-indigo-400"
                    : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-400"
                }`}
              >
                {tab.data.length}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-indigo-500 rounded-t-full" />
              )}
            </button>
          )
        })}
      </nav>
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
      <h2 className="text-lg font-semibold text-white mb-4">Conteúdo relacionado</h2>
      <RelatedGamesNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="mt-6">
        <RelatedGamesContent current={current} />
      </div>
    </div>
  )
}
