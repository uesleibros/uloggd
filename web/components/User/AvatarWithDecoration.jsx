import { AVATAR_DECORATIONS } from "#data/avatarDecorations"

const sizeMap = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
  '2xl': 80,
  mention: 80,
  profile: 128,
}

const statusMap = {
  xs: { size: 6, x: 14, y: 14, stroke: 1.5 },
  sm: { size: 10, x: 18, y: 18, stroke: 1.5 },
  md: { size: 10, x: 26, y: 26, stroke: 1.5 },
  lg: { size: 12, x: 36, y: 36, stroke: 2 },
  xl: { size: 16, x: 48, y: 48, stroke: 2 },
  '2xl': { size: 20, x: 60, y: 60, stroke: 2.5 },
  mention: { size: 20, x: 60, y: 60, stroke: 2.5 },
  profile: { size: 24, x: 104, y: 104, stroke: 3 }, // Ajustado
}

const statusColors = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
  offline: '#80848e',
}

function StatusIcon({ status, x, y, size }) {
  const half = size / 2
  const center = half

  if (status === 'offline') {
    const inner = half * 0.5
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle cx={center} cy={center} r={half} fill={statusColors.offline} />
        <circle cx={center} cy={center} r={inner} fill="#000" />
      </g>
    )
  }

  if (status === 'idle') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle cx={center} cy={center} r={half} fill={statusColors.idle} />
        <circle cx={center * 0.5} cy={center * 0.5} r={half * 0.5} fill="#000" />
      </g>
    )
  }

  if (status === 'dnd') {
    const barH = size * 0.2
    const barW = size * 0.6
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle cx={center} cy={center} r={half} fill={statusColors.dnd} />
        <rect x={center - barW / 2} y={center - barH / 2} width={barW} height={barH} rx={barH / 2} fill="#000" />
      </g>
    )
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={center} cy={center} r={half} fill={statusColors.online} />
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
  const pxSize = sizeMap[size] || 64
  const statusConfig = statusMap[size] || statusMap.xl

  const maskId = `mask-${size}-${src?.slice(-5) || 'default'}-${status || 'none'}`

  return (
    <div
      className={`relative inline-block select-none ${className}`}
      style={{ width: pxSize, height: pxSize }}
    >
      <svg
        viewBox={`0 0 ${pxSize} ${pxSize}`}
        className="w-full h-full block"
        aria-hidden="true"
      >
        <mask id={maskId}>
          <circle cx={pxSize / 2} cy={pxSize / 2} r={pxSize / 2} fill="white" />
          {status && (
            <circle
              cx={statusConfig.x + statusConfig.size / 2}
              cy={statusConfig.y + statusConfig.size / 2}
              r={statusConfig.size / 2 + statusConfig.stroke}
              fill="black"
            />
          )}
        </mask>

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
            className="w-full h-full object-cover bg-zinc-800"
            draggable={false}
          />
        </foreignObject>

        {status && (
          <StatusIcon
            status={status}
            x={statusConfig.x}
            y={statusConfig.y}
            size={statusConfig.size}
          />
        )}
      </svg>

      {decoration && currentDecorationUrl && (
        <img
          src={currentDecorationUrl}
          alt=""
          className="absolute top-1/2 left-1/2 w-[120%] h-[120%] max-w-none pointer-events-none select-none object-contain z-10"
          style={{ transform: 'translate(-50%, -50%)' }}
          draggable={false}
        />
      )}
    </div>
  )
}
