import { PLATFORMS_MAP } from "../../data/platformsMapper.js"

export default function PlatformBadge({
  platform,
  variant = "badge",
  size = "w-5 h-5",
  className = "",
}) {
  const iconFile = PLATFORMS_MAP[platform.id]

  if (variant === "icon") {
    if (!iconFile) return null
    return (
      <img
        src={`/platforms/result/${iconFile}.png`}
        alt={platform.name}
        className={`${size} brightness-0 invert select-none object-contain`}
      />
    )
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/60 px-1.5 py-0.5 rounded ${className}`}>
        {iconFile && (
          <img
            src={`/platforms/result/${iconFile}.png`}
            alt={platform.name}
            className={`${size} brightness-0 invert object-contain select-none`}
          />
        )}
        <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
          {platform.name}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 ${className}`}>
      {iconFile && (
        <img
          src={`/platforms/result/${iconFile}.png`}
          alt={platform.name}
          className={`${size} brightness-0 invert object-contain select-none`}
        />
      )}
      <span className="text-sm text-zinc-300">{platform.name}</span>
    </div>
  )
}

export function PlatformList({
  platforms,
  variant = "badge",
  max,
  size = "w-5 h-5",
  className = "",
  gapClass = "gap-2",
  badgeClassName = "",
}) {
  if (!platforms?.length) return null

  const visible = max ? platforms.slice(0, max) : platforms
  const remaining = max ? Math.max(0, platforms.length - max) : 0

  return (
    <div className={`flex flex-wrap items-center ${gapClass} ${className}`}>
      {visible.map(p => (
        <PlatformBadge
          key={p.id}
          platform={p}
          variant={variant}
          size={size}
          className={badgeClassName}
        />
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-zinc-500 py-0.5 px-1">
          + {remaining}
        </span>
      )}
    </div>
  )
}