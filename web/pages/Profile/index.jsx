import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Twitch, Radio } from "lucide-react"
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

function StreamCard({ stream }) {
  return (
    <a
      href={`https://twitch.tv/${stream.twitch_username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-zinc-800/50 border border-purple-500/30 hover:border-purple-500/50 rounded-lg px-4 py-3 transition-colors block mt-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Twitch className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">
              {stream.twitch_username}
            </span>
            <span className="flex items-center gap-1 text-[10px] bg-red-600/90 text-white px-1.5 py-0.5 rounded">
              <Radio className="w-3 h-3" />
              AO VIVO
            </span>
          </div>

          <div className="text-sm font-semibold text-white truncate">
            {stream.title}
          </div>

          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
            <span>{stream.game}</span>
            <span>•</span>
            <span>{stream.viewers.toLocaleString()} assistindo</span>
          </div>
        </div>
      </div>
    </a>
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
