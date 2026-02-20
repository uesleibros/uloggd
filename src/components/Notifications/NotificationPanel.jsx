import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { UserPlus, ThumbsUp, Check, Trash2, X, Bell } from "lucide-react"
import { supabase } from "../../lib/supabase"
import AvatarWithDecoration from "../User/AvatarWithDecoration"

const NOTIFICATION_CONFIG = {
  follow: {
    icon: UserPlus,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    getMessage: (data) => `${data.follower_username} começou a te seguir`,
    getLink: (data) => `/u/${data.follower_username}`,
  },
  log_like: {
    icon: ThumbsUp,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    getMessage: (data) => `${data.liker_username} curtiu sua review`,
    getLink: (data) => `/game/${data.game_slug}`,
  },
}

function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`
  return `${Math.floor(diff / 2592000)}m`
}

function NotificationItem({ notification, onClose, onAction }) {
  const config = NOTIFICATION_CONFIG[notification.type]
  if (!config) return null

  const Icon = config.icon
  const link = config.getLink(notification.data)
  const message = config.getMessage(notification.data)

  return (
    <Link
      to={link}
      onClick={() => {
        onAction("read", notification.id)
        onClose()
      }}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors ${
        !notification.read ? "bg-zinc-800/30" : ""
      }`}
    >
      <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.read ? "text-zinc-200" : "text-zinc-400"}`}>
          {message}
        </p>
        <span className="text-xs text-zinc-600 mt-0.5 block">{getTimeAgo(notification.created_at)}</span>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
      )}
    </Link>
  )
}

export default function NotificationPanel({ onClose, onRead }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const panelRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const r = await fetch("/api/notifications?action=list", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const data = await r.json()
        setNotifications(data || [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleAction = async (action, notificationId) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      await fetch(`/api/notifications?action=${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ notificationId }),
      })

      if (action === "read") {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
      } else if (action === "delete") {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }

      onRead()
    } catch {}
  }

  const handleReadAll = () => handleAction("read")
  const handleDeleteAll = () => {
    handleAction("delete")
    setNotifications([])
  }

  const hasUnread = notifications.some(n => !n.read)

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Notificações</h3>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <button
              onClick={handleReadAll}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              title="Marcar todas como lidas"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
              title="Limpar todas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-zinc-800/50">
            {notifications.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClose={onClose}
                onAction={handleAction}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">Nenhuma notificação</p>
          </div>
        )}
      </div>
    </div>
  )
}
