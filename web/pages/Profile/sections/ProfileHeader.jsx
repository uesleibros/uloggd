import { useState, useEffect } from "react"
import { Ban, Trophy } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import ThinkingBubble from "@components/User/ThinkingBubble"
import ModeratorMenu from "@components/Moderation/ModeratorMenu"
import ProfileActions from "../components/ProfileActions"
import { MineralsDisplay } from "@components/Minerals/MineralsDisplay"
import { getStatus } from "#utils/onlineStatus"
import { useDateTime } from "#hooks/useDateTime"

function GlobalRank({ userId }) {
  const { t } = useTranslation("profile")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetchRank() {
      try {
        const res = await fetch(`/api/stats/rank?userId=${userId}`)
        const json = await res.json()
        if (json.rank) setData(json)
      } catch {}
      finally {
        setLoading(false)
      }
    }

    fetchRank()
  }, [userId])

  if (loading || !data?.rank) return null

  const isTop10 = data.rank <= 10
  const isTop100 = data.rank <= 100

  return (
    <Link
      to="/leaderboard"
      className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
        isTop10
          ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
          : isTop100
          ? "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20"
          : "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800"
      }`}
    >
      <Trophy className={`w-3 h-3 ${
        isTop10 ? "text-amber-400" : isTop100 ? "text-indigo-400" : "text-zinc-500"
      }`} />
      <span className={`text-[11px] font-medium ${
        isTop10 ? "text-amber-400" : isTop100 ? "text-indigo-400" : "text-zinc-400"
      }`}>
        #{data.rank.toLocaleString()}
      </span>
      <span className="text-[10px] text-zinc-600 hidden sm:inline">
        ranking global
      </span>
    </Link>
  )
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  currentUser,
  isFollowing,
  followLoading,
  followsYou,
  onFollow,
  onEditProfile,
  onProfileUpdate,
}) {
  const { t } = useTranslation("profile")
  const { getTimeAgo } = useDateTime()

  const isBanned = profile.is_banned
  const isModerator = currentUser?.is_moderator
  const status = getStatus(profile.last_seen, profile.status)

  return (
    <div>
      {isBanned && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-red-300">{t("header.banned.title")}</p>
              <p className="text-[11px] sm:text-xs text-red-400/70 mt-0.5">{t("header.banned.description")}</p>
              {isModerator && profile.ban_reason && (
                <p className="text-[11px] sm:text-xs text-red-400/60 mt-1.5">
                  {t("header.banned.reason", { reason: profile.ban_reason })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className={`flex-shrink-0 mt-6 flex justify-center sm:justify-start ${isBanned ? "opacity-60" : ""}`}>
          <div className="relative">
            <AvatarWithDecoration
              src={profile.avatar}
              alt={profile.username}
              decorationUrl={profile.equipped?.avatar_decoration?.asset_url}
              status={status}
              isStreaming={!!profile.stream}
              size="2xl"
            />
            {!isBanned && (
              <div
                className="absolute z-20 left-[10%] -translate-x-1/4 sm:left-[65%] sm:translate-x-0"
                style={{ bottom: "calc(100% - 1px)" }}
              >
                <ThinkingBubble
                  text={profile.thinking}
                  isOwnProfile={isOwnProfile}
                  onSave={(val) => onProfileUpdate({ thinking: val })}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 sm:mt-8 min-w-0">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className={`min-w-0 ${isBanned ? "opacity-60" : ""}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {profile.username}
                </h1>
                <div className="flex flex-wrap items-center gap-1">
                  <UserBadges user={profile} clickable size="lg" />
                </div>
              </div>

              <div className={`flex flex-wrap items-center gap-1.5 mt-1.5 ${isBanned ? "opacity-50" : ""}`}>
                {profile.pronoun && (
                  <span className="text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md border border-zinc-700">
                    {profile.pronoun}
                  </span>
                )}
                {followsYou && !isOwnProfile && (
                  <span className="text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md border border-zinc-700">
                    {t("stats.followsYou")}
                  </span>
                )}

                <MineralsDisplay
                  minerals={profile.minerals}
                  username={profile.username}
                  isOwnProfile={isOwnProfile}
                />

                {!isBanned && <GlobalRank userId={profile.user_id} />}

                {status === "offline" && getTimeAgo(profile.last_seen, profile.status) && (
                  <span className="text-[11px] text-zinc-500">
                    {t("header.lastSeen", { time: getTimeAgo(profile.last_seen, profile.status) })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {!isOwnProfile && isModerator && (
                <ModeratorMenu profile={profile} currentUser={currentUser} />
              )}
              {!isBanned && (
                <ProfileActions
                  isOwnProfile={isOwnProfile}
                  isFollowing={isFollowing}
                  followLoading={followLoading}
                  onFollow={onFollow}
                  onEditProfile={onEditProfile}
                  isLoggedIn={!!currentUser}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
