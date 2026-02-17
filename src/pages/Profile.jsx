import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { useParams, Link } from "react-router-dom"
import usePageMeta from "../../hooks/usePageMeta"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"
import UserDisplay from "../components/User/UserDisplay"
import SettingsModal from "../components/User/SettingsModal"
import UserBadges from "../components/User/UserBadges"
import { MarkdownPreview } from "../components/MarkdownEditor"
import PageBanner from "../components/Layout/PageBanner"
import GameCard from "../components/Game/GameCard"

function ProfileSkeleton() {
  return (
    <div>
      <PageBanner height="profile" />
      <div className="pt-[22vw] sm:pt-[20vw] md:pt-36 pb-16">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-zinc-800 animate-pulse border-4 border-zinc-900" />
          </div>
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-8 w-52 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
            <div className="flex gap-6 mt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 h-[72px] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FollowButton({ isFollowing, onClick, loading, isLoggedIn }) {
  if (!isLoggedIn) return null

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
        isFollowing
          ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5"
          : "bg-white text-black hover:bg-zinc-200"
      }`}
    >
      {isFollowing ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Seguindo
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Seguir
        </>
      )}
    </button>
  )
}

function ProfileActions({ isOwnProfile, isFollowing, followLoading, onFollow, onEditProfile, isLoggedIn }) {
  if (isOwnProfile) {
    return (
      <button
        onClick={onEditProfile}
        className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        Editar perfil
      </button>
    )
  }

  return (
    <FollowButton
      isFollowing={isFollowing}
      onClick={onFollow}
      loading={followLoading}
      isLoggedIn={isLoggedIn}
    />
  )
}

function StatCard({ value, label }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-300 mt-1">{label}</div>
    </div>
  )
}

function SocialCount({ value, label, onClick }) {
  return (
    <button onClick={onClick} className="text-sm hover:opacity-80 transition-opacity cursor-pointer">
      <span className="font-semibold text-white">{value}</span>
      <span className="text-zinc-500 ml-1">{label}</span>
    </button>
  )
}

function FollowListModal({ title, userId, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.body.style.overflow = ""
      document.body.style.paddingRight = ""
    }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  useEffect(() => {
    fetch("/api/user?action=followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        type: title === "Seguidores" ? "followers" : "following",
      }),
    })
      .then(r => r.json())
      .then(data => {
        setUsers(data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId, title])

  const filtered = search.trim()
    ? users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    : users

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">
            {title}
            {!loading && (
              <span className="text-sm text-zinc-500 font-normal ml-2">{users.length}</span>
            )}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!loading && users.length > 0 && (
          <div className="px-4 pt-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar usuário..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              autoFocus
            />
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="p-2">
              {filtered.map(u => (
                <Link
                  key={u.id}
                  to={`/u/${u.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <UserDisplay user={u} size="md" showBadges={true} linkToProfile={false} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-zinc-500">
                {search.trim() ? "Nenhum usuário encontrado" : "Nenhum usuário"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function TabIcon({ tabKey, className = "w-4 h-4" }) {
  const icons = {
    playing: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
    ),
    completed: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    backlog: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    wishlist: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    dropped: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    rated: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  }
  return icons[tabKey] || null
}

function EmptyTab({ tabKey, isOwnProfile, username }) {
  const messages = {
    playing: { own: "Você não está jogando nada no momento.", other: `${username} não está jogando nada no momento.` },
    completed: { own: "Você ainda não zerou nenhum jogo.", other: `${username} ainda não zerou nenhum jogo.` },
    backlog: { own: "Seu backlog está vazio.", other: `${username} não tem jogos no backlog.` },
    wishlist: { own: "Sua wishlist está vazia.", other: `${username} não tem jogos na wishlist.` },
    dropped: { own: "Você não abandonou nenhum jogo.", other: `${username} não abandonou nenhum jogo.` },
    rated: { own: "Você ainda não avaliou nenhum jogo.", other: `${username} ainda não avaliou nenhum jogo.` },
  }

  const msg = messages[tabKey] || { own: "Nenhum jogo aqui.", other: "Nenhum jogo aqui." }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
        <TabIcon tabKey={tabKey} className="w-6 h-6" />
      </div>
      <p className="text-sm text-zinc-500">{isOwnProfile ? msg.own : msg.other}</p>
      {isOwnProfile && (
        <Link
          to="/"
          className="mt-1 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
        >
          Explorar jogos
        </Link>
      )}
    </div>
  )
}

function GameGridSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="w-32 h-44 bg-zinc-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function GamesGrid({ games, profileGames }) {
  if (!games || games.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {games.map(game => (
        <GameCard
          key={game.slug}
          game={game}
          userRating={profileGames[game.slug]?.avgRating}
        />
      ))}
    </div>
  )
}

function ListsSection({ lists = [], isOwnProfile, username }) {
  if (lists.length === 0) {
    return (
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            Listas
          </h2>
          {isOwnProfile && (
            <button className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Criar lista
            </button>
          )}
        </div>

        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-zinc-800/20 border border-zinc-800 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-500">
            {isOwnProfile
              ? "Você ainda não criou nenhuma lista."
              : `${username} ainda não criou nenhuma lista.`
            }
          </p>
          {isOwnProfile && (
            <button className="mt-1 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Criar primeira lista
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          Listas
          <span className="text-sm text-zinc-500 font-normal">{lists.length}</span>
        </h2>
        {isOwnProfile && (
          <button className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Criar lista
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lists.map(list => (
          <Link
            key={list.id}
            to={`/list/${list.id}`}
            className="group bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl p-4 transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-700/50 group-hover:bg-zinc-700 flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-5 h-5 text-zinc-400 group-hover:text-zinc-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white group-hover:text-white truncate">{list.name}</h3>
                {list.description && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{list.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-zinc-600">{list.games_count || 0} jogos</span>
                  {list.is_public === false && (
                    <span className="text-xs text-zinc-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Privada
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function BioSection({ bio, isOwnProfile, onEdit }) {
  if (!bio) return null
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(bio)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Sobre
          </h2>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Copiar código Markdown"
          >
            {copied ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {isOwnProfile && (
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
            Editar
          </button>
        )}
      </div>
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-5 sm:p-6">
        <MarkdownPreview content={bio} />
      </div>
    </div>
  )
}

function useProfileGames(profileId) {
  const [profileGames, setProfileGames] = useState({})
  const [counts, setCounts] = useState({ playing: 0, completed: 0, backlog: 0, wishlist: 0, dropped: 0, rated: 0 })
  const [igdbGames, setIgdbGames] = useState({})
  const [loadingGames, setLoadingGames] = useState(true)

  const fetchGames = useCallback(async () => {
    if (!profileId) return
    setLoadingGames(true)

    try {
      const res = await fetch("/api/userGames?action=profileGames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId }),
      })

      if (!res.ok) throw new Error()
      const data = await res.json()

      setProfileGames(data.games || {})
      setCounts(data.counts || { playing: 0, completed: 0, backlog: 0, wishlist: 0, dropped: 0, rated: 0 })

      const slugs = Object.keys(data.games || {})
      if (slugs.length > 0) {
        const batchRes = await fetch("/api/igdb?action=gamesBatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs }),
        })

        if (batchRes.ok) {
          const batchData = await batchRes.json()
          setIgdbGames(batchData)
        }
      }
    } catch {
    } finally {
      setLoadingGames(false)
    }
  }, [profileId])

  useEffect(() => { fetchGames() }, [fetchGames])

  return { profileGames, counts, igdbGames, loadingGames }
}

function filterGamesByTab(profileGames, igdbGames, tabKey) {
  const entries = Object.entries(profileGames)

  const filtered = entries.filter(([, g]) => {
    switch (tabKey) {
      case "playing": return g.playing
      case "completed": return g.status === "completed"
      case "backlog": return g.backlog
      case "wishlist": return g.wishlist
      case "dropped": return g.status === "abandoned"
      case "rated": return g.ratingCount > 0
      default: return false
    }
  })

  return filtered
    .map(([slug]) => igdbGames[slug])
    .filter(Boolean)
    .sort((a, b) => {
      const ga = profileGames[a.slug]
      const gb = profileGames[b.slug]
      return new Date(gb?.latestAt || 0) - new Date(ga?.latestAt || 0)
    })
}

export default function Profile() {
  const { username } = useParams()
  const { user: currentUser, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("playing")
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followModal, setFollowModal] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isOwnProfile = currentUser?.username?.toLowerCase() === username?.toLowerCase()

  const { profileGames, counts, igdbGames, loadingGames } = useProfileGames(profile?.id)

  usePageMeta(profile ? {
    title: `${profile.username} - uloggd`,
    description: `Perfil de ${profile.username} no uloggd`,
    image: profile.avatar || undefined
  } : undefined)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setProfile(null)
    setIsFollowing(false)
    setFollowersCount(0)
    setFollowingCount(0)

    const controller = new AbortController()

    fetch("/api/user?action=profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then(data => {
        setProfile(data)
        setLoading(false)
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          setError("Usuário não encontrado")
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [username])

  useEffect(() => {
    if (!profile || authLoading) return

    const controller = new AbortController()

    fetch("/api/user?action=followStatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.id,
        currentUserId: currentUser?.id || null,
      }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(status => {
        setFollowersCount(status.followers)
        setFollowingCount(status.following)
        setIsFollowing(status.isFollowing)
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch follow status:", err)
        }
      })

    return () => controller.abort()
  }, [profile, currentUser?.id, authLoading])

  async function handleFollow() {
    if (!currentUser || !profile) return
    setFollowLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/user?action=follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          followingId: profile.id,
          action: isFollowing ? "unfollow" : "follow",
        }),
      })

      const data = await res.json()
      setIsFollowing(data.followed)
      setFollowersCount(prev => data.followed ? prev + 1 : prev - 1)
    } catch {
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) return <ProfileSkeleton />

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <h1 className="text-2xl font-bold text-white">Usuário não encontrado</h1>
        <p className="text-sm text-zinc-500">O usuário &quot;{username}&quot; não existe ou foi removido.</p>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Voltar ao início
        </Link>
      </div>
    )
  }

  const tabs = [
    { key: "playing", label: "Jogando", count: counts.playing },
    { key: "completed", label: "Zerados", count: counts.completed },
    { key: "backlog", label: "Backlog", count: counts.backlog },
    { key: "wishlist", label: "Wishlist", count: counts.wishlist },
    { key: "dropped", label: "Largados", count: counts.dropped },
    { key: "rated", label: "Avaliados", count: counts.rated },
  ]

  const tabGames = filterGamesByTab(profileGames, igdbGames, activeTab)

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null

  return (
    <div>
      <PageBanner image={profile.banner} height="profile" />
      <div className="pt-[22vw] sm:pt-[20vw] md:pt-36 pb-16">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex-shrink-0">
            <img
              src={profile.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
              alt={profile.username}
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-zinc-900 shadow-2xl bg-zinc-800 select-none object-cover"
              draggable={false}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile.username}</h1>
                  <UserBadges user={profile} clickable={true} size="xl" />
                </div>

                <div className="flex items-center gap-3 sm:gap-5 mt-3 flex-wrap">
                  <SocialCount
                    value={followersCount}
                    label="seguidores"
                    onClick={() => setFollowModal("Seguidores")}
                  />
                  <SocialCount
                    value={followingCount}
                    label="seguindo"
                    onClick={() => setFollowModal("Seguindo")}
                  />
                  {memberSince && (
                    <span className="text-xs sm:text-sm text-zinc-600 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {memberSince}
                    </span>
                  )}
                </div>
              </div>

              <ProfileActions
                isOwnProfile={isOwnProfile}
                isFollowing={isFollowing}
                followLoading={followLoading}
                onFollow={handleFollow}
                onEditProfile={() => setSettingsOpen(true)}
                isLoggedIn={!!currentUser}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <StatCard value={counts.playing} label="Jogando" />
              <StatCard value={counts.completed} label="Zerados" />
              <StatCard value={counts.backlog} label="Backlog" />
              <StatCard value={counts.rated} label="Avaliados" />
            </div>
          </div>
        </div>

        <BioSection
          bio={profile.bio}
          isOwnProfile={isOwnProfile}
          onEdit={() => setSettingsOpen(true)}
        />

        <div className="mt-12">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-white text-black"
                    : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
                }`}
              >
                <TabIcon tabKey={tab.key} />
                {tab.label}
                <span className={`text-xs ${activeTab === tab.key ? "text-zinc-600" : "text-zinc-500"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <hr className="my-4 border-zinc-700" />

          {loadingGames ? (
            <GameGridSkeleton />
          ) : tabGames.length > 0 ? (
            <GamesGrid games={tabGames} profileGames={profileGames} />
          ) : (
            <EmptyTab
              tabKey={activeTab}
              isOwnProfile={isOwnProfile}
              username={profile.username}
            />
          )}
        </div>

        <ListsSection
          lists={profile.lists || []}
          isOwnProfile={isOwnProfile}
          username={profile.username}
        />
      </div>

      {followModal && (
        <FollowListModal
          title={followModal}
          userId={profile.id}
          onClose={() => setFollowModal(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}




