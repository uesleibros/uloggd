import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ExternalLink } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useProfileGames } from "#hooks/useProfileGames"
import PageBanner from "@components/Layout/PageBanner"
import SettingsModal from "@components/User/Settings/SettingsModal"
import { useProfileData } from "./hooks/useProfileData"
import { useFollowData } from "./hooks/useFollowData"
import { useUserLists } from "./hooks/useUserLists"
import { ProfileHeader } from "./sections/ProfileHeader"
import { ProfileNavigation } from "./sections/ProfileNavigation"
import { ProfileContent } from "./sections/ProfileContent"
import ProfileSkeleton from "./components/ProfileSkeleton"
import FollowListModal from "./components/FollowListModal"

function TwitchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
    </svg>
  )
}

function StreamCard({ stream }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
      <a
        href={`https://twitch.tv/${stream.twitch_username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border border-purple-500/20 bg-zinc-900 hover:border-purple-500/40 transition-all group"
      >
        <div className="relative">
          <img
            src={stream.thumbnail}
            alt={stream.title}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[11px] font-bold uppercase tracking-wide rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Ao Vivo
            </span>
            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium rounded">
              {stream.viewers.toLocaleString()} assistindo
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <TwitchIcon className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-medium text-purple-400">
                {stream.twitch_username}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-1 group-hover:text-purple-200 transition-colors">
              {stream.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-zinc-400">{stream.game}</span>
              <ExternalLink className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </a>
    </div>
  )
}

export default function Profile() {
  const { username } = useParams()
  const { profile, isOwnProfile, currentUser, authLoading, fetching, error, updateProfile } =
    useProfileData(username)

  const { profileGames, counts, igdbGames, loadingGames } = useProfileGames(profile?.id)
  const { userLists, setUserLists, loadingLists } = useUserLists(profile?.id)
  const {
    isFollowing,
    followLoading,
    followsYou,
    followersCount,
    followingCount,
    handleFollow,
  } = useFollowData(profile, currentUser, authLoading, isOwnProfile)

  const [activeSection, setActiveSection] = useState("profile")
  const [followModal, setFollowModal] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  usePageMeta(
    profile
      ? {
          title: `${profile.username} - uloggd`,
          description: `Perfil de ${profile.username} no uloggd`,
          image: profile.avatar || undefined,
        }
      : undefined
  )

  const showSkeleton = authLoading || (fetching && !profile)

  if (showSkeleton) return <ProfileSkeleton />

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <h1 className="text-2xl font-bold text-white">Usuário não encontrado</h1>
        <p className="text-sm text-zinc-500">
          O usuário &quot;{username}&quot; não existe ou foi removido.
        </p>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Voltar ao início
        </Link>
      </div>
    )
  }

  function handleSectionChange(sectionId) {
    if (sectionId === activeSection) return
    setActiveSection(sectionId)
  }

  return (
    <div>
      <PageBanner image={profile.banner} height="profile" />
      <div className="pt-[22vw] sm:pt-[20vw] md:pt-36 pb-16">
        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          currentUser={currentUser}
          isFollowing={isFollowing}
          followLoading={followLoading}
          followsYou={followsYou}
          followersCount={followersCount}
          followingCount={followingCount}
          counts={counts}
          onFollow={handleFollow}
          onEditProfile={() => setSettingsOpen(true)}
          onProfileUpdate={updateProfile}
          onFollowersClick={() => setFollowModal("Seguidores")}
          onFollowingClick={() => setFollowModal("Seguindo")}
        />

        {profile?.stream && <StreamCard stream={profile.stream} />}

        <ProfileNavigation
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          counts={counts}
          listsCount={userLists.length}
        />

        <ProfileContent
          activeSection={activeSection}
          profile={profile}
          profileGames={profileGames}
          igdbGames={igdbGames}
          loadingGames={loadingGames}
          counts={counts}
          isOwnProfile={isOwnProfile}
          userLists={userLists}
          setUserLists={setUserLists}
          loadingLists={loadingLists}
          onEditProfile={() => setSettingsOpen(true)}
        />
      </div>

      <FollowListModal
        isOpen={!!followModal}
        title={followModal || ""}
        userId={profile.id}
        onClose={() => setFollowModal(null)}
      />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
