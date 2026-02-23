import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Tv } from "lucide-react"
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

        {profile?.stream && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
            <a
              href={`https://twitch.tv/${profile.stream.twitch_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/15 transition-colors group"
            >
              <div className="relative shrink-0 w-full sm:w-auto">
                <img
                  src={profile.stream.thumbnail}
                  alt="Stream"
                  className="w-full sm:w-40 aspect-video object-cover rounded-lg shadow-md border border-purple-500/20"
                />
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1">
                  <Tv className="w-3 h-3" />
                  Ao Vivo
                </div>
              </div>
              <div className="flex-1 min-w-0 w-full">
                <span className="text-xs font-medium text-purple-400 mb-1 block">
                  {profile.stream.twitch_username} está ao vivo na Twitch
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-white truncate mb-2">
                  {profile.stream.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="text-purple-300 font-medium truncate">{profile.stream.game}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {profile.stream.viewers.toLocaleString()} assistindo
                  </span>
                </div>
              </div>
            </a>
          </div>
        )}

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
