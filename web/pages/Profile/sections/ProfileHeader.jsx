import { useState } from "react"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import ThinkingBubble from "@components/User/ThinkingBubble"
import ProfileActions from "../components/ProfileActions"
import ProfileStats from "../components/ProfileStats"
import { getStatus } from "#utils/onlineStatus"
import { getTimeAgo } from "#utils/formatDate"
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
} from "lucide-react"

function NintendoIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M7 2C4.79 2 3 3.79 3 6v12c0 2.21 1.79 4 4 4h3V2H7zm10 0h-3v20h3c2.21 0 4-1.79 4-4V6c0-2.21-1.79-4-4-4zM7 6.5A1.5 1.5 0 1 1 7 9.5 1.5 1.5 0 0 1 7 6.5zm10 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
    </svg>
  )
}

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

const CONNECTION_PLATFORMS = {
  twitch: {
    icon: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    ),
    label: "Twitch",
    color: "hover:text-purple-400",
    getUrl: (username) => `https://twitch.tv/${username}`,
    getDisplay: (username) => username,
  },
  nintendo: {
    icon: NintendoIcon,
    label: "Nintendo Switch",
    color: "hover:text-red-500",
    getUrl: () => null,
    getDisplay: (code, displayName) => displayName || code,
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

function SocialLinks({ links, connections }) {
  const [copied, setCopied] = useState(null)
  const items = []

  if (connections && Array.isArray(connections)) {
    connections.forEach((conn) => {
      const platform = CONNECTION_PLATFORMS[conn.provider]
      if (platform && conn.provider_username) {
        items.push({
          key: `conn-${conn.provider}`,
          provider: conn.provider,
          icon: platform.icon,
          label: platform.label,
          color: platform.color,
          href: platform.getUrl(conn.provider_username),
          display: conn.display_name || conn.provider_username,
          raw: conn.provider_username,
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
                ${isCopied 
                  ? "bg-green-500/20 border-green-500/50 text-green-400" 
                  : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                }
                border text-xs
                transition-all duration-200
                cursor-pointer
              `}
              title="Clique para copiar"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span className="truncate">
                {isCopied ? "Copiado!" : item.display}
              </span>
              {!isCopied && <Copy className="w-3 h-3 opacity-50 flex-shrink-0" />}
            </button>
          )
        }

        if (isTwitch) {
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${item.label}: ${item.display}`}
              className="
                group inline-flex items-center gap-1.5
                px-2.5 py-1.5 rounded-lg
                bg-purple-500/10 border border-purple-500/30
                text-purple-400 text-xs
                transition-all duration-200
                hover:bg-purple-500/20
              "
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">
                {item.display}
              </span>
              <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-80 transition-opacity flex-shrink-0" />
            </a>
          )
        }

        return (
          <a
            key={item.key}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${item.label}: ${item.display}`}
            className={`
              group/social inline-flex items-center gap-1.5
              px-2.5 py-1.5 rounded-lg
              bg-zinc-800/60 border border-zinc-700/50
              text-zinc-400 text-xs
              transition-all duration-200
              hover:bg-zinc-700/60 hover:border-zinc-600/50
              ${item.color}
            `}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {item.display}
            </span>
            <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover/social:opacity-80 transition-opacity flex-shrink-0" />
          </a>
        )
      })}
    </div>
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
          <ProfileActions
            isOwnProfile={isOwnProfile}
            isFollowing={isFollowing}
            followLoading={followLoading}
            onFollow={onFollow}
            onEditProfile={onEditProfile}
            isLoggedIn={!!currentUser}
          />
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
        />
      </div>
    </div>
  )
}