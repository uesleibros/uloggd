import { Ban } from "lucide-react"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import SocialLinks from "@components/User/SocialLinks"
import ThinkingBubble from "@components/User/ThinkingBubble"
import ModeratorMenu from "@components/Moderation/ModeratorMenu"
import ProfileActions from "../components/ProfileActions"
import ProfileStats from "../components/ProfileStats"
import { getStatus } from "#utils/onlineStatus"
import { getTimeAgo } from "#utils/formatDate"

export function ProfileHeader({
  profile,
  isOwnProfile,
  currentUser,
  isFollowing,
  followLoading,
  followsYou,
  followersCount,
  followingCount,
  counts,
  onFollow,
  onEditProfile,
  onProfileUpdate,
  onFollowersClick,
  onFollowingClick,
}) {
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : null

  const isBanned = profile.is_banned
  const isModerator = currentUser?.is_moderator

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      <div className={`flex-shrink-0 ${isBanned ? "opacity-60" : ""}`}>
        <div className="relative">
          <AvatarWithDecoration
            src={profile.avatar}
            alt={profile.username}
            decoration={profile.avatar_decoration}
            status={getStatus(profile.last_seen, profile.status)}
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
                onSave={(t) => onProfileUpdate({ thinking: t })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">

        {isBanned && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Ban className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-300">
                  Conta suspensa
                </p>
                <p className="text-xs text-red-400/70 mt-1">
                  Este usuário foi suspenso por violar os termos da plataforma.
                </p>

                {isModerator && profile.ban_reason && (
                  <p className="text-xs text-red-400/60 mt-2">
                    Motivo: {profile.ban_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 min-w-0 ${isBanned ? "opacity-60" : ""}`}>
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
              {profile.username}
            </h1>
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              <UserBadges user={profile} clickable size="xl" />
            </div>
            <div className="flex sm:hidden flex-wrap items-center gap-1.5">
              <UserBadges user={profile} clickable size="lg" />
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

        <div className={`${isBanned ? "opacity-50 pointer-events-none" : ""}`}>

          {profile.pronoun && (
            <span className="text-xs mt-1 bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700 inline-block">
              {profile.pronoun}
            </span>
          )}

          {getStatus(profile.last_seen, profile.status) === "offline" &&
            getTimeAgo(profile.last_seen, profile.status) && (
              <span className="text-xs text-zinc-500 mt-1 block">
                Última vez visto: {getTimeAgo(profile.last_seen, profile.status)}
              </span>
            )}

          <SocialLinks
            links={profile.social_links}
            connections={profile.connections}
          />

          <ProfileStats
            counts={counts}
            followersCount={followersCount}
            followingCount={followingCount}
            memberSince={memberSince}
            onFollowersClick={onFollowersClick}
            onFollowingClick={onFollowingClick}
            followsYou={followsYou && !isOwnProfile}
            stream={profile.stream}
            userId={profile.id}
          />
        </div>
      </div>
    </div>
  )
}

