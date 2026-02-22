import { AVATAR_DECORATIONS } from "#data/avatarDecorations"

const sizeClasses = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20',
  mention: 'w-20 h-20',
  profile: 'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36',
}

const indicatorSizes = {
  xs: 8,
  sm: 9,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  mention: 22,
  profile: 26,
}

const cutoutPadding = {
  xs: 1.5,
  sm: 1.5,
  md: 2,
  lg: 2.5,
  xl: 3,
  '2xl': 3.5,
  mention: 3.5,
  profile: 4,
}

const indicatorOffset = {
  xs: -1,
  sm: -1,
  md: -1,
  lg: -1,
  xl: -2,
  '2xl': -2,
  mention: -2,
  profile: -3,
}

const statusColors = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
  offline: '#80848e',
}

function StatusIcon({ status, size }) {
  const s = indicatorSizes[size] || 18
  const half = s / 2

  if (status === 'offline') {
    const inner = half * 0.45
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <mask id={`offline-${s}`}>
          <rect width={s} height={s} fill="white" />
          <circle cx={half} cy={half} r={inner} fill="black" />
        </mask>
        <circle cx={half} cy={half} r={half} fill={statusColors.offline} mask={`url(#offline-${s})`} />
      </svg>
    )
  }

  if (status === 'idle') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <mask id={`idle-${s}`}>
          <rect width={s} height={s} fill="white" />
          <circle cx={half * 0.7} cy={half * 0.7} r={half * 0.6} fill="black" />
        </mask>
        <circle cx={half} cy={half} r={half} fill={statusColors.idle} mask={`url(#idle-${s})`} />
      </svg>
    )
  }

  if (status === 'dnd') {
    const barH = s * 0.18
    const barW = s * 0.5
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <mask id={`dnd-${s}`}>
          <rect width={s} height={s} fill="white" />
          <rect x={half - barW / 2} y={half - barH / 2} width={barW} height={barH} rx={barH / 2} fill="black" />
        </mask>
        <circle cx={half} cy={half} r={half} fill={statusColors.dnd} mask={`url(#dnd-${s})`} />
      </svg>
    )
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={half} cy={half} r={half} fill={statusColors.online} />
    </svg>
  )
}

function getAvatarMask(size, status) {
  if (!status) return undefined

  const iconSize = indicatorSizes[size] || 18
  const padding = cutoutPadding[size] || 3
  const offset = indicatorOffset[size] || -2
  const cutoutRadius = (iconSize / 2) + padding

  const bottomPx = offset + cutoutRadius
  const rightPx = offset + cutoutRadius

  return `radial-gradient(circle ${cutoutRadius}px at calc(100% - ${rightPx}px) calc(100% - ${bottomPx}px), transparent ${cutoutRadius}px, black ${cutoutRadius}px)`
}

export default function AvatarWithDecoration({
  src,
  alt,
  decoration = null,
  size = 'xl',
  status = null,
  className = ''
}) {
  const currentDecorationUrl = AVATAR_DECORATIONS.find(d => d.id === decoration)?.url || null
  const offset = indicatorOffset[size] || -2
  const mask = getAvatarMask(size, status)

  return (
    <div className={`avatar-wrapper ${sizeClasses[size]} ${className}`}>
      <img
        src={src || "https://cdn.discordapp.com/embed/avatars/0.png"}
        alt={alt}
        className="w-full h-full rounded-full bg-zinc-800 select-none object-cover relative z-10"
        style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
        draggable={false}
      />

      {decoration && currentDecorationUrl && (
        <img
          src={currentDecorationUrl}
          alt=""
          className="absolute top-1/2 left-1/2 w-[120%] h-[120%] max-w-none pointer-events-none select-none z-20 object-contain"
          style={{ transform: 'translate(-50%, -50%)' }}
          draggable={false}
        />
      )}

      {status && (
        <div
          className="absolute z-30 flex items-center justify-center"
          style={{
            bottom: offset,
            right: offset,
          }}
        >
          <StatusIcon status={status} size={size} />
        </div>
      )}
    </div>
  )
}
