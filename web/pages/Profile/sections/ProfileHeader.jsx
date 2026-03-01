import { Ban } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import ThinkingBubble from "@components/User/ThinkingBubble"
import ModeratorMenu from "@components/Moderation/ModeratorMenu"
import ProfileActions from "../components/ProfileActions"
import { getStatus } from "#utils/onlineStatus"
import { useDateTime } from "#hooks/useDateTime"

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
        <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Ban className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-300">
                {t("header.banned.title")}
              </p>
              <p className="text-xs text-red-400/70 mt-1">
                {t("header.banned.description")}
              </p>
              {isModerator && profile.ban_reason && (
                <p className="text-xs text-red-400/60 mt-2">
                  {t("header.banned.reason", { reason: profile.ban_reason })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <div className={`flex-shrink-0 flex justify-center md:justify-start ${isBanned ? "opacity-60" : ""}`}>
          <div className="relative">
            <AvatarWithDecoration
              src={profile.avatar}
              alt={profile.username}
              decoration={profile.avatar_decoration}
              status={status}
              isStreaming={!!profile.stream}
              size="profile"
            />
            {!isBanned && (
              <div
                className="absolute z-20 left-[15%] sm:left-[13%] md:left-[65%]"
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

        <div className="flex-1 sm:mt-12 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className={`min-w-0 ${isBanned ? "opacity-60" : ""}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                  {profile.username}
                </h1>
                <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                  <UserBadges user={profile} clickable size="xl" />
                </div>
                <div className="flex sm:hidden mb-2 flex-wrap items-center gap-1.5">
                  <UserBadges user={profile} clickable size="lg" />
                </div>
              </div>

              <div className={`flex flex-wrap items-center gap-2 mt-1 ${isBanned ? "opacity-50" : ""}`}>
                {profile.pronoun && (
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
                    {profile.pronoun}
                  </span>
                )}
                {followsYou && !isOwnProfile && (
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
                    {t("stats.followsYou")}
                  </span>
                )}
                {status === "offline" && getTimeAgo(profile.last_seen, profile.status) && (
                  <span className="text-xs text-zinc-500">
                    {t("header.lastSeen", { time: getTimeAgo(profile.last_seen, profile.status) })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
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