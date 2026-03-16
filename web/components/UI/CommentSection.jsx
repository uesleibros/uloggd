import { useState, useEffect, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import { MessageSquare, MoreHorizontal, Pencil, Trash2, MessageCircle, ArrowUp } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { supabase } from "#lib/supabase"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"

const LIMIT = 10

function CommentSkeleton() {
  return (
    <div className="space-y-0.5">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3 px-2 py-3">
          <div className="w-9 h-9 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-14 bg-zinc-800/40 rounded animate-pulse" />
            </div>
            <div className="h-3.5 w-full bg-zinc-800/50 rounded animate-pulse" />
            <div className="h-3.5 w-2/3 bg-zinc-800/30 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CommentInput({ onSubmit, placeholder, autoFocus = false }) {
  const { t } = useTranslation("common")
  const { user } = useAuth()
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)

  function adjustHeight() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const max = 200
    if (el.scrollHeight > max) {
      el.style.height = max + "px"
      el.style.overflowY = "auto"
    } else {
      el.style.height = el.scrollHeight + "px"
      el.style.overflowY = "hidden"
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!content.trim() || sending) return

    setSending(true)
    const success = await onSubmit(content.trim())
    if (success) {
      setContent("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.overflowY = "hidden"
      }
    }
    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 640) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-4 px-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <p className="text-sm text-zinc-500">{t("comments.loginRequired")}</p>
      </div>
    )
  }

  const hasContent = content.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3">
      <Link to={`/u/${user.username}`} className="flex-shrink-0 pt-1">
        <AvatarWithDecoration
          src={user.avatar}
          alt={user.username}
          decorationUrl={user.equipped?.avatar_decoration?.asset_url}
          size="sm"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("comments.placeholder")}
          autoFocus={autoFocus}
          maxLength={2000}
          rows={1}
          className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:bg-zinc-800 transition-all resize-none overflow-hidden"
        />
      </div>

      <button
        type="submit"
        disabled={!hasContent || sending}
        className={`flex-shrink-0 w-[38px] h-[38px] mt-[1px] rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default ${
          hasContent
            ? "bg-indigo-500 hover:bg-indigo-400 text-white"
            : "bg-zinc-800/80 text-zinc-600 border border-zinc-700/60"
        }`}
      >
        {sending ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <ArrowUp className="w-4 h-4" />
        )}
      </button>
    </form>
  )
}

function CommentItem({ comment, onEdit, onDelete }) {
  const { t } = useTranslation("common")
  const { user: currentUser } = useAuth()
  const { getTimeAgo } = useDateTime()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef(null)
  const editRef = useRef(null)

  const isOwner = currentUser?.user_id === comment.user_id
  const isMod = currentUser?.is_moderator
  const canManage = isOwner || isMod
  const user = comment.user
  const wasEdited = comment.updated_at !== comment.created_at

  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.style.height = "auto"
      editRef.current.style.height = editRef.current.scrollHeight + "px"
    }
  }, [editing])

  async function handleSaveEdit() {
    if (!editContent.trim() || saving) return
    setSaving(true)
    const success = await onEdit(comment.id, editContent.trim())
    if (success) setEditing(false)
    setSaving(false)
  }

  function handleEditKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
    if (e.key === "Escape") {
      setEditing(false)
      setEditContent(comment.content)
    }
  }

  return (
    <div className="group/comment flex gap-3 px-2 py-2.5 -mx-2 rounded-lg hover:bg-zinc-800/30 transition-colors">
      <Link to={`/u/${user?.username}`} className="flex-shrink-0 pt-0.5">
        <AvatarWithDecoration
          src={user?.avatar}
          alt={user?.username}
          decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
          size="sm"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <Link
            to={`/u/${user?.username}`}
            className="text-sm font-semibold text-white hover:underline underline-offset-2 truncate max-w-[140px] sm:max-w-none"
          >
            {user?.username}
          </Link>
          <UserBadges user={user} size="sm" clickable />
          <span className="text-[11px] text-zinc-600 whitespace-nowrap flex-shrink-0">
            {getTimeAgo(comment.created_at)}
            {wasEdited && <span className="italic"> ({t("comments.edited")})</span>}
          </span>
        </div>

        {editing ? (
          <div className="mt-2">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = e.target.scrollHeight + "px"
              }}
              onKeyDown={handleEditKeyDown}
              maxLength={2000}
              rows={1}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
            />
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] text-zinc-500">
                escape{" "}
                <span className="text-zinc-600">{t("comments.toCancel")}</span>
                {" · "}
                enter{" "}
                <span className="text-zinc-600">{t("comments.toSave")}</span>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[13px] sm:text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
            {comment.content}
          </p>
        )}
      </div>

      {canManage && !editing && (
        <div ref={menuRef} className="relative flex-shrink-0 pt-0.5">
          <button
            onClick={() => {
              setMenuOpen(!menuOpen)
              setConfirmDelete(false)
            }}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded-md hover:bg-zinc-700/50 transition-colors cursor-pointer opacity-0 group-hover/comment:opacity-100 max-sm:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/50 py-1.5 min-w-[160px]">
              {isOwner && (
                <button
                  onClick={() => {
                    setEditing(true)
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-zinc-500" />
                  {t("comments.edit")}
                </button>
              )}

              {confirmDelete ? (
                <button
                  onClick={() => {
                    onDelete(comment.id)
                    setMenuOpen(false)
                    setConfirmDelete(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("comments.deleteConfirm")}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-500/70" />
                  {t("comments.delete")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CommentEmpty() {
  const { t } = useTranslation("common")

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-12 gap-2">
      <MessageCircle className="w-8 h-8 text-zinc-700" />
      <p className="text-sm text-zinc-500">{t("comments.empty")}</p>
      <p className="text-xs text-zinc-600">{t("comments.emptySubtitle")}</p>
    </div>
  )
}

export default function CommentSection({ type, targetId }) {
  const { t } = useTranslation("common")
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchComments = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({
        type,
        targetId: String(targetId),
        page: String(pageNum),
        limit: String(LIMIT)
      })

      const r = await fetch(`/api/comments/list?${params}`)
      const data = await r.json()

      if (append) {
        setComments(prev => [...prev, ...(data.comments || [])])
      } else {
        setComments(data.comments || [])
      }

      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setPage(pageNum)
    } catch {
      if (!append) setComments([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [type, targetId])

  useEffect(() => {
    if (!targetId) return
    fetchComments(1)
  }, [type, targetId, fetchComments])

  async function handleCreate(content) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      const r = await fetch("/api/comments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ type, targetId, content })
      })

      if (!r.ok) return false

      fetchComments(1)
      return true
    } catch {
      return false
    }
  }

  async function handleEdit(commentId, content) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      const r = await fetch("/api/comments/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ commentId, content })
      })

      if (!r.ok) return false

      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? { ...c, content, updated_at: new Date().toISOString() }
            : c
        )
      )

      return true
    } catch {
      return false
    }
  }

  async function handleDelete(commentId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const r = await fetch("/api/comments/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ commentId })
      })

      if (!r.ok) return

      setComments(prev => prev.filter(c => c.id !== commentId))
      setTotal(prev => prev - 1)
    } catch {}
  }

  function handleLoadMore() {
    if (loadingMore || page >= totalPages) return
    fetchComments(page + 1, true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
        <h3 className="text-sm sm:text-base font-semibold text-white">{t("comments.title")}</h3>
        {!loading && total > 0 && (
          <span className="text-xs sm:text-sm text-zinc-500">({total})</span>
        )}
      </div>

      <CommentInput onSubmit={handleCreate} />

      {loading ? (
        <CommentSkeleton />
      ) : comments.length > 0 ? (
        <div className="space-y-0.5">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {page < totalPages && (
            <div className="pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-2 text-xs sm:text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? (
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  t("comments.loadMore")
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <CommentEmpty />
      )}
    </div>
  )
}
