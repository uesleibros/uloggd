import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Calendar, Gamepad2, Twitch, Radio, Clock } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import CountUp from "@components/UI/CountUp"
import SocialLinks from "@components/User/SocialLinks"
import SteamAchievements from "@components/Game/SteamAchievements"
import ProfileRetroAchievements from "@components/Game/RetroAchievements"
import PSNTrophies from "@components/Game/PSNTrophies"
import RatingStats from "../components/RatingStats"
import { SteamIcon, NintendoIcon } from "#constants/customIcons"

export function ProfileSidebar({
  profile,
  counts,
  followersCount,
  followingCount,
  followsYou,
  onFollowersClick,
  onFollowingClick,
}) {
  const { t } = useTranslation("profile")
  const { formatDateLong } = useDateTime()
  const isBanned = profile.is_banned

  return (
    <div className={`w-full ${isBanned ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-zinc-700/50">
          <button
            onClick={onFollowersClick}
            className="py-4 px-3 text-center hover:bg-zinc-800/40 transition-colors cursor-pointer"
          >
            <div className="text-xl font-bold text-white leading-none">
              <CountUp end={followersCount} />
            </div>
            <div className="text-[11px] text-zinc-500 mt-1.5">{t("stats.followers")}</div>
          </button>
          <button
            onClick={onFollowingClick}
            className="py-4 px-3 text-center hover:bg-zinc-800/40 transition-colors cursor-pointer"
          >
            <div className="text-xl font-bold text-white leading-none">
              <CountUp end={followingCount} />
            </div>
            <div className="text-[11px] text-zinc-500 mt-1.5">{t("stats.following")}</div>
          </button>
        </div>

        <div className="border-t border-zinc-700/50" />

        <div className="p-4 space-y-2.5">
          <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            {t("stats.gameStats")}
          </h3>
          <div className="space-y-1">
            <StatRow label={t("stats.playing")} value={counts?.playing} />
            <StatRow label={t("stats.played")} value={counts?.played} />
            <StatRow label={t("stats.backlog")} value={counts?.backlog} />
            <StatRow label={t("stats.rated")} value={counts?.rated} />
          </div>
        </div>

        {(profile.social_links?.length > 0 || profile.connections?.length > 0) && (
          <>
            <div className="border-t border-zinc-700/50" />
            <div className="p-4">
              <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">
                {t("stats.links")}
              </h3>
              <SocialLinks
                links={profile.social_links}
                connections={profile.connections}
              />
            </div>
          </>
        )}

        <div className="border-t border-zinc-700/50" />
        <div className="px-4 py-3 flex items-center gap-2 text-xs text-zinc-500">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{formatDateLong(profile.created_at)}</span>
        </div>
      </div>

      <div className="mt-4">
        <RatingStats userId={profile.user_id} />
      </div>

      <ActivityCard stream={profile.stream} userId={profile.user_id} />
      <SteamAchievements userId={profile.user_id} compact />
      <PSNTrophies userId={profile.user_id} compact />
      <ProfileRetroAchievements userId={profile.user_id} />
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/30 transition-colors">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white tabular-nums">
        <CountUp end={value || 0} />
      </span>
    </div>
  )
}

function ActivityCard({ stream, userId }) {
  const { t } = useTranslation("profile")
  const [steamPresence, setSteamPresence] = useState(null)
  const [nintendoPresence, setNintendoPresence] = useState(null)

  useEffect(() => {
    setSteamPresence(null)
    setNintendoPresence(null)
    if (!userId) return

    let cancelled = false

    const fetchPresences = async () => {
      const [steamRes, nintendoRes] = await Promise.all([
        fetch(`/api/steam/presence?userId=${userId}`).catch(() => null),
        fetch(`/api/nintendo/presence?userId=${userId}`).catch(() => null),
      ])

      if (cancelled) return

      try {
        if (steamRes?.ok) {
          const steamData = await steamRes.json()
          if (steamData.playing) setSteamPresence(steamData)
        }
      } catch (err) {
        console.error("steam presence error:", err)
      }

      try {
        if (nintendoRes?.ok) {
          const nintendoData = await nintendoRes.json()
          if (nintendoData.connected && nintendoData.presence?.isOnline) {
            setNintendoPresence(nintendoData.presence)
          }
        }
      } catch (err) {
        console.error("nintendo presence error:", err)
      }
    }

    fetchPresences()

    return () => {
      cancelled = true
    }
  }, [userId])

  if (!stream && !steamPresence && !nintendoPresence) return null

  return (
    <div className="mt-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700/50">
        <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Gamepad2 className="w-3.5 h-3.5" />
          {t("stats.activity")}
        </h3>
      </div>

      <div className="p-3 space-y-2">
        {stream && (
          <a
            href={`https://twitch.tv/${stream.twitch_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/30 hover:border-purple-500/50 rounded-lg px-3 py-2.5 transition-all"
          >
            <div className="relative flex-shrink-0">
              <img
                src={stream.thumbnail}
                alt={stream.title}
                className="w-12 h-7 object-cover rounded border border-purple-500/20"
              />
              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-red-600 text-white text-[7px] font-bold px-1 py-px rounded shadow-lg">
                <Radio className="w-1.5 h-1.5" />
                LIVE
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Twitch className="w-3 h-3 text-purple-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-white truncate">
                  {stream.game}
                </span>
              </div>
              <div className="text-[10px] text-purple-300/60 mt-0.5">
                {stream.viewers.toLocaleString()} {t("stats.watching")}
              </div>
            </div>
          </a>
        )}

        {steamPresence && (
          <div className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 border border-zinc-700/50 hover:border-[#66c0f4]/40 transition-all">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${steamPresence.steam.header})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/95 via-zinc-900/90 to-zinc-900/80" />
            <div className="relative z-10 flex items-center gap-3 w-full">
              {steamPresence.game?.cover && (
                <div className="relative flex-shrink-0">
                  <img
                    src={steamPresence.game?.cover}
                    alt={steamPresence.game?.name || steamPresence.steam.name}
                    className="w-7 h-10 object-cover rounded shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
                    <SteamIcon className="w-2.5 h-2.5 text-[#66c0f4]" />
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-white truncate">
                  {steamPresence.game?.name || steamPresence.steam.name}
                </div>
                <div className="text-[10px] text-[#66c0f4] mt-0.5">
                  {t("stats.playingNow")}
                </div>
              </div>
              {steamPresence.game?.slug && (
                <Link
                  to={`/game/${steamPresence.game.slug}`}
                  className="text-[10px] bg-[#66c0f4]/20 hover:bg-[#66c0f4] hover:text-[#171a21] text-[#66c0f4] px-2 py-1 rounded font-semibold transition-colors flex-shrink-0"
                >
                  {t("stats.view")}
                </Link>
              )}
            </div>
          </div>
        )}

        {nintendoPresence && (
          <div className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 border border-zinc-700/50 hover:border-[#e60012]/40 transition-all">
            {nintendoPresence.game?.imageUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${nintendoPresence.game.imageUrl})` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/95 via-zinc-900/90 to-zinc-900/80" />
            <div className="relative z-10 flex items-center gap-3 w-full">
              {nintendoPresence.game?.imageUrl ? (
                <div className="relative flex-shrink-0">
                  <img
                    src={nintendoPresence.game.imageUrl}
                    alt={nintendoPresence.game?.name}
                    className="w-7 h-10 object-cover rounded shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
                    <NintendoIcon className="w-2.5 h-2.5 text-[#e60012]" />
                  </div>
                </div>
              ) : (
                <div className="relative flex-shrink-0">
                  <img
                    src={nintendoPresence.user.imageUri}
                    alt={nintendoPresence.user.name}
                    className="w-9 h-9 object-cover rounded-full shadow-lg border-2 border-[#e60012]/30"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
                    <NintendoIcon className="w-2.5 h-2.5 text-[#e60012]" />
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-white truncate">
                  {nintendoPresence.game?.name || nintendoPresence.user.name}
                </div>
                {nintendoPresence.game?.sysDescription && (
                  <div className="text-[11px] font-semibold text-zinc-400 truncate">
                    {nintendoPresence.game?.sysDescription}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-[#e60012]">
                    {nintendoPresence.isPlaying ? t("stats.playingNow") : t("stats.online")}
                  </span>
                  {nintendoPresence.game?.sessionTime && (
                    <>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {nintendoPresence.game.sessionTime}
                      </span>
                    </>
                  )}
                  {nintendoPresence.game?.totalPlayTime && (
                    <>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                        {nintendoPresence.game.totalPlayTime} total
                      </span>
                    </>
                  )}
                </div>
              </div>
              {nintendoPresence.game?.name && (
                <a
                  href={
                    nintendoPresence.game.shopUrl ||
                    `https://www.nintendo.com/search/#q=${encodeURIComponent(nintendoPresence.game.name)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] bg-[#e60012]/20 hover:bg-[#e60012] hover:text-white text-[#e60012] px-2 py-1 rounded font-semibold transition-colors flex-shrink-0"
                >
                  eShop
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}