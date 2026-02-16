// Home.jsx

import usePageMeta from "../../hooks/usePageMeta"
import UsersChoiceCarousel from "../components/UsersChoiceCarousel"
import { useAuth } from "../../hooks/useAuth"
import PageBanner from "../components/PageBanner"

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-4 h-[88px] animate-pulse" />
        ))}
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
        <img
          src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
          alt={user.username}
          className="w-14 h-14 rounded-full border-2 border-zinc-700 select-none"
          draggable={false}
        />
        <div>
          <p className="text-sm text-zinc-500">{greeting},</p>
          <h1 className="text-3xl font-bold text-white">{user.username}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickStatCard
          label="Jogando"
          value="—"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          }
          color="text-green-400"
        />
        <QuickStatCard
          label="Zerados"
          value="—"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="text-blue-400"
        />
        <QuickStatCard
          label="Backlog"
          value="—"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="text-amber-400"
        />
        <QuickStatCard
          label="Avaliados"
          value="—"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          }
          color="text-purple-400"
        />
      </div>
    </div>
  )
}

function QuickStatCard({ label, value, icon, color }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 rounded-xl px-4 py-4 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
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