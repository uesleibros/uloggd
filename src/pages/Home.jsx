import usePageMeta from "../../hooks/usePageMeta"
import UsersChoiceCarousel from "../components/Home/UsersChoiceCarousel"
import { useAuth } from "../../hooks/useAuth"
import PageBanner from "../components/Layout/PageBanner"
import AvatarWithDecoration from "../components/User/AvatarWithDecoration"

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
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  return (
    <div className="mt-40">
      <div className="flex items-center gap-4 mb-6">
        <AvatarWithDecoration
          src={user.avatar}
          alt={user.username}
          decoration={user.avatar_decoration}
          size="xl"
        />
        <div>
          <p className="text-sm text-zinc-500">{greeting},</p>
          <h1 className="text-3xl font-bold text-white">{user.username}</h1>
        </div>
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <div className="mt-40">
      <h1 className="text-5xl font-bold text-blue-200 mb-5">Descubra, colecione, seus jogos.</h1>
      <div className="max-w-2xl">
        <p className="text-lg leading-relaxed text-zinc-300">
          Acompanhe tudo que você já jogou, está jogando ou quer jogar.
          Organize sua biblioteca pessoal, crie tierlists e rankings personalizados,
          dê notas aos seus jogos favoritos e descubra o que a comunidade está curtindo.
          Compare suas classificações com outros jogadores, explore recomendações
          baseadas nos seus gostos e mantenha tudo atualizado automaticamente
          conforme você joga.
        </p>
      </div>
    </div>
  )
}

export default function Home() {
  usePageMeta()
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
        <h2 className="text-xl font-semibold text-white mb-4">Favoritos da comunidade</h2>
        <UsersChoiceCarousel />
      </div>
    </div>
  )
}
