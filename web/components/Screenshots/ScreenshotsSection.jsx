import { useState, useEffect, useCallback, useRef } from "react"
import {
  Camera, Plus, Trash2, EyeOff, Eye, Pencil, X, Loader2,
  Gamepad2, AlertTriangle, ChevronLeft, ChevronRight
} from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import Pagination from "@components/UI/Pagination"
import LikeButton from "@components/UI/LikeButton"
import CommentSection from "@components/UI/CommentSection"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"

const ITEMS_PER_PAGE = 24
const MAX_FILE_SIZE = 10 * 1024 * 1024

function ScreenshotSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="aspect-video bg-zinc-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function UploadModal({ isOpen, onClose, onUpload, uploading }) {
  const { t } = useTranslation("screenshots")
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState("")
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [gameQuery, setGameQuery] = useState("")
  const [gameResults, setGameResults] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setPreview(null)
      setCaption("")
      setIsSpoiler(false)
      setGameQuery("")
      setGameResults([])
      setSelectedGame(null)
      setError(null)
    }
  }, [isOpen])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    if (!gameQuery.trim()) { setGameResults([]); return }

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/igdb/autocomplete?query=${encodeURIComponent(gameQuery.trim())}`)
        const data = await res.json()
        setGameResults(Array.isArray(data) ? data.slice(0, 5) : [])
      } catch { setGameResults([]) }
    }, 300)

    return () => clearTimeout(searchTimeout.current)
  }, [gameQuery])

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_FILE_SIZE) { setError(t("upload.fileTooLarge")); return }
    if (!f.type.startsWith("image/")) { setError(t("upload.invalidType")); return }
    setError(null)
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  async function handleSubmit() {
    if (!file || uploading) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      await onUpload({
        image: ev.target.result,
        gameId: selectedGame?.id || null,
        gameSlug: selectedGame?.slug || null,
        caption: caption.trim() || null,
        isSpoiler,
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <Modal isOpen={isOpen} onClose={() => !uploading && onClose()} maxWidth="max-w-md" fullscreenMobile showMobileGrip closeOnOverlay={!uploading}>
      <div className="p-5 space-y-4">
        <h3 className="text-base font-semibold text-white">{t("upload.title")}</h3>

        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-video bg-zinc-800/50 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer"
          >
            <Camera className="w-8 h-8 text-zinc-600" />
            <span className="text-sm text-zinc-500">{t("upload.selectImage")}</span>
          </button>
        ) : (
          <div className="relative">
            <img src={preview} alt="" className="w-full rounded-xl object-cover max-h-64" />
            <button
              onClick={() => { setFile(null); setPreview(null) }}
              className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-lg text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("upload.game")}</label>
          {selectedGame ? (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl">
              {selectedGame.cover?.url && (
                <img src={`https:${selectedGame.cover.url}`} alt="" className="w-6 h-8 rounded object-cover flex-shrink-0" />
              )}
              <span className="text-sm text-white truncate flex-1">{selectedGame.name}</span>
              <button onClick={() => setSelectedGame(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={gameQuery}
                onChange={(e) => setGameQuery(e.target.value)}
                placeholder={t("upload.searchGame")}
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              {gameResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-20 overflow-hidden">
                  {gameResults.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGame(g); setGameQuery(""); setGameResults([]) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                    >
                      {g.cover?.url && <img src={`https:${g.cover.url}`} alt="" className="w-5 h-7 rounded object-cover flex-shrink-0" />}
                      <span className="text-sm text-zinc-300 truncate">{g.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("upload.caption")}</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t("upload.captionPlaceholder")}
            maxLength={200}
            className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-0 cursor-pointer" />
          <span className="text-sm text-zinc-400">{t("upload.spoiler")}</span>
        </label>

        <div className="flex gap-2.5 pt-2">
          <button onClick={onClose} disabled={uploading} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50">
            {t("upload.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploading ? t("upload.uploading") : t("upload.submit")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ScreenshotDetailModal({ screenshot, screenshots, owner, isOpen, onClose, onNavigate, isOwner, onEdit, onDelete }) {
  const { t } = useTranslation("screenshots")
  const { user } = useAuth()
  const { getTimeAgo } = useDateTime()
  const [revealed, setRevealed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setRevealed(false)
    setConfirmDelete(false)
  }, [screenshot])

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e) {
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "ArrowRight") handleNext()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, screenshot, screenshots])

  if (!screenshot) return null

  const currentIndex = screenshots.findIndex(s => s.id === screenshot.id)
  const isSpoilerHidden = screenshot.is_spoiler && !revealed

  function handlePrev() {
    if (currentIndex > 0) onNavigate(screenshots[currentIndex - 1])
  }

  function handleNext() {
    if (currentIndex < screenshots.length - 1) onNavigate(screenshots[currentIndex + 1])
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl" showCloseButton={false} fullscreenMobile>
      <div className="flex flex-col md:flex-row h-full md:max-h-[85vh]">
        <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
          {isSpoilerHidden ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={screenshot.image_url} alt="" className="max-w-full max-h-[50vh] md:max-h-full object-contain blur-2xl opacity-30" />
              <button
                onClick={() => setRevealed(true)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <EyeOff className="w-8 h-8 text-zinc-400" />
                <span className="text-sm text-zinc-400">{t("lightbox.revealSpoiler")}</span>
              </button>
            </div>
          ) : (
            <img src={screenshot.image_url} alt="" className="max-w-full max-h-[50vh] md:max-h-full object-contain" />
          )}

          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {currentIndex < screenshots.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full cursor-pointer transition-colors md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full md:w-[340px] flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900">
          <div className="p-4 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {owner && (
                  <Link to={`/u/${owner.username}`} onClick={onClose} className="flex-shrink-0">
                    <AvatarWithDecoration
                      src={owner.avatar}
                      alt={owner.username}
                      decorationUrl={owner.equipped?.avatar_decoration?.asset_url}
                      size="sm"
                    />
                  </Link>
                )}
                <div className="min-w-0">
                  {owner && (
                    <Link to={`/u/${owner.username}`} onClick={onClose} className="text-sm font-semibold text-white hover:underline underline-offset-2 truncate block">
                      {owner.username}
                    </Link>
                  )}
                  <span className="text-[11px] text-zinc-500">{getTimeAgo(screenshot.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isOwner && (
                  <>
                    <button onClick={() => { onEdit(screenshot); onClose() }} className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {confirmDelete ? (
                      <button onClick={() => { onDelete(screenshot.id); onClose() }} className="px-2 py-1 text-[11px] text-red-400 bg-red-500/10 rounded-lg cursor-pointer">
                        {t("lightbox.confirmDelete")}
                      </button>
                    ) : (
                      <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
                <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer hidden md:block">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {screenshot.caption && (
              <p className="text-sm text-zinc-300 mt-2">{screenshot.caption}</p>
            )}

            {screenshot.game_slug && (
              <Link
                to={`/game/${screenshot.game_slug}`}
                onClick={onClose}
                className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
              >
                <Gamepad2 className="w-3 h-3" />
                {screenshot.game_name || screenshot.game_slug}
              </Link>
            )}
          </div>

          <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
            <LikeButton type="screenshot" targetId={screenshot.id} currentUserId={user?.user_id} />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
            <CommentSection type="screenshot" targetId={String(screenshot.id)} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditScreenshotModal({ screenshot, isOpen, onClose, onSave, saving }) {
  const { t } = useTranslation("screenshots")
  const [caption, setCaption] = useState("")
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [gameQuery, setGameQuery] = useState("")
  const [gameResults, setGameResults] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    if (isOpen && screenshot) {
      setCaption(screenshot.caption || "")
      setIsSpoiler(screenshot.is_spoiler || false)
      setSelectedGame(screenshot.game_slug ? { slug: screenshot.game_slug, id: screenshot.game_id, name: screenshot.game_name } : null)
    }
  }, [isOpen, screenshot])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    if (!gameQuery.trim()) { setGameResults([]); return }

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/igdb/autocomplete?query=${encodeURIComponent(gameQuery.trim())}`)
        const data = await res.json()
        setGameResults(Array.isArray(data) ? data.slice(0, 5) : [])
      } catch { setGameResults([]) }
    }, 300)

    return () => clearTimeout(searchTimeout.current)
  }, [gameQuery])

  if (!screenshot) return null

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5 space-y-4">
        <h3 className="text-base font-semibold text-white">{t("edit.title")}</h3>
        <img src={screenshot.image_url} alt="" className="w-full rounded-xl object-cover max-h-40" />

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("upload.game")}</label>
          {selectedGame ? (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl">
              <span className="text-sm text-white truncate flex-1">{selectedGame.name || selectedGame.slug}</span>
              <button onClick={() => setSelectedGame(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={gameQuery}
                onChange={(e) => setGameQuery(e.target.value)}
                placeholder={t("upload.searchGame")}
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              {gameResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-20 overflow-hidden">
                  {gameResults.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGame(g); setGameQuery(""); setGameResults([]) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                    >
                      <span className="text-sm text-zinc-300 truncate">{g.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("upload.caption")}</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t("upload.captionPlaceholder")}
            maxLength={200}
            className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-0 cursor-pointer" />
          <span className="text-sm text-zinc-400">{t("upload.spoiler")}</span>
        </label>

        <div className="flex gap-2.5">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50">
            {t("upload.cancel")}
          </button>
          <button
            onClick={() => onSave({ screenshotId: screenshot.id, caption: caption.trim() || null, gameId: selectedGame?.id || null, gameSlug: selectedGame?.slug || null, isSpoiler })}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("edit.save")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function ScreenshotsSection({ userId, isOwnProfile, owner }) {
  const { t } = useTranslation("screenshots")
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editingScreenshot, setEditingScreenshot] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchScreenshots = useCallback(async (pageNum = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ userId, page: pageNum, limit: ITEMS_PER_PAGE })
      const r = await fetch(`/api/screenshots/list?${params}`)
      const data = await r.json()
      setScreenshots(data.screenshots || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setPage(pageNum)
    } catch { setScreenshots([]) }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetchScreenshots(1)
  }, [userId, fetchScreenshots])

  async function handleUpload(data) {
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const r = await fetch("/api/screenshots/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(data),
      })
      if (r.ok) { setUploadOpen(false); fetchScreenshots(1) }
    } catch {}
    finally { setUploading(false) }
  }

  async function handleUpdate(data) {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const r = await fetch("/api/screenshots/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(data),
      })
      if (r.ok) {
        const updated = await r.json()
        setScreenshots(prev => prev.map(s => s.id === updated.id ? updated : s))
        setEditingScreenshot(null)
      }
    } catch {}
    finally { setSaving(false) }
  }

  async function handleDelete(screenshotId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const r = await fetch("/api/screenshots/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ screenshotId }),
      })
      if (r.ok) {
        setScreenshots(prev => prev.filter(s => s.id !== screenshotId))
        setTotal(prev => prev - 1)
      }
    } catch {}
  }

  if (loading) return <ScreenshotSkeleton />
  if (!isOwnProfile && screenshots.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
          <h2 className="text-sm sm:text-base font-semibold text-white">{t("title")}</h2>
          {total > 0 && <span className="text-xs sm:text-sm text-zinc-500">({total})</span>}
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("add")}
          </button>
        )}
      </div>

      {screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Camera className="w-8 h-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">{t("empty")}</p>
          {isOwnProfile && (
            <button onClick={() => setUploadOpen(true)} className="text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer">
              {t("addFirst")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {screenshots.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="group relative aspect-video rounded-lg overflow-hidden bg-zinc-800 cursor-pointer"
              >
                <img
                  src={s.image_url}
                  alt={s.caption || ""}
                  loading="lazy"
                  className={`w-full h-full object-cover group-hover:brightness-75 transition-all ${s.is_spoiler ? "blur-lg" : ""}`}
                />
                {s.is_spoiler && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-zinc-400" />
                  </div>
                )}
                {s.caption && !s.is_spoiler && (
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white/80 truncate">{s.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => fetchScreenshots(p)} />
          )}
        </>
      )}

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onUpload={handleUpload} uploading={uploading} />

      <ScreenshotDetailModal
        screenshot={selected}
        screenshots={screenshots}
        owner={owner}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onNavigate={setSelected}
        isOwner={isOwnProfile}
        onEdit={(s) => { setSelected(null); setEditingScreenshot(s) }}
        onDelete={handleDelete}
      />

      <EditScreenshotModal
        screenshot={editingScreenshot}
        isOpen={!!editingScreenshot}
        onClose={() => setEditingScreenshot(null)}
        onSave={handleUpdate}
        saving={saving}
      />
    </div>
  )
}