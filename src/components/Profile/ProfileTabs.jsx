import { Link } from "react-router-dom"
import DragScrollRow from "../UI/DragScrollRow"
import GameCard from "../Game/GameCard"
import Pagination from "./Pagination"

const TAB_ICONS = {
  playing: (cn) => <svg className={cn} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>,
  played: (cn) => <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.657-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" /></svg>,
  completed: (cn) => <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  backlog: (cn) => <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  wishlist: (cn) => <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21" /></svg>,
  liked: (cn) => <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
  dropped: (cn) => <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
  shelved: (cn) => <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>,
  rated: (cn) => <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
}

const TABS = [
  { key: "playing", label: "Jogando" },
  { key: "played", label: "Jogados" },
  { key: "completed", label: "Zerados" },
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
  completed: { own: "Você ainda não zerou nenhum jogo.", other: (u) => `${u} ainda não zerou nenhum jogo.` },
  backlog: { own: "Seu backlog está vazio.", other: (u) => `${u} não tem jogos no backlog.` },
  wishlist: { own: "Sua wishlist está vazia.", other: (u) => `${u} não tem jogos na wishlist.` },
  dropped: { own: "Você não abandonou nenhum jogo.", other: (u) => `${u} não abandonou nenhum jogo.` },
  shelved: { own: "Você não engavetou nenhum jogo.", other: (u) => `${u} não engavetou nenhum jogo.` },
  liked: { own: "Você ainda não curtiu nenhum jogo.", other: (u) => `${u} ainda não curtiu nenhum jogo.` },
  rated: { own: "Você ainda não avaliou nenhum jogo.", other: (u) => `${u} ainda não avaliou nenhum jogo.` },
}

function TabIcon({ tabKey, className = "w-3.5 h-3.5" }) {
  const render = TAB_ICONS[tabKey]
  return render ? render(className) : null
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

export default function ProfileTabs({ activeTab, onTabChange, counts, games, profileGames, loading, isOwnProfile, username, currentPage, totalPages, onPageChange }) {

  return (
    <div className="mt-12">
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
        <div className="flex flex-wrap gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-32 h-44 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : games.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-3">
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
}