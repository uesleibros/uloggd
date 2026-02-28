import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import UsersChoiceCarousel from "@components/Home/UsersChoiceCarousel"
import { useAuth } from "#hooks/useAuth"
import PageBanner from "@components/Layout/PageBanner"
import { getStatus } from "#utils/onlineStatus"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"

function WelcomeBackSkeleton() {
  return (
    <div className="mt-40">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-zinc-800 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
          <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function WelcomeBack({ user }) {
  const { t } = useTranslation("home")
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"

  return (
    <div className="mt-40">
      <div className="flex items-center gap-4 mb-6">
        <AvatarWithDecoration
          src={user.avatar}
          alt={user.username}
          decoration={user.avatar_decoration}
          status={getStatus(user.last_seen, user.status)}
          isStreaming={!!user.stream}
          size="lg"
        />
        <div>
          <p className="text-sm text-zinc-500">{t(`greeting.${greetingKey}`)},</p>
          <h1 className="text-3xl font-bold text-white">{user.username}</h1>
        </div>
      </div>
    </div>
  )
}

function HeroSection() {
  const { t } = useTranslation("home")

  return (
    <div className="mt-40">
      <h1 className="text-5xl font-bold text-blue-200 mb-5">{t("hero.title")}</h1>
      <div className="max-w-2xl">
        <p className="text-lg leading-relaxed text-zinc-300">{t("hero.description")}</p>
      </div>
    </div>
  )
}

export default function Home() {
  usePageMeta()
  const { t } = useTranslation("home")
  const { user, loading } = useAuth()

  function renderHero() {
    if (loading) return <WelcomeBackSkeleton />
    if (user) return <WelcomeBack user={user} />
    return <HeroSection />
  }

  return (
    <div>
      <PageBanner image="/games-background.png" height="home" />

      {renderHero()}

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-white mb-4">{t("sections.communityFavorites")}</h2>
        <UsersChoiceCarousel />
      </div>
    </div>
  )

}
