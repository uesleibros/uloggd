import { forwardRef } from "react"
import { Link } from "react-router-dom"
import { Play, CheckCircle, Clock, Gift, Heart, Ban, Archive, Star } from "lucide-react"
import DragScrollRow from "../UI/DragScrollRow"
import GameCard, { GameCardSkeleton } from "../Game/GameCard"
import Pagination from "./Pagination"

const TAB_ICONS = {
  playing: Play,
  played: CheckCircle,
  backlog: Clock,
  wishlist: Gift,
  liked: Heart,
  dropped: Ban,
  shelved: Archive,
  rated: Star,
}

const TABS = [
  { key: "playing", label: "Jogando" },
  { key: "played", label: "Jogados" },
  { key: "backlog", label: "Backlog" },
  { key: "wishlist", label: "Wishlist" },
  { key: "liked", label: "Curtidos" },
  { key: "dropped", label: "Largados" },
  { key: "shelved", label: "Engavetados" },
  { key: "rated", label: "Avaliados" },
]

const EMPTY_MESSAGES = {
  playing: { own: "Você não está jogando nada no momento.", other: (u) => `${u} não está jogando nada no momento.` },
  played: { own: "Você ainda não jogou nenhum jogo.", other: (u) => `${u} ainda não jogou nenhum jogo.` },
  backlog: { own: "Seu backlog está vazio.", other: (u) => `${u} não tem jogos no backlog.` },
  wishlist: { own: "Sua wishlist está vazia.", other: (u) => `${u} não tem jogos na wishlist.` },
  dropped: { own: "Você não abandonou nenhum jogo.", other: (u) => `${u} não abandonou nenhum jogo.` },
  shelved: { own: "Você não engavetou nenhum jogo.", other: (u) => `${u} não engavetou nenhum jogo.` },
  liked: { own: "Você ainda não curtiu nenhum jogo.", other: (u) => `${u} ainda não curtiu nenhum jogo.` },
  rated: { own: "Você ainda não avaliou nenhum jogo.", other: (u) => `${u} ainda não avaliou nenhum jogo.` },
}

function TabIcon({ tabKey, className = "w-3.5 h-3.5" }) {
  const IconComponent = TAB_ICONS[tabKey]
  return IconComponent ? <IconComponent className={className} /> : null
}

function EmptyTab({ tabKey, isOwnProfile, username }) {
  const msg = EMPTY_MESSAGES[tabKey] || { own: "Nenhum jogo aqui.", other: () => "Nenhum jogo aqui." }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
        <TabIcon tabKey={tabKey} className="w-6 h-6" />
      </div>
      <p className="text-sm text-zinc-500">
        {isOwnProfile ? msg.own : msg.other(username)}
      </p>
      {isOwnProfile && (
        <Link to="/" className="mt-1 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors">
          Explorar jogos
        </Link>
      )}
    </div>
  )
}

const ProfileTabs = forwardRef(function ProfileTabs({ activeTab, onTabChange, counts, games, profileGames, loading, isOwnProfile, username, currentPage, totalPages, onPageChange }, ref) {
  return (
    <div className="mt-12" ref={ref}>
      <DragScrollRow className="pb-1">
        <div className="flex gap-2 w-max">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                activeTab === tab.key
                  ? "bg-white text-black"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
              }`}
            >
              <TabIcon tabKey={tab.key} />
              {tab.label}
              <span className={`text-xs ${activeTab === tab.key ? "text-zinc-600" : "text-zinc-500"}`}>
                {counts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>
      </DragScrollRow>

      <hr className="my-4 border-zinc-700" />

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-8 gap-3">
          {[...Array(14)].map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      ) : games.length > 0 ? (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-8 gap-3">
            {games.map(game => (
              <GameCard key={game.slug} game={game} userRating={profileGames[game.slug]?.avgRating} />
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </>
      ) : (
        <EmptyTab tabKey={activeTab} isOwnProfile={isOwnProfile} username={username} />
      )}
    </div>
  )
})

export default ProfileTabs

