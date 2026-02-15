import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useParams, Link } from "react-router-dom"
import usePageMeta from "../../hooks/usePageMeta"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"
import UserDisplay from "../components/UserDisplay"
import SettingsModal from "../components/SettingsModal"

function ProfileSkeleton() {
  return (
    <div>
      <div className="absolute z-[-1] top-0 left-0 h-[280px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-zinc-900 to-zinc-900" />
        <div id="main-gradient" />
        <div id="gradient" />
      </div>
      <div className="pt-36 pb-16">
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="w-36 h-36 rounded-full bg-zinc-800 animate-pulse border-4 border-zinc-900" />
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
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  useEffect(() => {
    fetch("/api/user/followers", {
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

export default function Profile() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
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

  usePageMeta(profile ? {
    title: `${profile.username} - uloggd`,
    description: `Perfil de ${profile.username} no uloggd`,
    image: profile.avatar || undefined
  } : undefined)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setProfile(null)

    fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    })
      .then(res => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then(data => {
        setProfile(data)
        setLoading(false)

        fetch("/api/user/follow-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.id,
            currentUserId: currentUser?.id || null,
          }),
        })
          .then(r => r.json())
          .then(status => {
            setFollowersCount(status.followers)
            setFollowingCount(status.following)
            setIsFollowing(status.isFollowing)
          })
          .catch(() => {})
      })
      .catch(() => {
        setError("Usuário não encontrado")
        setLoading(false)
      })
  }, [username, currentUser?.id])

  async function handleFollow() {
    if (!currentUser || !profile) return
    setFollowLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/user/follow", {
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
    { key: "playing", label: "Jogando", count: 0 },
    { key: "completed", label: "Zerados", count: 0 },
    { key: "backlog", label: "Backlog", count: 0 },
    { key: "wishlist", label: "Wishlist", count: 0 },
    { key: "dropped", label: "Largados", count: 0 },
    { key: "rated", label: "Avaliados", count: 0 },
  ]

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null

  return (
    <div>
      <div className="absolute z-[-1] top-0 left-0 h-[280px] w-full overflow-hidden">
        {profile.banner ? (
          <img
            src={profile.banner}
            alt="Banner"
            className="select-none pointer-events-none absolute z-[-2] inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-zinc-900 to-zinc-900" />
        )}
        <div id="main-gradient" />
        <div id="gradient" />
      </div>

      <div className="pt-36 pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <img
              src={profile.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
              alt={profile.username}
              className="w-36 h-36 rounded-full border-4 border-zinc-900 shadow-2xl bg-zinc-800 select-none object-cover"
              draggable={false}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-3xl font-bold text-white">{profile.username}</h1>
                  {profile.is_verified && (
                    <img src="/badges/verified.png" alt="Verificado" title="Verificado" className="w-5 h-5 select-none" draggable={false} />
                  )}
                  {profile.is_moderator && (
                    <img src="/badges/moderator.png" alt="Moderador" title="Moderador" className="w-5 h-5 select-none" draggable={false} />
                  )}
                </div>

                <div className="flex items-center gap-5 mt-3">
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
                    <span className="text-sm text-zinc-600 flex items-center gap-1.5">
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
              <StatCard value={0} label="Jogando" />
              <StatCard value={0} label="Zerados" />
              <StatCard value={0} label="Backlog" />
              <StatCard value={0} label="Avaliados" />
            </div>
          </div>
        </div>

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

          <EmptyTab
            tabKey={activeTab}
            isOwnProfile={isOwnProfile}
            username={profile.username}
          />
        </div>
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