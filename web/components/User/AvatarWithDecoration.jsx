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
  streaming: '#593695',
  offline: '#80848e',
}

function StatusIcon({ status, size }) {
  const s = indicatorSizes[size] || 18
  const half = s / 2

  if (status === 'offline') {
    const inner = half * 0.45
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half} fill={statusColors.offline} />
        <circle cx={half} cy={half} r={inner} fill="currentColor" className="text-zinc-900" />
      </svg>
    )
  }

  if (status === 'idle') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half} fill={statusColors.idle} />
        <circle cx={half * 0.7} cy={half * 0.7} r={half * 0.6} fill="currentColor" className="text-zinc-900" />
      </svg>
    )
  }

  if (status === 'streaming') {
    const x1 = s * 0.361
    const x2 = s * 0.722
    const y1 = s * 0.25
    const y2 = s * 0.75
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half} fill={statusColors.streaming} />
        <path d={`M${x1},${y1} L${x2},${half} L${x1},${y2} Z`} fill="currentColor" className="text-zinc-900" />
      </svg>
    )
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={half} cy={half} r={half} fill={statusColors.online} />
    </svg>
  )
}

export default function AvatarWithDecoration({ 
  src, 
  alt, 
  decoration = null,
  size = 'xl',
  status = null,
  isStreaming = false,
  className = '' 
}) {
  const currentDecorationUrl = AVATAR_DECORATIONS.find(d => d.id === decoration)?.url || null
  const offset = indicatorOffset[size] || -2
  const padding = cutoutPadding[size] || 3
  const iconSize = indicatorSizes[size] || 18
  const totalSize = iconSize + padding * 2
  
  const finalStatus = isStreaming ? 'streaming' : status
  
  return (
    <div className={`avatar-wrapper ${sizeClasses[size]} ${className}`}>
      <img
        src={src || "https://cdn.discordapp.com/embed/avatars/0.png"}
        alt={alt}
        className="w-full h-full rounded-full bg-zinc-800 select-none object-cover relative z-10"
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

      {finalStatus && (
        <div
          className="absolute z-30 flex items-center justify-center rounded-full bg-zinc-900"
          style={{
            bottom: offset,
            right: offset,
            width: totalSize,
            height: totalSize,
          }}
        >
          <StatusIcon status={finalStatus} size={size} />
        </div>
      )}
    </div>
  )
}
