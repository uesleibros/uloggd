import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  UserPlus,
  ThumbsUp,
  Check,
  Trash2,
  Bell,
  BadgeCheck,
  XCircle,
  Ban,
  CheckCircle,
  Gift,
  CheckCheck,
  BellOff,
} from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"

const NOTIFICATION_ICONS = {
  follow: { icon: UserPlus, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  review_like: { icon: ThumbsUp, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  gift_received: { icon: Gift, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  verification_approved: { icon: BadgeCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  verification_rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  account_banned: { icon: Ban, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  account_unbanned: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
}

const NOTIFICATION_USER_ID_MAP = {
  follow: (data) => data.follower_id,
  review_like: (data) => data.liker_id,
  gift_received: (data) => data.from_user_id,
  verification_approved: (data) => data.reviewed_by,
  verification_rejected: (data) => data.reviewed_by,
  account_banned: (data) => data.banned_by,
  account_unbanned: (data) => data.unbanned_by,
}

const NOTIFICATION_LINKS = {
  follow: (data, users) => `/u/${users[data.follower_id]?.username}`,
  review_like: (data) => `/game/${data.game_slug}`,
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
    default:
      return ""
  }
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
      <div className={`overflow-hidden rounded-2xl bg-zinc-900 border ${config.border}`}>
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className={`w-16 h-16 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center mb-5`}>
            <Icon className={`w-8 h-8 ${config.color}`} />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{message}</p>

          {actor && (
            <div className="flex items-center gap-2 mt-5 px-3 py-2 bg-zinc-800/50 rounded-lg">
              <img
                src={actor.avatar}
                alt={actor.username}
                className="w-6 h-6 rounded-full object-cover bg-zinc-700"
              />
              <span className="text-xs text-zinc-400">
                {isGift
                  ? t("notifications.sentBy", { username: actor.username })
                  : t("notifications.reviewedBy", { username: actor.username })}
              </span>
            </div>
          )}

          <p className="text-xs text-zinc-600 mt-4">
            {formatDateLong(notification.created_at)}
          </p>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all cursor-pointer"
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
    <div className="flex items-start gap-3.5 flex-1 min-w-0">
      {showIconOnly ? (
        <div className={`w-10 h-10 rounded-full ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
      ) : (
        <div className="relative flex-shrink-0">
          <img
            src={actorUser?.avatar}
            alt={actorUser?.username}
            className="w-10 h-10 rounded-full object-cover bg-zinc-800"
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full ${config.bg} border-2 border-zinc-900 flex items-center justify-center`}>
            <Icon className={`w-2.5 h-2.5 ${config.color}`} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.read ? "text-zinc-200" : "text-zinc-400"}`}>
          {!showIconOnly && (
            <span className="font-semibold text-white">{actorUser?.username || t("notifications.someone")}</span>
          )}{" "}
          {text}
        </p>
        <span className={`text-xs mt-1 block ${!notification.read ? "text-indigo-400" : "text-zinc-600"}`}>
          {getTimeAgoFromTimestamp(notification.created_at)}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
        )}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer opacity-0 group-hover/item:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )

  const itemClasses = `group/item flex items-start w-full px-4 py-3.5 transition-colors ${
    !notification.read
      ? "bg-indigo-500/[0.03] hover:bg-indigo-500/[0.06]"
      : "hover:bg-zinc-800/50"
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
    <div className="divide-y divide-zinc-800/30">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-start gap-3.5 px-4 py-3.5">
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-3.5 w-4/5 bg-zinc-800 rounded-md animate-pulse" />
            <div className="h-3 w-1/4 bg-zinc-800/60 rounded-md animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function NotificationEmpty() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
        <BellOff className="w-7 h-7 text-zinc-600" />
      </div>
      <p className="text-sm font-medium text-zinc-400 mb-1">{t("notifications.empty")}</p>
      <p className="text-xs text-zinc-600">{t("notifications.emptySubtitle")}</p>
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{t("notifications.title")}</h3>
              {!loading && unreadCount > 0 && (
                <p className="text-xs text-indigo-400">
                  {t("notifications.unreadCount", { count: unreadCount })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => handleAction("read")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title={t("notifications.markAllAsRead")}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("notifications.markAllAsRead")}</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => handleAction("delete")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                title={t("notifications.clearAll")}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("notifications.clearAll")}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {loading ? (
            <NotificationSkeleton />
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-zinc-800/30">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  users={users}
                  onClose={onClose}
                  onAction={handleAction}
                  onSystemClick={setSystemNotification}
                  onDelete={(id) => handleAction("delete", id)}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <NotificationEmpty />
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
