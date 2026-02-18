import { AVATAR_DECORATIONS } from "../../../data/avatarDecorations"

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36',
}

const decorationSizes = {
  sm: 'w-14 h-14',
  md: 'w-22 h-22',
  lg: 'w-32 h-32',
  xl: 'w-32 h-32 sm:w-44 sm:h-44 md:w-48 md:h-48',
}

export default function AvatarWithDecoration({ 
  src, 
  alt, 
  decoration = null,
  size = 'xl',
  className = '' 
}) {
  const currentDecorationUrl = AVATAR_DECORATIONS.find(d => d.id === decoration)?.url || null
  
  return (
    <div className={`avatar-wrapper ${className}`}>
      <img
        src={src || "https://cdn.discordapp.com/embed/avatars/0.png"}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full border-4 border-zinc-900 shadow-2xl bg-zinc-800 select-none object-cover relative z-10`}
        draggable={false}
      />
      
      {decoration && (
        <img
          src={currentDecorationUrl}
          alt=""
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${decorationSizes[size]} pointer-events-none select-none z-20`}
          draggable={false}
          style={{ imageRendering: 'auto' }}
        />
      )}
    </div>
  )
}
