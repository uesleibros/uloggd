import { useState } from "react"
import { ExternalLink, Check, Copy } from "lucide-react"
import { SOCIAL_PLATFORMS, CONNECTION_PLATFORMS, normalizeUrl } from "#constants/socialPlatforms"

export default function SocialLinks({ links, connections }) {
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
        const isCopied = copied === item.key

        if (item.provider === "nintendo") {
          return (
            <button
              key={item.key}
              onClick={() => handleCopy(item.raw, item.key)}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all duration-200 cursor-pointer
                ${isCopied
                  ? "bg-green-500/20 border-green-500/50 text-green-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                }
              `}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="truncate">{isCopied ? "Copiado!" : item.display}</span>
              {!isCopied && <Copy className="w-3 h-3 opacity-50" />}
            </button>
          )
        }

        if (item.provider === "steam") {
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

        if (item.provider === "twitch") {
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