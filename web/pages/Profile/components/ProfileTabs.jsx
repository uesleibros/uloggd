import { forwardRef } from "react"
import { Link } from "react-router-dom"
import { Play, CheckCircle, Clock, Gift, Ban, Archive, Star } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import DragScrollRow from "@components/UI/DragScrollRow"
import GameCard, { GameCardSkeleton } from "@components/Game/GameCard"
import Pagination from "@components/UI/Pagination"

const TAB_ICONS = {
  playing: Play,
  played: CheckCircle,
  backlog: Clock,
  wishlist: Gift,
  dropped: Ban,
  shelved: Archive,
  rated: Star,
}

const TAB_KEYS = ["playing", "played", "backlog", "wishlist", "dropped", "shelved", "rated"]

function TabIcon({ tabKey, className = "w-3.5 h-3.5" }) {
  const IconComponent = TAB_ICONS[tabKey]
  return IconComponent ? <IconComponent className={className} /> : null
}

function EmptyTab({ tabKey, isOwnProfile, username }) {
  const { t } = useTranslation("profile")

  const message = isOwnProfile
    ? t(`tabs.empty.${tabKey}.own`, { defaultValue: t("tabs.empty.fallback") })
    : t(`tabs.empty.${tabKey}.other`, { username, defaultValue: t("tabs.empty.fallback") })

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
        <TabIcon tabKey={tabKey} className="w-6 h-6" />
      </div>
      <p className="text-sm text-zinc-500">{message}</p>
      {isOwnProfile && (
        <Link to="/" className="mt-1 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors">
          {t("tabs.exploreGames")}
        </Link>
      )}
    </div>
  )
}

function GamesSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {[...Array(16)].map((_, i) => (
        <GameCardSkeleton key={i} responsive />
      ))}
    </div>
  )
}

const ProfileTabs = forwardRef(function ProfileTabs({
  activeTab,
  onTabChange,
  counts,
  games,
  loading,
  isOwnProfile,
  username,
  currentPage,
  totalPages,
  onPageChange,
}, ref) {
  const { t } = useTranslation("profile")

  return (
    <div className="mt-12" ref={ref}>
      <DragScrollRow className="pb-1">
        <div className="flex gap-2 w-max">
          {TAB_KEYS.map(key => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                activeTab === key
                  ? "bg-white text-black"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
              }`}
            >
              <TabIcon tabKey={key} />
              {t(`tabs.${key}`)}
              <span className={`text-xs ${activeTab === key ? "text-zinc-600" : "text-zinc-500"}`}>
                {counts[key] || 0}
              </span>
            </button>
          ))}
        </div>
      </DragScrollRow>

      <hr className="my-4 border-zinc-700" />

      {loading ? (
        <GamesSkeleton />
      ) : games.length > 0 ? (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {games.map(game => (
              <div key={game.slug}>
                <GameCard
                  game={game}
                  userRating={game.avgRating}
                  responsive
                />
              </div>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      ) : (
        <EmptyTab tabKey={activeTab} isOwnProfile={isOwnProfile} username={username} />
      )}
    </div>
  )
})

export default ProfileTabs
