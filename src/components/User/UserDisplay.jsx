import { Link } from "react-router-dom"
import UserBadges from "./UserBadges"
import AvatarWithDecoration from "./AvatarWithDecoration"

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
      <AvatarWithDecoration
        src={user.avatar}
        alt={user.username}
        decoration={user.avatar_decoration}
        size={size}
      />
      {showUsername && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm text-white truncate">{user.username}</span>
          {showBadges && (
            <UserBadges user={user} size="sm" />
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
