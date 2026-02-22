import { PlatformList } from "@components/Game/PlatformBadge"
import { AgeRatings } from "../components/AgeRatings"
import { Websites } from "../components/Websites"
import { Keywords } from "../components/Keywords"
import { ParentGameLink } from "./GameHeader"

export function GameSidebar({ game }) {
  return (
    <div className="flex-shrink-0">
      <div className="flex flex-row md:flex-col gap-4 md:gap-0">
        {game.cover ? (
          <img
            src={`https:${game.cover.url}`}
            alt={game.name}
            className="w-32 sm:w-48 md:w-64 rounded-lg shadow-2xl bg-zinc-800 select-none flex-shrink-0"
          />
        ) : (
          <div className="w-32 h-48 sm:w-48 sm:h-72 md:w-64 md:h-96 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <span className="text-zinc-500 text-xs sm:text-sm text-center px-2">{game.name}</span>
          </div>
        )}
      </div>

      <ParentGameLink parentGame={game.parent_game} />

      {game.ageRatings?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-white mb-4">Classificações de Idade</h2>
          <AgeRatings ratings={game.ageRatings} />
        </div>
      )}

      <Websites websites={game.websites} />
      <hr className="my-6 border-zinc-700" />

      {game.platforms?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Plataformas</h2>
          <PlatformList
            platforms={game.platforms}
            variant="badge"
            className="max-w-sm"
            badgeClassName="hover:bg-zinc-700/50 transition-colors"
          />
        </div>
      )}

      <Keywords keywords={game.keywords} />
    </div>
  )
}