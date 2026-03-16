import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  UserPlus,
  ThumbsUp,
  Trash2,
  Bell,
  BadgeCheck,
  XCircle,
  Ban,
  CheckCircle,
  Gift,
  CheckCheck,
  BellOff,
  List,
  LayoutGrid,
  MessageCircle,
  X
} from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"

const NOTIFICATION_ICONS = {
  follow: { 
    icon: UserPlus, 
    color: "text-indigo-400", 
    bg: "bg-indigo-500/15", 
    border: "border-indigo-500/30",
    gradient: "from-indigo-500/20 to-indigo-600/5"
  },
  review_like: { 
    icon: ThumbsUp, 
    color: "text-pink-400", 
    bg: "bg-pink-500/15", 
    border: "border-pink-500/30",
    gradient: "from-pink-500/20 to-pink-600/5"
  },
  list_like: { 
    icon: List, 
    color: "text-blue-400", 
    bg: "bg-blue-500/15", 
    border: "border-blue-500/30",
    gradient: "from-blue-500/20 to-blue-600/5"
  },
  tierlist_like: { 
    icon: LayoutGrid, 
    color: "text-purple-400", 
    bg: "bg-purple-500/15", 
    border: "border-purple-500/30",
    gradient: "from-purple-500/20 to-purple-600/5"
  },
  gift_received: { 
    icon: Gift, 
    color: "text-amber-400", 
    bg: "bg-amber-500/15", 
    border: "border-amber-500/30",
    gradient: "from-amber-500/20 to-amber-600/5"
  },
  verification_approved: { 
    icon: BadgeCheck, 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/15", 
    border: "border-emerald-500/30",
    gradient: "from-emerald-500/20 to-emerald-600/5"
  },
  verification_rejected: { 
    icon: XCircle, 
    color: "text-red-400", 
    bg: "bg-red-500/15", 
    border: "border-red-500/30",
    gradient: "from-red-500/20 to-red-600/5"
  },
  account_banned: { 
    icon: Ban, 
    color: "text-red-400", 
    bg: "bg-red-500/15", 
    border: "border-red-500/30",
    gradient: "from-red-500/20 to-red-600/5"
  },
  account_unbanned: { 
    icon: CheckCircle, 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/15", 
    border: "border-emerald-500/30",
    gradient: "from-emerald-500/20 to-emerald-600/5"
  },
  profile_comment: { 
    icon: MessageCircle, 
    color: "text-cyan-400", 
    bg: "bg-cyan-500/15", 
    border: "border-cyan-500/30",
    gradient: "from-cyan-500/20 to-cyan-600/5"
  },
  review_comment: { 
    icon: MessageCircle, 
    color: "text-pink-400", 
    bg: "bg-pink-500/15", 
    border: "border-pink-500/30",
    gradient: "from-pink-500/20 to-pink-600/5"
  },
  list_comment: { 
    icon: MessageCircle, 
    color: "text-blue-400", 
    bg: "bg-blue-500/15", 
    border: "border-blue-500/30",
    gradient: "from-blue-500/20 to-blue-600/5"
  },
  tierlist_comment: { 
    icon: MessageCircle, 
    color: "text-purple-400", 
    bg: "bg-purple-500/15", 
    border: "border-purple-500/30",
    gradient: "from-purple-500/20 to-purple-600/5"
  },
}

const NOTIFICATION_USER_ID_MAP = {
  follow: (data) => data.follower_id,
  review_like: (data) => data.liker_id,
  list_like: (data) => data.liker_id,
  tierlist_like: (data) => data.liker_id,
  gift_received: (data) => data.from_user_id,
  verification_approved: (data) => data.reviewed_by,
  verification_rejected: (data) => data.reviewed_by,
  account_banned: (data) => data.banned_by,
  account_unbanned: (data) => data.unbanned_by,
  profile_comment: (data) => data.commenter_id,
  review_comment: (data) => data.commenter_id,
  list_comment: (data) => data.commenter_id,
  tierlist_comment: (data) => data.commenter_id,
}

const NOTIFICATION_LINKS = {
  follow: (data, users) => `/u/${users[data.follower_id]?.username}`,
  review_like: (data) => `/game/${data.game_slug}`,
  list_like: (data) => `/list/${data.list_id}`,
  tierlist_like: (data) => `/tierlist/${data.tierlist_id}`,
  profile_comment: (data) => `/u/${data.profile_username}`,
  review_comment: (data) => `/game/${data.game_slug}`,
  list_comment: (data) => `/list/${data.list_id}`,
  tierlist_comment: (data) => `/tierlist/${data.tierlist_id}`,
}

const MODAL_NOTIFICATIONS = [
  "verification_approved",
  "verification_rejected",
  "account_banned",
  "account_unbanned",
  "gift_received",
]

const ICON_ONLY_NOTIFICATIONS = [
  "verification_approved",
  "verification_rejected",
  "account_banned",
  "account_unbanned",
]

function getNotificationText(type, data, t) {
  switch (type) {
    case "follow":
      return t("notifications.types.follow.text")
    case "review_like":
      return t("notifications.types.review_like.text")
    case "list_like":
      return t("notifications.types.list_like.text", { title: data.list_title })
    case "tierlist_like":
      return t("notifications.types.tierlist_like.text", { title: data.tierlist_title })
    case "gift_received":
      return t("notifications.types.gift_received.title")
    case "verification_approved":
      return t("notifications.types.verification_approved.title")
    case "verification_rejected":
      return t("notifications.types.verification_rejected.title")
    case "account_banned":
      return t("notifications.types.account_banned.title")
    case "account_unbanned":
      return t("notifications.types.account_unbanned.title")
    case "profile_comment":
      return t("notifications.types.profile_comment.text")
    case "review_comment":
      return t("notifications.types.review_comment.text", { game: data.game_name })
    case "list_comment":
      return t("notifications.types.list_comment.text", { title: data.list_title })
    case "tierlist_comment":
      return t("notifications.types.tierlist_comment.text", { title: data.tierlist_title })
    default:
      return ""
  }
}

function getNotificationPreview(type, data) {
  if (!data.content) return null
  const preview = data.content.substring(0, 80)
  return preview + (data.content.length > 80 ? "..." : "")
}

function getNotificationFullText(type, data, t) {
  switch (type) {
    case "gift_received":
      return t("notifications.types.gift_received.message", { item: data.item_name })
    case "verification_approved":
      return t("notifications.types.verification_approved.message")
    case "verification_rejected":
      return data.rejection_reason
        ? t("notifications.types.verification_rejected.messageWithReason", { reason: data.rejection_reason })
        : t("notifications.types.verification_rejected.messageDefault")
    case "account_banned":
      return t("notifications.types.account_banned.message", { reason: data.reason })
    case "account_unbanned":
      return t("notifications.types.account_unbanned.message")
    default:
      return ""
  }
}

function SystemNotificationModal({ notification, users, isOpen, onClose }) {
  const { t } = useTranslation()
  const { formatDateLong } = useDateTime()

  if (!notification) return null

  const config = NOTIFICATION_ICONS[notification.type]
  if (!config) return null

  const Icon = config.icon
  const title = getNotificationText(notification.type, notification.data, t)
  const message = getNotificationFullText(notification.type, notification.data, t)
  const actorId = NOTIFICATION_USER_ID_MAP[notification.type]?.(notification.data)
  const actor = actorId ? users[actorId] : null
  const isGift = notification.type === "gift_received"

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
      zIndex={10001}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/80 shadow-2xl shadow-black/50">
        <div className={`absolute inset-0 bg-gradient-to-b ${config.gradient} opacity-50`} />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative flex flex-col items-center text-center px-6 pt-10 pb-6">
          <div className={`w-16 h-16 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center mb-5 shadow-lg`}>
            <Icon className={`w-8 h-8 ${config.color}`} />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line max-w-[280px]">{message}</p>

          {actor && (
            <div className="flex items-center gap-2.5 mt-6 px-4 py-2.5 bg-zinc-800/60 border border-zinc-700/50 rounded-xl">
              <img
                src={actor.avatar}
                alt={actor.username}
                className="w-7 h-7 rounded-full object-cover bg-zinc-700 ring-2 ring-zinc-600/50"
              />
              <span className="text-sm text-zinc-300">
                {isGift
                  ? t("notifications.sentBy", { username: actor.username })
                  : t("notifications.reviewedBy", { username: actor.username })}
              </span>
            </div>
          )}

          <p className="text-xs text-zinc-600 mt-5">
            {formatDateLong(notification.created_at)}
          </p>
        </div>

        <div className="relative border-t border-zinc-800/80 px-6 py-4 bg-zinc-900/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all cursor-pointer"
          >
            {t("notifications.close")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function NotificationItem({ notification, users, onClose, onAction, onSystemClick, onDelete, t }) {
  const config = NOTIFICATION_ICONS[notification.type]
  const { getTimeAgoFromTimestamp } = useDateTime()

  if (!config) return null

  const Icon = config.icon
  const text = getNotificationText(notification.type, notification.data, t)
  const preview = getNotificationPreview(notification.type, notification.data)
  const actorId = NOTIFICATION_USER_ID_MAP[notification.type]?.(notification.data)
  const actorUser = actorId ? users[actorId] : null
  const opensModal = MODAL_NOTIFICATIONS.includes(notification.type)
  const showIconOnly = ICON_ONLY_NOTIFICATIONS.includes(notification.type)

  function handleClick(e) {
    onAction("read", notification.id)

    if (opensModal) {
      e.preventDefault()
      onSystemClick(notification)
    } else {
      onClose()
    }
  }

  const inner = (
    <div className="flex items-start gap-3 flex-1 min-w-0">
      {showIconOnly ? (
        <div className={`w-11 h-11 rounded-xl ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
      ) : (
        <div className="relative flex-shrink-0">
          <img
            src={actorUser?.avatar}
            alt={actorUser?.username}
            className="w-11 h-11 rounded-xl object-cover bg-zinc-800 shadow-sm"
          />
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg ${config.bg} border-2 border-zinc-900 flex items-center justify-center shadow-sm`}>
            <Icon className={`w-2.5 h-2.5 ${config.color}`} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 py-0.5">
        <p className={`text-sm leading-snug ${!notification.read ? "text-zinc-200" : "text-zinc-400"}`}>
          {!showIconOnly && (
            <span className={`font-semibold ${!notification.read ? "text-white" : "text-zinc-300"}`}>
              {actorUser?.username || t("notifications.someone")}
            </span>
          )}{" "}
          {text}
        </p>
        
        {preview && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-1 italic">
            "{preview}"
          </p>
        )}
        
        <span className={`text-xs mt-1.5 block ${!notification.read ? "text-indigo-400" : "text-zinc-600"}`}>
          {getTimeAgoFromTimestamp(notification.created_at)}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 pt-1">
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
        )}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer opacity-0 group-hover/item:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )

  const itemClasses = `group/item flex items-start w-full px-4 py-3.5 transition-all duration-200 ${
    !notification.read
      ? "bg-gradient-to-r from-indigo-500/[0.08] to-transparent hover:from-indigo-500/[0.12]"
      : "hover:bg-zinc-800/40"
  }`

  if (opensModal) {
    return (
      <button onClick={handleClick} className={`${itemClasses} text-left cursor-pointer`}>
        {inner}
      </button>
    )
  }

  const getLink = NOTIFICATION_LINKS[notification.type]
  const link = getLink ? getLink(notification.data, users) : "/"

  return (
    <Link to={link} onClick={handleClick} className={itemClasses}>
      {inner}
    </Link>
  )
}

function NotificationSkeleton() {
  return (
    <div className="py-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3.5">
          <div className="w-11 h-11 rounded-xl bg-zinc-800/80 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-3.5 w-3/4 bg-zinc-800/80 rounded-lg animate-pulse" />
            <div className="h-3 w-1/3 bg-zinc-800/50 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function NotificationEmpty() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-5 shadow-lg">
        <BellOff className="w-9 h-9 text-zinc-600" />
      </div>
      <p className="text-base font-medium text-zinc-400 mb-1">{t("notifications.empty")}</p>
      <p className="text-sm text-zinc-600">{t("notifications.emptySubtext")}</p>
    </div>
  )
}

export default function NotificationPanel({ visible, onClose, onRead }) {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [systemNotification, setSystemNotification] = useState(null)

  const fetchNotifications = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    try {
      const r = await fetch("/api/notifications/@me/list", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await r.json()

      const userIds = [
        ...new Set(
          data.flatMap((n) => {
            const getUserId = NOTIFICATION_USER_ID_MAP[n.type]
            if (!getUserId) return []
            const userId = getUserId(n.data)
            return userId ? [userId] : []
          })
        ),
      ]

      let usersMap = {}
      if (userIds.length > 0) {
        const params = new URLSearchParams()
        userIds.forEach((id) => params.append("userIds", id))

        const uRes = await fetch(`/api/users/batch?${params}`)
        const uData = await uRes.json()
        uData.forEach((u) => {
          usersMap[u.user_id] = u
        })
      }

      setNotifications(data || [])
      setUsers(usersMap)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (visible) {
      setLoading(true)
      fetchNotifications()
    }
  }, [visible, fetchNotifications])

  const handleAction = async (action, notificationId) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
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
        setNotifications((prev) =>
          notificationId
            ? prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
            : prev.map((n) => ({ ...n, read: true }))
        )
      } else if (action === "delete") {
        if (notificationId) {
          setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        } else {
          setNotifications([])
        }
      }

      onRead()
    } catch {}
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <>
      <Modal
        isOpen={visible}
        onClose={onClose}
        fullscreenMobile
        showMobileGrip
        showCloseButton={false}
        maxWidth="max-w-md"
        noScroll
        zIndex={10000}
      >
        <div className="flex flex-col h-full bg-zinc-900/95 backdrop-blur-xl">
          <div className="relative flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5" />
            
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{t("notifications.title")}</h3>
                {!loading && (
                  <p className="text-xs text-zinc-500">
                    {unreadCount > 0 
                      ? t("notifications.unreadCount", { count: unreadCount })
                      : t("notifications.allCaughtUp")
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="relative flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => handleAction("read")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer"
                  title={t("notifications.markAllAsRead")}
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("notifications.markAllAsRead")}</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => handleAction("delete")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                  title={t("notifications.clearAll")}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("notifications.clearAll")}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {loading ? (
              <NotificationSkeleton />
            ) : notifications.length > 0 ? (
              <div className="py-1">
                {notifications.map((n, idx) => (
                  <div key={n.id}>
                    <NotificationItem
                      notification={n}
                      users={users}
                      onClose={onClose}
                      onAction={handleAction}
                      onSystemClick={setSystemNotification}
                      onDelete={(id) => handleAction("delete", id)}
                      t={t}
                    />
                    {idx < notifications.length - 1 && (
                      <div className="mx-4 border-b border-zinc-800/40" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <NotificationEmpty />
            )}
          </div>

          {!loading && notifications.length > 0 && (
            <div className="flex-shrink-0 px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/80">
              <p className="text-xs text-zinc-600 text-center">
                {t("notifications.showingCount", { count: notifications.length })}
              </p>
            </div>
          )}
        </div>
      </Modal>

      <SystemNotificationModal
        notification={systemNotification}
        users={users}
        isOpen={!!systemNotification}
        onClose={() => setSystemNotification(null)}
      />
    </>
  )
}