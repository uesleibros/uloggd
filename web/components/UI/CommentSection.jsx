import { useState, useEffect, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import { MessageSquare, MoreHorizontal, Pencil, Trash2, MessageCircle, ArrowUp, X, Check, Reply, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { supabase } from "#lib/supabase"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"

const LIMIT = 10
const MAX_VISUAL_DEPTH = 2

function CommentSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-2.5 py-2">
          <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="h-2.5 w-12 bg-zinc-800/40 rounded animate-pulse" />
            </div>
            <div className="h-3 w-full bg-zinc-800/50 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-zinc-800/30 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CommentInput({ onSubmit, placeholder, autoFocus = false, parentId = null, replyingTo = null, onCancel = null, compact = false }) {
  const { t } = useTranslation("common")
  const { user } = useAuth()
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  function adjustHeight() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const max = compact ? 100 : 160
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
    const success = await onSubmit(content.trim(), parentId)
    if (success) {
      setContent("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.overflowY = "hidden"
      }
      if (onCancel) onCancel()
    }
    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 640) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape" && onCancel) {
      onCancel()
    }
  }

  if (!user) {
    if (compact) return null
    return (
      <div className="flex items-center justify-center py-4 px-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <p className="text-sm text-zinc-500">{t("comments.loginRequired")}</p>
      </div>
    )
  }

  const hasContent = content.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className={`flex items-start gap-2 ${compact ? "mt-2" : "gap-2.5"}`}>
      {!compact && (
        <Link to={`/u/${user.username}`} className="flex-shrink-0">
          <AvatarWithDecoration
            src={user.avatar}
            alt={user.username}
            decorationUrl={user.equipped?.avatar_decoration?.asset_url}
            size="sm"
          />
        </Link>
      )}

      <div className="flex-1 min-w-0">
        {replyingTo && (
          <div className="flex items-center gap-1.5 mb-1.5 text-xs text-zinc-500">
            <Reply className="w-3 h-3" />
            <span>{t("comments.replyingTo")}</span>
            <span className="text-indigo-400 font-medium">@{replyingTo}</span>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || (replyingTo ? t("comments.replyPlaceholder") : t("comments.placeholder"))}
          autoFocus={autoFocus}
          maxLength={2000}
          rows={1}
          className={`w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:bg-zinc-800 transition-all resize-none overflow-hidden ${
            compact ? "text-[13px] py-1.5 px-2.5" : ""
          }`}
        />
      </div>

      <div className={`flex items-center gap-1 ${compact ? "" : "pt-px"}`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`flex-shrink-0 rounded-lg flex items-center justify-center bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-700/60 transition-colors cursor-pointer ${
              compact ? "w-7 h-7" : "w-9 h-9"
            }`}
          >
            <X className={compact ? "w-3 h-3" : "w-4 h-4"} />
          </button>
        )}
        <button
          type="submit"
          disabled={!hasContent || sending}
          className={`flex-shrink-0 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default ${
            compact ? "w-7 h-7" : "w-9 h-9"
          } ${
            hasContent
              ? "bg-indigo-500 hover:bg-indigo-400 text-white"
              : "bg-zinc-800/80 text-zinc-600 border border-zinc-700/60"
          }`}
        >
          {sending ? (
            <div className={`border-2 border-white/30 border-t-white rounded-full animate-spin ${compact ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
          ) : (
            <ArrowUp className={compact ? "w-3 h-3" : "w-4 h-4"} />
          )}
        </button>
      </div>
    </form>
  )
}

function EditInput({ content, onSave, onCancel, saving }) {
  const { t } = useTranslation("common")
  const [editContent, setEditContent] = useState(content)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [])

  function adjustHeight() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const max = 160
    if (el.scrollHeight > max) {
      el.style.height = max + "px"
      el.style.overflowY = "auto"
    } else {
      el.style.height = el.scrollHeight + "px"
      el.style.overflowY = "hidden"
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 640) {
      e.preventDefault()
      if (editContent.trim()) onSave(editContent.trim())
    }
    if (e.key === "Escape") onCancel()
  }

  const hasContent = editContent.trim().length > 0
  const hasChanged = editContent.trim() !== content

  return (
    <div className="mt-1">
      <div className="flex items-start gap-1.5">
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => {
            setEditContent(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          maxLength={2000}
          rows={1}
          className="flex-1 min-w-0 px-3 py-2 bg-zinc-800 border border-indigo-500/30 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none overflow-hidden"
        />

        <div className="flex items-center gap-1">
          <button
            onClick={onCancel}
            disabled={saving}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-700/60 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => { if (hasContent) onSave(editContent.trim()) }}
            disabled={saving || !hasContent || !hasChanged}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default ${
              hasContent && hasChanged
                ? "bg-indigo-500 hover:bg-indigo-400 text-white"
                : "bg-zinc-800/80 text-zinc-600 border border-zinc-700/60"
            }`}
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-zinc-600 mt-1 hidden sm:block">
        esc {t("comments.toCancel")} · enter {t("comments.toSave")}
      </p>
    </div>
  )
}

function CommentItem({ comment, onEdit, onDelete, onReply, replies = [], depth = 0 }) {
  const { t } = useTranslation("common")
  const { user: currentUser } = useAuth()
  const { getTimeAgo } = useDateTime()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [showReplies, setShowReplies] = useState(true)
  const menuRef = useRef(null)

  const isOwner = currentUser?.user_id === comment.user_id
  const isMod = currentUser?.is_moderator
  const canManage = isOwner || isMod
  const canReply = !!currentUser && depth < 3
  const user = comment.user
  const wasEdited = comment.updated_at !== comment.created_at
  const hasReplies = replies.length > 0

  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH)
  const indentClass = visualDepth > 0 ? "ml-3 sm:ml-4 pl-3 border-l border-zinc-800" : ""

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

  async function handleSaveEdit(content) {
    setSaving(true)
    const success = await onEdit(comment.id, content)
    if (success) setEditing(false)
    setSaving(false)
  }

  async function handleReply(content, parentId) {
    const success = await onReply(content, parentId)
    if (success) setShowReplyInput(false)
    return success
  }

  return (
    <div className={indentClass}>
      <div className="group/comment flex gap-2 py-2 rounded-lg hover:bg-zinc-800/20 transition-colors -mx-1 px-1">
        <Link to={`/u/${user?.username}`} className="flex-shrink-0">
          <AvatarWithDecoration
            src={user?.avatar}
            alt={user?.username}
            decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
            size="xs"
          />
        </Link>

        <div className="flex-1 min-w-0 -mt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap text-[13px] leading-tight">
            <Link
              to={`/u/${user?.username}`}
              className="font-semibold text-white hover:underline underline-offset-2"
            >
              {user?.username}
            </Link>
            <UserBadges user={user} size="xs" clickable />

            {comment.parent_user && depth > 0 && (
              <span className="text-[11px] text-zinc-600 flex items-center gap-0.5">
                <Reply className="w-2.5 h-2.5" />
                <Link to={`/u/${comment.parent_user.username}`} className="text-zinc-500 hover:text-zinc-400 hover:underline">
                  @{comment.parent_user.username}
                </Link>
              </span>
            )}

            <span className="text-[11px] text-zinc-600">
              · {getTimeAgo(comment.created_at)}
              {wasEdited && <span className="italic"> ({t("comments.edited")})</span>}
            </span>

            {canManage && !editing && (
              <div ref={menuRef} className="relative ml-auto">
                <button
                  onClick={() => {
                    setMenuOpen(!menuOpen)
                    setConfirmDelete(false)
                  }}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 rounded transition-colors cursor-pointer opacity-0 group-hover/comment:opacity-100 max-sm:opacity-100"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-0.5 z-30 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/50 py-1 min-w-[140px]">
                    {isOwner && (
                      <button
                        onClick={() => {
                          setEditing(true)
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-zinc-500" />
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
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("comments.deleteConfirm")}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500/70" />
                        {t("comments.delete")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <EditInput
              content={comment.content}
              onSave={handleSaveEdit}
              onCancel={() => setEditing(false)}
              saving={saving}
            />
          ) : (
            <>
              <p className="text-[13px] text-zinc-300 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                {comment.content}
              </p>

              <div className="flex items-center gap-3 mt-1">
                {canReply && (
                  <button
                    onClick={() => setShowReplyInput(!showReplyInput)}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <Reply className="w-3 h-3" />
                    {t("comments.reply")}
                  </button>
                )}

                {hasReplies && (
                  <button
                    onClick={() => setShowReplies(!showReplies)}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showReplies ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        {t("comments.hideReplies")}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        {t("comments.showReplies", { count: replies.length })}
                      </>
                    )}
                  </button>
                )}
              </div>

              {showReplyInput && (
                <CommentInput
                  onSubmit={handleReply}
                  parentId={comment.id}
                  replyingTo={user?.username}
                  onCancel={() => setShowReplyInput(false)}
                  autoFocus
                  compact
                />
              )}
            </>
          )}
        </div>
      </div>

      {hasReplies && showReplies && (
        <div className="mt-0.5">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              replies={reply.replies || []}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentEmpty() {
  const { t } = useTranslation("common")

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <MessageCircle className="w-8 h-8 text-zinc-700" />
      <p className="text-sm text-zinc-500">{t("comments.empty")}</p>
      <p className="text-xs text-zinc-600">{t("comments.emptySubtitle")}</p>
    </div>
  )
}

function buildCommentTree(comments) {
  const map = {}
  const roots = []

  for (const c of comments) {
    map[c.id] = { ...c, replies: [] }
  }

  for (const c of comments) {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies.push(map[c.id])
    } else {
      roots.push(map[c.id])
    }
  }

  return roots
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

  async function handleCreate(content, parentId = null) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      const r = await fetch("/api/comments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ type, targetId, content, parentId })
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

      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId))
      setTotal(prev => prev - 1)
    } catch {}
  }

  function handleLoadMore() {
    if (loadingMore || page >= totalPages) return
    fetchComments(page + 1, true)
  }

  const commentTree = buildCommentTree(comments)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-semibold text-white">{t("comments.title")}</h3>
        {!loading && total > 0 && (
          <span className="text-xs text-zinc-500">({total})</span>
        )}
      </div>

      <CommentInput onSubmit={handleCreate} />

      {loading ? (
        <CommentSkeleton />
      ) : commentTree.length > 0 ? (
        <div className="space-y-0.5">
          {commentTree.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReply={handleCreate}
              replies={comment.replies}
            />
          ))}

          {page < totalPages && (
            <div className="pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
