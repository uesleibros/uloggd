import { Link } from "react-router-dom"

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
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
                    </svg>
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

              <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}