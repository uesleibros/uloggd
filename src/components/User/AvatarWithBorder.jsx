const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24 sm:w-32 sm:h-32',
  xl: 'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36',
}

export default function AvatarWithBorder({ 
  src, 
  alt, 
  border = 'default', 
  size = 'xl',
  className = '' 
}) {
  return (
    <div className={`avatar-wrapper ${className}`} data-border={border}>
      <img
        src={src || "https://cdn.discordapp.com/embed/avatars/0.png"}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full border-4 border-zinc-900 shadow-2xl bg-zinc-800 select-none object-cover relative z-10`}
        draggable={false}
      />
    </div>
  )
}
