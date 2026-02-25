import { useState, useRef, useEffect } from "react"
import { supabase } from "#lib/supabase.js"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import ThinkingBubble from "@components/User/ThinkingBubble"
import ProfileActions from "../components/ProfileActions"
import ProfileStats from "../components/ProfileStats"
import Modal from "@components/UI/Modal"
import { notify } from "@components/UI/Notification"
import { getStatus } from "#utils/onlineStatus"
import { getTimeAgo, formatDateLong } from "#utils/formatDate"
import {
  Globe,
  Twitter,
  Instagram,
  Youtube,
  Github,
  Linkedin,
  ExternalLink,
  Check,
  Copy,
  Shield,
  BadgeCheck,
  Ban,
  Flag,
  Loader2,
  X,
  Clock,
} from "lucide-react"
import { TwitchIcon, SteamIcon, NintendoIcon } from "#constants/customIcons"

const SOCIAL_PLATFORMS = {
  twitter: {
    icon: Twitter,
    label: "Twitter / X",
    color: "hover:text-sky-400",
    baseUrl: "https://x.com/",
    getDisplay: (url) => {
      const match = url.match(/(?:twitter\.com|x\.com)\/(@?[\w]+)/i)
      return match ? `@${match[1].replace("@", "")}` : url
    },
  },
  instagram: {
    icon: Instagram,
    label: "Instagram",
    color: "hover:text-pink-400",
    baseUrl: "https://instagram.com/",
    getDisplay: (url) => {
      const match = url.match(/instagram\.com\/([\w.]+)/i)
      return match ? `@${match[1]}` : url
    },
  },
  youtube: {
    icon: Youtube,
    label: "YouTube",
    color: "hover:text-red-500",
    baseUrl: "https://youtube.com/",
    getDisplay: (url) => {
      const match = url.match(/youtube\.com\/(?:@|c(?:hannel)?\/)([\w-]+)/i)
      return match ? `@${match[1]}` : "YouTube"
    },
  },
  github: {
    icon: Github,
    label: "GitHub",
    color: "hover:text-white",
    baseUrl: "https://github.com/",
    getDisplay: (url) => {
      const match = url.match(/github\.com\/([\w-]+)/i)
      return match ? match[1] : url
    },
  },
  linkedin: {
    icon: Linkedin,
    label: "LinkedIn",
    color: "hover:text-blue-400",
    baseUrl: "https://linkedin.com/in/",
    getDisplay: (url) => {
      const match = url.match(/linkedin\.com\/in\/([\w-]+)/i)
      return match ? match[1] : url
    },
  },
  website: {
    icon: Globe,
    label: "Website",
    color: "hover:text-emerald-400",
    baseUrl: "",
    getDisplay: (url) => {
      try {
        return new URL(url).hostname.replace("www.", "")
      } catch {
        return url
      }
    },
  },
}

function normalizeUrl(url, baseUrl) {
  if (!url) return null
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  if (baseUrl) {
    return `${baseUrl}${trimmed.replace(/^@/, "")}`
  }
  return `https://${trimmed}`
}

const CONNECTION_PLATFORMS = {
  twitch: {
    icon: TwitchIcon,
    label: "Twitch",
    color: "hover:text-purple-400",
    getUrl: (username) => `https://twitch.tv/${username}`,
    getDisplay: (username) => username,
  },
  steam: {
    icon: SteamIcon,
    label: "Steam",
    color: "hover:text-[#66c0f4]",
    getUrl: (steamId) => `https://steamcommunity.com/profiles/${steamId}`,
    getDisplay: (steamId, displayName) => displayName || steamId,
  },
  nintendo: {
    icon: NintendoIcon,
    label: "Nintendo Switch",
    color: "hover:text-red-500",
    getUrl: () => null,
    getDisplay: (code, displayName) => displayName || code,
  },
}

function SocialLinks({ links, connections }) {
  const [copied, setCopied] = useState(null)
  const items = []

  if (connections && Array.isArray(connections)) {
    connections.forEach((conn) => {
      const platform = CONNECTION_PLATFORMS[conn.provider]
      if (!platform) return

      let id
      if (conn.provider === "steam") {
        id = conn.provider_user_id
      } else {
        id = conn.provider_username
      }

      if (id) {
        items.push({
          key: `conn-${conn.provider}`,
          provider: conn.provider,
          icon: platform.icon,
          label: platform.label,
          color: platform.color,
          href: platform.getUrl?.(id),
          display: platform.getDisplay(id, conn.provider_display_name),
          raw: id,
        })
      }
    })
  }

  if (links && typeof links === "object") {
    Object.entries(links).forEach(([key, value]) => {
      if (!value || !value.trim() || !SOCIAL_PLATFORMS[key]) return
      const platform = SOCIAL_PLATFORMS[key]
      const href = normalizeUrl(value, platform.baseUrl)
      items.push({
        key: `social-${key}`,
        provider: key,
        icon: platform.icon,
        label: platform.label,
        color: platform.color,
        href,
        display: platform.getDisplay(href || value),
      })
    })
  }

  if (items.length === 0) return null

  async function handleCopy(text, key) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  return (
    <div className="flex items-center gap-1 flex-wrap mt-2">
      {items.map((item) => {
        const Icon = item.icon
        const isNintendo = item.provider === "nintendo"
        const isSteam = item.provider === "steam"
        const isTwitch = item.provider === "twitch"
        const isCopied = copied === item.key

        if (isNintendo) {
          return (
            <button
              key={item.key}
              onClick={() => handleCopy(item.raw, item.key)}
              className={`
                inline-flex items-center gap-1.5
                px-2.5 py-1.5 rounded-lg
                ${
                  isCopied
                    ? "bg-green-500/20 border-green-500/50 text-green-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                }
                border text-xs transition-all duration-200 cursor-pointer
              `}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="truncate">{isCopied ? "Copiado!" : item.display}</span>
              {!isCopied && <Copy className="w-3 h-3 opacity-50" />}
            </button>
          )
        }

        if (isSteam) {
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#171a21]/50 border border-[#2a475e]/50 text-[#66c0f4] text-xs transition-all duration-200 hover:bg-[#171a21]/80"
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{item.display}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-80 transition-opacity" />
            </a>
          )
        }

        if (isTwitch) {
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs transition-all duration-200 hover:bg-purple-500/20"
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{item.display}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-80 transition-opacity" />
            </a>
          )
        }

        return (
          <a
            key={item.key}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 text-xs transition-all duration-200 hover:bg-zinc-700/60 hover:border-zinc-600/50 ${item.color}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="truncate">{item.display}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-80 transition-opacity" />
          </a>
        )
      })}
    </div>
  )
}

function VerificationRequestsModal({ isOpen, onClose }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  async function fetchRequests() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setLoading(true)
    try {
      const res = await fetch("/api/verification/pending", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleReview(requestId, action, reason) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setReviewing(`${requestId}_${action}`)

    try {
      const res = await fetch("/api/verification/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ requestId, action, rejectionReason: reason })
      })

      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId))
        setRejectingId(null)
        setRejectionReason("")
        notify(
          action === "approve" ? "Usuário verificado!" : "Solicitação rejeitada.",
          action === "approve" ? "success" : "info"
        )
      } else {
        notify("Erro ao processar.", "error")
      }
    } catch (e) {
      console.error(e)
      notify("Erro ao processar.", "error")
    }

    setReviewing(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      title="Solicitações de verificação"
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Check className="w-8 h-8 text-zinc-700" />
            <p className="text-sm text-zinc-500">Nenhuma solicitação pendente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const user = request.users
              const isRejecting = rejectingId === request.id

              return (
                <div key={request.id} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-start gap-3">
                    <img
                      src={user?.avatar_url || "/default-avatar.png"}
                      alt={user?.username}
                      className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {user?.display_name || user?.username || "Desconhecido"}
                        </span>
                        <span className="text-xs text-zinc-600">@{user?.username}</span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-2">{request.reason}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span className="text-xs text-zinc-600">
                          {formatDateLong(new Date(request.created_at).getTime() / 1000)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isRejecting ? (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Motivo da rejeição (opcional)..."
                        rows={2}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setRejectingId(null)
                            setRejectionReason("")
                          }}
                          className="flex-1 px-3 py-2 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleReview(request.id, "reject", rejectionReason)}
                          disabled={reviewing === `${request.id}_reject`}
                          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {reviewing === `${request.id}_reject` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Confirmar rejeição"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleReview(request.id, "approve")}
                        disabled={reviewing === `${request.id}_approve`}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {reviewing === `${request.id}_approve` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Aprovar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setRejectingId(request.id)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

function BanUserModal({ isOpen, onClose, profile }) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleBan() {
    if (!reason.trim()) {
      notify("Informe o motivo do banimento.", "error")
      return
    }

    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/moderation/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: profile.id, reason: reason.trim() })
      })

      if (res.ok) {
        notify("Usuário banido.", "success")
        onClose()
      } else {
        notify("Erro ao banir usuário.", "error")
      }
    } catch (e) {
      console.error(e)
      notify("Erro ao banir usuário.", "error")
    }

    setLoading(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      title="Banir usuário"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <Ban className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            Você está prestes a banir <strong>@{profile.username}</strong>
          </p>
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-2">Motivo do banimento</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo..."
            rows={3}
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleBan}
            disabled={loading || !reason.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Ban className="w-4 h-4" />
                Banir
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModeratorMenu({ profile, currentUser }) {
  const [open, setOpen] = useState(false)
  const [showVerifications, setShowVerifications] = useState(false)
  const [showBan, setShowBan] = useState(false)
  const menuRef = useRef(null)

  const isModerator = currentUser?.is_moderator

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!isModerator) return null

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
          title="Moderação"
        >
          <Shield className="w-5 h-5" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-800">
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Moderação</p>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setOpen(false)
                  setShowVerifications(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <BadgeCheck className="w-4 h-4 text-violet-400" />
                Solicitações de verificação
              </button>

              <button
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <Flag className="w-4 h-4 text-amber-400" />
                Denúncias
              </button>

              <hr className="my-1 border-zinc-800" />

              <button
                onClick={() => {
                  setOpen(false)
                  setShowBan(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                Banir usuário
              </button>
            </div>
          </div>
        )}
      </div>

      <VerificationRequestsModal
        isOpen={showVerifications}
        onClose={() => setShowVerifications(false)}
      />

      <BanUserModal
        isOpen={showBan}
        onClose={() => setShowBan(false)}
        profile={profile}
      />
    </>
  )
}

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

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      <div className="flex-shrink-0">
        <div className="relative">
          <AvatarWithDecoration
            src={profile.avatar}
            alt={profile.username}
            decoration={profile.avatar_decoration}
            status={getStatus(profile.last_seen, profile.status)}
            isStreaming={!!profile.stream}
            size="profile"
          />
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
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
              {profile.username}
            </h1>
            <UserBadges user={profile} clickable size="xl" />
          </div>
          <div className="flex items-center gap-2">
            {!isOwnProfile && <ModeratorMenu profile={profile} currentUser={currentUser} />}
            <ProfileActions
              isOwnProfile={isOwnProfile}
              isFollowing={isFollowing}
              followLoading={followLoading}
              onFollow={onFollow}
              onEditProfile={onEditProfile}
              isLoggedIn={!!currentUser}
            />
          </div>
        </div>

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

        <SocialLinks links={profile.social_links} connections={profile.connections} />

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
  )
}
