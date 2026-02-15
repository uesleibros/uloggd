import { Link } from "react-router-dom"

function UserBadges({ isVerified, isModerator }) {
  if (!isVerified && !isModerator) return null

  return (
    <div className="flex items-center gap-1">
      {isVerified && (
        <img
          src="/badges/verified.png"
          alt="Verificado"
          title="Verificado"
          className="w-4 h-4 select-none"
          draggable={false}
        />
      )}
      {isModerator && (
        <img
          src="/badges/moderator.png"
          alt="Moderador"
          title="Moderador"
          className="w-4 h-4 select-none"
          draggable={false}
        />
      )}
    </div>
  )
}

function UserAvatar({ avatar, username, size = "md" }) {
  const sizes = {
    xs: "h-5 w-5",
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  }

  return (
    <img
      src={avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
      alt={username}
      className={`${sizes[size]} rounded-full object-cover bg-zinc-800 select-none`}
      draggable={false}
    />
  )
}

export default function UserDisplay({
  user,
  size = "md",
  showBadges = true,
  showUsername = true,
  linkToProfile = false,
  className = "",
}) {
  if (!user) return null

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <UserAvatar
        avatar={user.avatar}
        username={user.username}
        size={size}
      />
      {showUsername && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm text-white truncate">{user.username}</span>
          {showBadges && (
            <UserBadges
              isVerified={user.is_verified}
              isModerator={user.is_moderator}
            />
          )}
        </div>
      )}
    </div>
  )

  if (linkToProfile) {
    return (
      <Link
        to={`/u/${user.username}`}
        className="hover:opacity-80 transition-opacity"
      >
        {content}
      </Link>
    )
  }

  return content
}

export { UserAvatar, UserBadges }