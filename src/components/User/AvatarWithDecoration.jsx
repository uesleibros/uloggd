import { AVATAR_DECORATIONS } from "../../../data/avatarDecorations"

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36',
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
    <div className={`avatar-wrapper ${sizeClasses[size]} ${className}`}>
      <img
        src={src || "https://cdn.discordapp.com/embed/avatars/0.png"}
        alt={alt}
        className="w-full h-full rounded-full border-4 border-zinc-900 shadow-2xl bg-zinc-800 select-none object-cover relative z-10"
        draggable={false}
      />
      
      {decoration && currentDecorationUrl && (
        <img
          src={currentDecorationUrl}
          alt=""
          className="absolute top-1/2 left-1/2 pointer-events-none select-none z-20 object-contain"
          style={{
            width: 'calc(100% + 64px)',
            height: 'calc(100% + 64px)',
            transform: 'translate(-50%, -50%)'
          }}
          draggable={false}
        />
      )}
    </div>
  )
}
