import { Link } from "react-router-dom"
import { Bell } from "lucide-react"
import { useNotifications } from "#hooks/useNotifications"
import { useFaviconBadge } from "#hooks/useFaviconBadge"

export default function NotificationBell() {
  const { unreadCount } = useNotifications()

  useFaviconBadge(unreadCount)

  return (
    <Link
      to="/notifications"
      className="relative p-2 text-zinc-400 hover:text-white transition-colors"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}
