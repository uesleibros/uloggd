import { AVATAR_DECORATIONS } from "#data/avatarDecorations"

const sizeMap = {
  xs: 20,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 80,
  '2xl': 96,
  mention: 96,
  profile: 120,
}

const statusMap = {
  xs: { size: 6, x: 14, y: 14, stroke: 1 },
  sm: { size: 10, x: 22, y: 22, stroke: 1.5 },
  md: { size: 12, x: 28, y: 28, stroke: 1.5 },
  lg: { size: 14, x: 34, y: 34, stroke: 2 },
  xl: { size: 22, x: 58, y: 58, stroke: 3 },
  '2xl': { size: 26, x: 70, y: 70, stroke: 3.5 },
  mention: { size: 26, x: 70, y: 70, stroke: 3.5 },
  profile: { size: 30, x: 88, y: 88, stroke: 4 },
}

const statusColors = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
  offline: '#80848e',
}

function StatusIcon({ status, x, y, size }) {
  const radius = size / 2
  const center = radius

  if (status === 'offline') {
    const inner = radius * 0.5
    return (
      <g transform={`translate(${x}, ${y})`}>
        <mask id={`offline-${size}-${x}`}>
          <rect width={size} height={size} fill="white" />
          <circle cx={center} cy={center} r={inner} fill="black" />
        </mask>
        <circle cx={center} cy={center} r={radius} fill={statusColors.offline} mask={`url(#offline-${size}-${x})`} />
      </g>
    )
  }

  if (status === 'idle') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <mask id={`idle-${size}-${x}`}>
          <rect width={size} height={size} fill="white" />
          <circle cx={-1} cy={-1} r={radius * 0.85} fill="black" />
        </mask>
        <circle cx={center} cy={center} r={radius} fill={statusColors.idle} mask={`url(#idle-${size}-${x})`} />
      </g>
    )
  }

  if (status === 'dnd') {
    const barH = size * 0.25
    const barW = size * 0.6
    return (
      <g transform={`translate(${x}, ${y})`}>
        <mask id={`dnd-${size}-${x}`}>
          <rect width={size} height={size} fill="white" />
          <rect x={center - barW / 2} y={center - barH / 2} width={barW} height={barH} rx={barH / 2} fill="black" />
        </mask>
        <circle cx={center} cy={center} r={radius} fill={statusColors.dnd} mask={`url(#dnd-${size}-${x})`} />
      </g>
    )
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={center} cy={center} r={radius} fill={statusColors.online} />
    </g>
  )
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
  const pxSize = sizeMap[size] || 80
  const statusConfig = statusMap[size] || statusMap.xl

  // Máscara única pro avatar
  const maskId = `avatar-mask-${size}-${status ? status : 'none'}-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div
      className={`relative inline-block select-none ${className}`}
      style={{ width: pxSize, height: pxSize }}
    >
      <svg
        viewBox={`0 0 ${pxSize} ${pxSize}`}
        className="w-full h-full block overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            <rect width={pxSize} height={pxSize} fill="white" />
            {status && (
              <circle
                cx={statusConfig.x + statusConfig.size / 2}
                cy={statusConfig.y + statusConfig.size / 2}
                r={(statusConfig.size / 2) + statusConfig.stroke}
                fill="black"
              />
            )}
          </mask>
        </defs>

        <foreignObject
          x="0"
          y="0"
          width="100%"
          height="100%"
          mask={`url(#${maskId})`}
        >
          <img
            src={src || "https://cdn.discordapp.com/embed/avatars/0.png"}
            alt={alt}
            className="w-full h-full object-cover rounded-full bg-zinc-800"
            draggable={false}
          />
        </foreignObject>

        {decoration && currentDecorationUrl && (
          <foreignObject
            x={-(pxSize * 0.2 / 2)}
            y={-(pxSize * 0.2 / 2)}
            width={pxSize * 1.2}
            height={pxSize * 1.2}
            className="pointer-events-none select-none z-10"
            mask={`url(#${maskId})`}
          >
            <img
              src={currentDecorationUrl}
              alt=""
              className="w-full h-full object-contain"
              draggable={false}
            />
          </foreignObject>
        )}

        {status && (
          <StatusIcon
            status={status}
            x={statusConfig.x}
            y={statusConfig.y}
            size={statusConfig.size}
          />
        )}
      </svg>
    </div>
  )
}
