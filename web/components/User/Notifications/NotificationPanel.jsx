import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { UserPlus, ThumbsUp, Check, Trash2, X, Bell, BadgeCheck, XCircle, Ban, CheckCircle } from "lucide-react"
import { supabase } from "#lib/supabase"
import { getTimeAgo, formatDateLong } from "#utils/formatDate"
import Modal from "@components/UI/Modal"

const NOTIFICATION_CONFIG = {
  follow: {
    icon: UserPlus,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    getActor: (data, users) => users[data.follower_id]?.username || "Alguém",
    getText: () => "começou a te seguir",
    getLink: (data, users) => `/u/${users[data.follower_id]?.username}`,
    getUserId: (data) => data.follower_id,
  },
  review_like: {
    icon: ThumbsUp,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    getActor: (data, users) => users[data.liker_id]?.username || "Alguém",
    getText: () => "curtiu sua review",
    getLink: (data) => `/game/${data.game_slug}`,
    getUserId: (data) => data.liker_id,
  },
  verification_approved: {
    icon: BadgeCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    getText: () => "Verificação aprovada",
    getFullText: () => "Parabéns! Sua solicitação de verificação foi aprovada. O selo de verificado já está visível no seu perfil.",
    getUserId: (data) => data.reviewed_by,
    isSystem: true,
  },
  verification_rejected: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    borderColor: "border-red-500/30",
    getText: () => "Verificação rejeitada",
    getFullText: (data) => data.rejection_reason
      ? `Sua solicitação de verificação foi rejeitada.\n\nMotivo: ${data.rejection_reason}`
      : "Sua solicitação de verificação foi rejeitada. Você pode enviar uma nova solicitação a qualquer momento.",
    getUserId: (data) => data.reviewed_by,
    isSystem: true,
  },
  account_banned: {
    icon: Ban,
    color: "text-red-400",
    bg: "bg-red-500/10",
    borderColor: "border-red-500/30",
    getText: () => "Conta suspensa",
    getFullText: (data) => `Sua conta foi suspensa.\n\nMotivo: ${data.reason}`,
    getUserId: (data) => data.banned_by,
    isSystem: true,
  },
  account_unbanned: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    getText: () => "Conta restaurada",
    getFullText: () => "Sua conta foi restaurada. Bem-vindo de volta!",
    getUserId: (data) => data.unbanned_by,
    isSystem: true,
  },
}

function SystemNotificationModal({ notification, users, isOpen, onClose }) {
  if (!notification) return null

  const config = NOTIFICATION_CONFIG[notification.type]
  if (!config) return null

  const Icon = config.icon
  const title = config.getText(notification.data)
  const message = config.getFullText(notification.data)
  const reviewerId = config.getUserId(notification.data)
  const reviewer = reviewerId ? users[reviewerId] : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className={`overflow-hidden rounded-2xl bg-zinc-900 border ${config.borderColor}`}>
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className={`w-16 h-16 rounded-2xl ${config.bg} border ${config.borderColor} flex items-center justify-center mb-5`}>
            <Icon className={`w-8 h-8 ${config.color}`} />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{message}</p>

          {reviewer && (
            <div className="flex items-center gap-2 mt-5 px-3 py-2 bg-zinc-800/50 rounded-lg">
              <img
                src={reviewer.avatar}
                alt={reviewer.username}
                className="w-6 h-6 rounded-full object-cover bg-zinc-700"
              />
              <span className="text-xs text-zinc-400">
                Revisado por <span className="text-zinc-300 font-medium">{reviewer.username}</span>
              </span>
            </div>
          )}

          <p className="text-xs text-zinc-600 mt-4">
            {formatDateLong(new Date(notification.created_at).getTime() / 1000)}
          </p>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function NotificationItem({ notification, users, onClose, onAction, onSystemClick }) {
  const config = NOTIFICATION_CONFIG[notification.type]
  if (!config) return null

  const Icon = config.icon
  const text = config.getText(notification.data, users)
  const actorId = config.getUserId(notification.data)
  const actorUser = actorId ? users[actorId] : null
  const isSystem = config.isSystem

  function handleClick(e) {
    onAction("read", notification.id)

    if (isSystem) {
      e.preventDefault()
      onSystemClick(notification)
    } else {
      onClose()
    }
  }

  const content = (
    <>
      {isSystem ? (
        <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
      ) : (
        <img
          src={actorUser?.avatar}
          alt={actorUser?.username}
          className="w-9 h-9 rounded-full object-cover bg-zinc-800 flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.read ? "text-zinc-200" : "text-zinc-400"}`}>
          {!isSystem && <span className="font-semibold text-white">{actorUser?.username || "Alguém"}</span>} {text}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Icon className={`w-3 h-3 ${config.color}`} />
          <span className="text-xs text-zinc-600">{getTimeAgo(notification.created_at)}</span>
        </div>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
      )}
    </>
  )

  if (isSystem) {
    return (
      <button
        onClick={handleClick}
        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left cursor-pointer ${
          !notification.read ? "bg-zinc-800/30" : ""
        }`}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      to={config.getLink(notification.data, users)}
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors ${
        !notification.read ? "bg-zinc-800/30" : ""
      }`}
    >
      {content}
    </Link>
  )
}

export default function NotificationPanel({ visible, onClose, onRead }) {
  const [notifications, setNotifications] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [systemNotification, setSystemNotification] = useState(null)
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
        const r = await fetch("/api/notifications/@me/list", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const data = await r.json()

        const userIds = [...new Set(data.flatMap(n => {
          const config = NOTIFICATION_CONFIG[n.type]
          if (!config) return []
          const userId = config.getUserId(n.data)
          return userId ? [userId] : []
        }))]

        let usersMap = {}
        if (userIds.length > 0) {
          const params = new URLSearchParams()
          userIds.forEach(id => params.append("userIds", id))

          const uRes = await fetch(`/api/users/batch?${params}`)
          const uData = await uRes.json()
          uData.forEach(u => { usersMap[u.id] = u })
        }

        setNotifications(data || [])
        setUsers(usersMap)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleAction = async (action, notificationId) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      await fetch(`/api/notifications/@me/${action}`, {
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
    <>
      <div
        ref={panelRef}
        className={`absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden origin-top-right transition-all duration-200 ${
          visible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
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
                  users={users}
                  onClose={onClose}
                  onAction={handleAction}
                  onSystemClick={setSystemNotification}
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

      <SystemNotificationModal
        notification={systemNotification}
        users={users}
        isOpen={!!systemNotification}
        onClose={() => setSystemNotification(null)}
      />
    </>
  )

}
