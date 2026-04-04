import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
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
  Camera,
  Reply,
  Heart,
  ArrowLeft,
  Check,
  MoreHorizontal
} from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { useNotifications } from "#hooks/useNotifications"
import { supabase } from "#lib/supabase"
import { encode } from "#utils/shortId"
import Modal from "@components/UI/Modal"

const NOTIFICATION_ICONS = {
  follow: { icon: UserPlus, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  review_like: { icon: ThumbsUp, color: "text-pink-400", bg: "bg-pink-500/10" },
  list_like: { icon: List, color: "text-blue-400", bg: "bg-blue-500/10" },
  tierlist_like: { icon: LayoutGrid, color: "text-purple-400", bg: "bg-purple-500/10" },
  profile_like: { icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10" },
  gift_received: { icon: Gift, color: "text-amber-400", bg: "bg-amber-500/10" },
  verification_approved: { icon: BadgeCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  verification_rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  account_banned: { icon: Ban, color: "text-red-400", bg: "bg-red-500/10" },
  account_unbanned: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  profile_comment: { icon: MessageCircle, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  review_comment: { icon: MessageCircle, color: "text-pink-400", bg: "bg-pink-500/10" },
  list_comment: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
  tierlist_comment: { icon: MessageCircle, color: "text-purple-400", bg: "bg-purple-500/10" },
  screenshot_like: { icon: Camera, color: "text-teal-400", bg: "bg-teal-500/10" },
  screenshot_comment: { icon: Camera, color: "text-teal-400", bg: "bg-teal-500/10" },
  comment_reply: { icon: Reply, color: "text-orange-400", bg: "bg-orange-500/10" },
}

const NOTIFICATION_USER_ID_MAP = {
  follow: (data) => data.follower_id,
  review_like: (data) => data.liker_id,
  list_like: (data) => data.liker_id,
  tierlist_like: (data) => data.liker_id,
  profile_like: (data) => data.liker_id,
  gift_received: (data) => data.from_user_id,
  verification_approved: (data) => data.reviewed_by,
  verification_rejected: (data) => data.reviewed_by,
  account_banned: (data) => data.banned_by,
  account_unbanned: (data) => data.unbanned_by,
  profile_comment: (data) => data.commenter_id,
  review_comment: (data) => data.commenter_id,
  list_comment: (data) => data.commenter_id,
  tierlist_comment: (data) => data.commenter_id,
  screenshot_like: (data) => data.liker_id,
  screenshot_comment: (data) => data.commenter_id,
  comment_reply: (data) => data.replier_id,
}

function getCommentReplyLink(data, users) {
  const { target_type, target_id } = data
  switch (target_type) {
    case "profile":
      return `/u/${users[target_id]?.username}`
    case "review":
      return `/review/${target_id}`
    case "list":
      return `/list/${encode(target_id)}`
    case "tierlist":
      return `/tierlist/${encode(target_id)}`
    case "screenshot":
      return `/screenshot/${target_id}`
    default:
      return "/"
  }
}

const NOTIFICATION_LINKS = {
  follow: (data, users) => `/u/${users[data.follower_id]?.username}`,
  list_like: (data) => `/list/${encode(data.list_id)}`,
  tierlist_like: (data) => `/tierlist/${encode(data.tierlist_id)}`,
  profile_like: (data, users) => `/u/${users[data.liker_id]?.username}`,
  profile_comment: (data) => `/u/${data.profile_username}`,
  list_comment: (data) => `/list/${encode(data.list_id)}`,
  tierlist_comment: (data) => `/tierlist/${encode(data.tierlist_id)}`,
  review_comment: (data) => `/review/${data.review_id}`,
  review_like: (data) => `/review/${data.review_id}`,
  screenshot_like: (data) => `/screenshot/${data.screenshot_id}`,
  screenshot_comment: (data) => `/screenshot/${data.screenshot_id}`,
  comment_reply: getCommentReplyLink,
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
      return t("notifications.types.list_like.text", { title: data.list_title || "..." })
    case "tierlist_like":
      return t("notifications.types.tierlist_like.text", { title: data.tierlist_title || "..." })
    case "profile_like":
      return t("notifications.types.profile_like.text")
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
      return t("notifications.types.review_comment.text", { game: data.game_name || "..." })
    case "list_comment":
      return t("notifications.types.list_comment.text", { title: data.list_title || "..." })
    case "tierlist_comment":
      return t("notifications.types.tierlist_comment.text", { title: data.tierlist_title || "..." })
    case "screenshot_like":
      return t("notifications.types.screenshot_like.text")
    case "screenshot_comment":
      return t("notifications.types.screenshot_comment.text")
    case "comment_reply":
      return t("notifications.types.comment_reply.text")
    default:
      return ""
  }
}

function getNotificationPreview(type, data) {
  if (!data.content) return null
  const preview = data.content.substring(0, 100)
  return preview + (data.content.length > 100 ? "..." : "")
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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" showCloseButton={false}>
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm text-zinc-400 whitespace-pre-line leading-relaxed">{message}</p>
          </div>
        </div>

        {actor && (
          <div className="flex items-center gap-2.5 py-2.5 px-3 bg-zinc-800/50 rounded-lg mb-4">
            <img src={actor.avatar} alt={actor.username} className="w-6 h-6 rounded-full object-cover" />
            <span className="text-sm text-zinc-400">
              {isGift
                ? t("notifications.sentBy", { username: actor.username })
                : t("notifications.reviewedBy", { username: actor.username })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">{formatDateLong(notification.created_at)}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            {t("notifications.close")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function NotificationItem({ notification, users, onAction, onSystemClick, t }) {
  const navigate = useNavigate()
  const config = NOTIFICATION_ICONS[notification.type]
  const { getTimeAgoFromTimestamp } = useDateTime()
  const [showActions, setShowActions] = useState(false)

  if (!config) return null

  const Icon = config.icon
  const text = getNotificationText(notification.type, notification.data, t)
  const preview = getNotificationPreview(notification.type, notification.data)
  const actorId = NOTIFICATION_USER_ID_MAP[notification.type]?.(notification.data)
  const actorUser = actorId ? users[actorId] : null
  const opensModal = MODAL_NOTIFICATIONS.includes(notification.type)
  const showIconOnly = ICON_ONLY_NOTIFICATIONS.includes(notification.type)

  function handleClick(e) {
    if (e.target.closest("[data-action]")) return
    
    onAction("read", notification.id)
    if (opensModal) {
      onSystemClick(notification)
    } else {
      const getLink = NOTIFICATION_LINKS[notification.type]
      const link = getLink ? getLink(notification.data, users) : "/"
      navigate(link)
    }
  }

  function handleMarkAsRead(e) {
    e.stopPropagation()
    onAction("read", notification.id)
    setShowActions(false)
  }

  function handleDelete(e) {
    e.stopPropagation()
    onAction("delete", notification.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 ${
        !notification.read
          ? "bg-indigo-500/[0.03] hover:bg-indigo-500/[0.06]"
          : "hover:bg-zinc-800/40"
      }`}
    >
      {!notification.read && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-indigo-500" />
      )}

      {showIconOnly ? (
        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
      ) : (
        <div className="relative flex-shrink-0">
          <img
            src={actorUser?.avatar}
            alt={actorUser?.username}
            className="w-10 h-10 rounded-full object-cover bg-zinc-800"
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${config.bg} border-2 border-zinc-900 flex items-center justify-center`}>
            <Icon className={`w-2.5 h-2.5 ${config.color}`} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-sm leading-snug ${!notification.read ? "text-zinc-100" : "text-zinc-400"}`}>
          {!showIconOnly && (
            <span className="font-semibold hover:underline">{actorUser?.username || t("notifications.someone")}</span>
          )}{" "}
          <span className={!notification.read ? "text-zinc-300" : "text-zinc-500"}>{text}</span>
        </p>
        
        {preview && (
          <p className="text-[13px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">"{preview}"</p>
        )}
        
        <span className={`text-xs mt-1.5 block ${!notification.read ? "text-indigo-400/80" : "text-zinc-600"}`}>
          {getTimeAgoFromTimestamp(notification.created_at)}
        </span>
      </div>

      <div className="relative flex-shrink-0" data-action>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowActions(!showActions)
          }}
          className="p-1.5 text-zinc-600 hover:text-zinc-400 rounded-full hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {showActions && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {!notification.read && (
                <button
                  onClick={handleMarkAsRead}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {t("notifications.markAsRead")}
                </button>
              )}
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700/50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {t("notifications.delete")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function NotificationsPageSkeleton() {
  return (
    <div className="py-6 sm:py-10 max-w-2xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-20 bg-zinc-800 rounded" />
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 bg-zinc-800 rounded" />
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-zinc-800 rounded-lg" />
            <div className="w-9 h-9 bg-zinc-800 rounded-lg" />
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-zinc-800/50 last:border-0">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-4/5 bg-zinc-800 rounded" />
                <div className="h-3 w-1/3 bg-zinc-800/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotificationsEmpty() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
        <BellOff className="w-7 h-7 text-zinc-600" />
      </div>
      <h3 className="text-base font-medium text-zinc-400 mb-1">{t("notifications.emptyTitle")}</h3>
      <p className="text-sm text-zinc-600">{t("notifications.emptyDescription")}</p>
    </div>
  )
}

async function fetchBatch(endpoint, ids) {
  if (ids.length === 0) return []
  const params = new URLSearchParams()
  ids.forEach((id) => params.append("ids", id))
  const res = await fetch(`${endpoint}?${params}`)
  return res.json()
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refetch: refetchUnreadCount } = useNotifications()
  const [notifications, setNotifications] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [systemNotification, setSystemNotification] = useState(null)

  usePageMeta({ title: `${t("notifications.title")} - uloggd` })

  const fetchNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const r = await fetch("/api/notifications/@me/list", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await r.json()

      const userIds = new Set()
      const listIds = new Set()
      const tierlistIds = new Set()
      const reviewIds = new Set()
      const commentIds = new Set()

      data.forEach((n) => {
        const getUserId = NOTIFICATION_USER_ID_MAP[n.type]
        if (getUserId) {
          const userId = getUserId(n.data)
          if (userId) userIds.add(userId)
        }
        if (n.data.profile_user_id) userIds.add(n.data.profile_user_id)
        if (n.data.list_id) listIds.add(n.data.list_id)
        if (n.data.tierlist_id) tierlistIds.add(n.data.tierlist_id)
        if (n.data.review_id) reviewIds.add(n.data.review_id)
        if (n.data.comment_id) commentIds.add(n.data.comment_id)
        
        if (n.type === "comment_reply") {
          const { target_type, target_id } = n.data
          if (target_type === "profile") userIds.add(target_id)
          if (target_type === "list") listIds.add(target_id)
          if (target_type === "tierlist") tierlistIds.add(target_id)
          if (target_type === "review") reviewIds.add(target_id)
        }
      })

      const [usersData, listsData, tierlistsData, reviewsData, commentsData] = await Promise.all([
        userIds.size > 0
          ? fetch(`/api/users/batch?${[...userIds].map(id => `userIds=${id}`).join("&")}`).then(r => r.json())
          : [],
        fetchBatch("/api/lists/batch", [...listIds]),
        fetchBatch("/api/tierlists/batch", [...tierlistIds]),
        fetchBatch("/api/reviews/batch", [...reviewIds]),
        fetchBatch("/api/comments/batch", [...commentIds]),
      ])

      const usersMap = {}
      usersData.forEach((u) => { usersMap[u.user_id] = u })

      const listsMap = {}
      listsData.forEach((l) => { listsMap[l.id] = l })

      const tierlistsMap = {}
      tierlistsData.forEach((tl) => { tierlistsMap[tl.id] = tl })

      const reviewsMap = {}
      reviewsData.forEach((r) => { reviewsMap[r.id] = r })

      const commentsMap = {}
      commentsData.forEach((c) => { commentsMap[c.id] = c })

      const enrichedData = data.map((n) => {
        const enriched = { ...n, data: { ...n.data } }

        if (n.data.list_id && listsMap[n.data.list_id]) {
          enriched.data.list_title = listsMap[n.data.list_id].title
        }
        if (n.data.tierlist_id && tierlistsMap[n.data.tierlist_id]) {
          enriched.data.tierlist_title = tierlistsMap[n.data.tierlist_id].title
        }
        if (n.data.review_id && reviewsMap[n.data.review_id]) {
          enriched.data.game_slug = reviewsMap[n.data.review_id].game_slug
          enriched.data.game_name = reviewsMap[n.data.review_id].game_name
        }
        if (n.data.profile_user_id && usersMap[n.data.profile_user_id]) {
          enriched.data.profile_username = usersMap[n.data.profile_user_id].username
        }
        if (n.data.comment_id && commentsMap[n.data.comment_id]) {
          enriched.data.content = commentsMap[n.data.comment_id].content
        }
        if (n.type === "comment_reply") {
          if (n.data.target_type === "list" && listsMap[n.data.target_id]) {
            enriched.data.list_title = listsMap[n.data.target_id].title
          }
          if (n.data.target_type === "tierlist" && tierlistsMap[n.data.target_id]) {
            enriched.data.tierlist_title = tierlistsMap[n.data.target_id].title
          }
          if (n.data.target_type === "review" && reviewsMap[n.data.target_id]) {
            enriched.data.game_name = reviewsMap[n.data.target_id].game_name
          }
        }

        return enriched
      })

      setNotifications(enrichedData || [])
      setUsers(usersMap)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

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
        setNotifications((prev) =>
          notificationId
            ? prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
            : prev.map((n) => ({ ...n, read: true }))
        )
      } else if (action === "delete") {
        setNotifications((prev) =>
          notificationId ? prev.filter((n) => n.id !== notificationId) : []
        )
      }

      refetchUnreadCount()
    } catch {}
  }

  if (loading) return <NotificationsPageSkeleton />

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <>
      <div className="py-6 sm:py-10 max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{t("notifications.title")}</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 rounded-full">
                {unreadCount} {t("notifications.new")}
              </span>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => handleAction("read")}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("notifications.markAllAsRead")}</span>
                </button>
              )}
              <button
                onClick={() => handleAction("delete")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t("notifications.clearAll")}</span>
              </button>
            </div>
          )}
        </div>

        {notifications.length > 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                users={users}
                onAction={handleAction}
                onSystemClick={setSystemNotification}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl">
            <NotificationsEmpty />
          </div>
        )}
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
