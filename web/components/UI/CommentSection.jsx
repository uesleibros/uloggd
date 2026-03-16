import { useState, useEffect, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import { MessageSquare, MoreHorizontal, Pencil, Trash2, X, MessageCircle } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { supabase } from "#lib/supabase"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"

const LIMIT = 10

function CommentSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-full bg-zinc-800/60 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-zinc-800/40 rounded animate-pulse" />
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
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() || sending) return

    setSending(true)
    const success = await onSubmit(content.trim())
    if (success) {
      setContent("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-4 px-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <p className="text-sm text-zinc-500">{t("comments.loginRequired")}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Link to={`/u/${user.username}`} className="flex-shrink-0 mt-0.5">
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
          className="w-full px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
        />

        {content.trim() && (
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              {sending ? t("comments.sending") : t("comments.submit")}
            </button>
          </div>
        )}
      </div>
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
    <div className="group/comment flex gap-3">
      <Link to={`/u/${user?.username}`} className="flex-shrink-0 mt-0.5">
        <AvatarWithDecoration
          src={user?.avatar}
          alt={user?.username}
          decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
          size="sm"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/u/${user?.username}`}
            className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
          >
            {user?.username}
          </Link>
          <UserBadges user={user} size="sm" clickable />
          <span className="text-xs text-zinc-600">{getTimeAgo(comment.created_at)}</span>
          {wasEdited && (
            <span className="text-xs text-zinc-600 italic">({t("comments.edited")})</span>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5">
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
              className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editContent.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {saving ? t("comments.saving") : t("comments.save")}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setEditContent(comment.content)
                }}
                className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {t("comments.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap break-words leading-relaxed">
            {comment.content}
          </p>
        )}
      </div>

      {canManage && !editing && (
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => {
              setMenuOpen(!menuOpen)
              setConfirmDelete(false)
            }}
            className="p-1 text-zinc-600 hover:text-zinc-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer opacity-0 group-hover/comment:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px]">
              {isOwner && (
                <button
                  onClick={() => {
                    setEditing(true)
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("comments.deleteConfirm")}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="w-12 h-12 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center">
        <MessageCircle className="w-5 h-5 text-zinc-600" />
      </div>
      <div className="text-center">
        <p className="text-sm text-zinc-500">{t("comments.empty")}</p>
        <p className="text-xs text-zinc-600 mt-0.5">{t("comments.emptySubtitle")}</p>
      </div>
    </div>
  )
}

export default function CommentSection({ type, targetId }) {
  const { t } = useTranslation("common")
  const { user: currentUser } = useAuth()
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
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-zinc-400" />
        <h3 className="text-base font-semibold text-white">{t("comments.title")}</h3>
        {!loading && total > 0 && (
          <span className="text-sm text-zinc-500">({total})</span>
        )}
      </div>

      <CommentInput onSubmit={handleCreate} />

      {loading ? (
        <CommentSkeleton />
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {page < totalPages && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-700/50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? (
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                t("comments.loadMore")
              )}
            </button>
          )}
        </div>
      ) : (
        <CommentEmpty />
      )}
    </div>
  )
}