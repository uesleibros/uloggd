import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { useNotifications } from "#hooks/useNotifications"
import NotificationPanel from "@components/User/Notifications/NotificationPanel"

export default function NotificationBell() {
  const { unreadCount, refetch } = useNotifications()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => setOpen(false), 200)
  }

  return (
    <div className="relative">
      <button
        onClick={() => open ? handleClose() : setOpen(true)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          visible={visible}
          onClose={handleClose}
          onRead={refetch}
        />
      )}
    </div>
  )
}
