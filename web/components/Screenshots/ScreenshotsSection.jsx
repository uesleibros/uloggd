import { useState, useEffect, useCallback, useRef } from "react"
import {
  Camera, Plus, Trash2, EyeOff, Eye, Pencil, X, Loader2,
  Gamepad2, AlertTriangle, ChevronLeft, ChevronRight, Heart, MessageCircle,
  MoreHorizontal, Bookmark, Send
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
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="aspect-square bg-zinc-800/50 animate-pulse" />
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
  const [step, setStep] = useState(1)
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
      setStep(1)
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
    reader.onload = (ev) => {
      setPreview(ev.target.result)
      setStep(2)
    }
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
    <Modal 
      isOpen={isOpen} 
      onClose={() => !uploading && onClose()} 
      maxWidth="max-w-lg" 
      fullscreenMobile 
      showCloseButton={false}
      closeOnOverlay={!uploading}
      noScroll
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button 
          onClick={() => step === 1 ? onClose() : setStep(1)} 
          disabled={uploading}
          className="text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          {step === 1 ? t("upload.cancel") : <ChevronLeft className="w-5 h-5" />}
        </button>
        <h3 className="text-sm font-semibold text-white">
          {step === 1 ? t("upload.title") : t("upload.details")}
        </h3>
        {step === 2 ? (
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {uploading ? t("upload.uploading") : t("upload.share")}
          </button>
        ) : (
          <div className="w-14" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {step === 1 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <div className="w-20 h-20 rounded-full bg-zinc-800/50 border-2 border-zinc-700 flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-zinc-500" />
            </div>
            <h4 className="text-lg font-medium text-white mb-1">{t("upload.dragPhotos")}</h4>
            <p className="text-sm text-zinc-500 mb-6">{t("upload.dragPhotosDesc")}</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              {t("upload.selectFromComputer")}
            </button>
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5 mt-4">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            <div className="md:flex-1 bg-black flex items-center justify-center min-h-[250px] md:min-h-[400px]">
              <img 
                src={preview} 
                alt="" 
                className="max-w-full max-h-[300px] md:max-h-[400px] object-contain" 
              />
            </div>

            <div className="md:w-[280px] p-4 space-y-4 border-t md:border-t-0 md:border-l border-zinc-800">
              <div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={t("upload.captionPlaceholder")}
                  maxLength={200}
                  rows={3}
                  className="w-full px-0 py-0 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none"
                />
                <div className="text-right">
                  <span className="text-[10px] text-zinc-600">{caption.length}/200</span>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <label className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                  <Gamepad2 className="w-4 h-4" />
                  {t("upload.game")}
                </label>
                {selectedGame ? (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-800/50 rounded-lg">
                    {selectedGame.cover?.url && (
                      <img 
                        src={`https:${selectedGame.cover.url}`} 
                        alt="" 
                        className="w-8 h-10 rounded object-cover flex-shrink-0" 
                      />
                    )}
                    <span className="text-sm text-white truncate flex-1">{selectedGame.name}</span>
                    <button 
                      onClick={() => setSelectedGame(null)} 
                      className="text-zinc-500 hover:text-white cursor-pointer p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={gameQuery}
                      onChange={(e) => setGameQuery(e.target.value)}
                      placeholder={t("upload.searchGame")}
                      className="w-full px-3 py-2.5 bg-zinc-800/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    />
                    {gameResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                        {gameResults.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => { setSelectedGame(g); setGameQuery(""); setGameResults([]) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                          >
                            {g.cover?.url && (
                              <img 
                                src={`https:${g.cover.url}`} 
                                alt="" 
                                className="w-6 h-8 rounded object-cover flex-shrink-0" 
                              />
                            )}
                            <span className="text-sm text-zinc-300 truncate">{g.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400">{t("upload.spoiler")}</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={isSpoiler} 
                      onChange={(e) => setIsSpoiler(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-zinc-700 rounded-full peer-checked:bg-indigo-500 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </Modal>
  )
}

function ScreenshotDetailModal({ screenshot, screenshots, owner, isOpen, onClose, onNavigate, isOwner, onEdit, onDelete }) {
  const { t } = useTranslation("screenshots")
  const { user } = useAuth()
  const { getTimeAgo } = useDateTime()
  const [revealed, setRevealed] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const menuRef = useRef(null)

  const minSwipeDistance = 50

  useEffect(() => {
    setRevealed(false)
    setShowMenu(false)
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

  useEffect(() => {
    if (!showMenu) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showMenu])

  if (!screenshot) return null

  const currentIndex = screenshots.findIndex(s => s.id === screenshot.id)
  const isSpoilerHidden = screenshot.is_spoiler && !revealed
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < screenshots.length - 1

  function handlePrev() {
    if (hasPrev) onNavigate(screenshots[currentIndex - 1])
  }

  function handleNext() {
    if (hasNext) onNavigate(screenshots[currentIndex + 1])
  }

  function onTouchStart(e) {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  function onTouchMove(e) {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  function onTouchEnd() {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe && hasNext) handleNext()
    if (isRightSwipe && hasPrev) handlePrev()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      maxWidth="max-w-5xl" 
      showCloseButton={false} 
      fullscreenMobile
      noScroll
      className="!rounded-none md:!rounded-xl overflow-hidden"
    >
      <div className="flex flex-col md:flex-row h-full md:h-[85vh] bg-black md:bg-zinc-900">
        <div 
          className="relative flex-1 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {isSpoilerHidden ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={screenshot.image_url} 
                alt="" 
                className="max-w-full max-h-full object-contain blur-3xl opacity-20 scale-110" 
              />
              <button
                onClick={() => setRevealed(true)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full bg-zinc-800/80 backdrop-blur flex items-center justify-center group-hover:bg-zinc-700/80 transition-colors">
                  <EyeOff className="w-7 h-7 text-zinc-400" />
                </div>
                <span className="text-sm font-medium text-zinc-400">{t("lightbox.revealSpoiler")}</span>
              </button>
            </div>
          ) : (
            <img 
              src={screenshot.image_url} 
              alt={screenshot.caption || ""} 
              className="max-w-full max-h-full object-contain" 
            />
          )}

          {hasPrev && (
            <button
              onClick={handlePrev}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full items-center justify-center cursor-pointer transition-all hover:scale-105"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={handleNext}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full items-center justify-center cursor-pointer transition-all hover:scale-105"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {screenshots.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {screenshots.slice(
                Math.max(0, currentIndex - 2),
                Math.min(screenshots.length, currentIndex + 3)
              ).map((s, i) => {
                const actualIndex = Math.max(0, currentIndex - 2) + i
                return (
                  <div
                    key={s.id}
                    className={`rounded-full transition-all ${
                      actualIndex === currentIndex 
                        ? "w-1.5 h-1.5 bg-white" 
                        : "w-1 h-1 bg-white/50"
                    }`}
                  />
                )
              })}
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full cursor-pointer md:hidden"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="hidden md:block absolute top-4 right-4 p-2 text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="w-full md:w-[380px] flex flex-col bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800">
          <div className="flex items-center justify-between p-3.5 border-b border-zinc-800">
            <div className="flex items-center gap-3">
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
              <div>
                {owner && (
                  <Link 
                    to={`/u/${owner.username}`} 
                    onClick={onClose} 
                    className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
                  >
                    {owner.username}
                  </Link>
                )}
                {screenshot.game_slug && (
                  <Link
                    to={`/game/${screenshot.game_slug}`}
                    onClick={onClose}
                    className="block text-xs text-zinc-500 hover:text-zinc-400 transition-colors truncate max-w-[180px]"
                  >
                    {screenshot.game_name || screenshot.game_slug}
                  </Link>
                )}
              </div>
            </div>

            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-30 overflow-hidden">
                  {isOwner && (
                    <>
                      <button 
                        onClick={() => { onEdit(screenshot); onClose(); setShowMenu(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                        {t("lightbox.edit")}
                      </button>
                      {confirmDelete ? (
                        <button 
                          onClick={() => { onDelete(screenshot.id); onClose(); setShowMenu(false) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t("lightbox.confirmDelete")}
                        </button>
                      ) : (
                        <button 
                          onClick={() => setConfirmDelete(true)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t("lightbox.delete")}
                        </button>
                      )}
                    </>
                  )}
                  <button 
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer border-t border-zinc-700"
                  >
                    {t("lightbox.cancel")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {screenshot.caption && (
              <div className="flex gap-3 p-3.5 border-b border-zinc-800">
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">
                    <Link 
                      to={`/u/${owner?.username}`} 
                      onClick={onClose}
                      className="font-semibold text-white hover:text-zinc-300 mr-1.5"
                    >
                      {owner?.username}
                    </Link>
                    {screenshot.caption}
                  </p>
                  <span className="text-[11px] text-zinc-600 mt-1 block">
                    {getTimeAgo(screenshot.created_at)}
                  </span>
                </div>
              </div>
            )}

            <div className="p-3.5">
              <CommentSection type="screenshot" targetId={String(screenshot.id)} />
            </div>
          </div>

          <div className="border-t border-zinc-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <LikeButton 
                  type="screenshot" 
                  targetId={screenshot.id} 
                  currentUserId={user?.user_id}
                  variant="icon"
                />
              </div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wide">
                {getTimeAgo(screenshot.created_at)}
              </span>
            </div>
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
    <Modal 
      isOpen={isOpen} 
      onClose={() => !saving && onClose()} 
      maxWidth="max-w-md" 
      fullscreenMobile 
      showCloseButton={false}
      noScroll
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button 
          onClick={onClose} 
          disabled={saving}
          className="text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          {t("upload.cancel")}
        </button>
        <h3 className="text-sm font-semibold text-white">{t("edit.title")}</h3>
        <button
          onClick={() => onSave({ 
            screenshotId: screenshot.id, 
            caption: caption.trim() || null, 
            gameId: selectedGame?.id || null, 
            gameSlug: selectedGame?.slug || null, 
            isSpoiler 
          })}
          disabled={saving}
          className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t("edit.save")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col md:flex-row">
          <div className="md:flex-1 bg-black flex items-center justify-center p-4">
            <img 
              src={screenshot.image_url} 
              alt="" 
              className="max-w-full max-h-[200px] md:max-h-[300px] object-contain rounded-lg" 
            />
          </div>

          <div className="md:w-[260px] p-4 space-y-4 border-t md:border-t-0 md:border-l border-zinc-800">
            <div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t("upload.captionPlaceholder")}
                maxLength={200}
                rows={3}
                className="w-full px-0 py-0 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none"
              />
              <div className="text-right">
                <span className="text-[10px] text-zinc-600">{caption.length}/200</span>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <Gamepad2 className="w-4 h-4" />
                {t("upload.game")}
              </label>
              {selectedGame ? (
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-800/50 rounded-lg">
                  <span className="text-sm text-white truncate flex-1">{selectedGame.name || selectedGame.slug}</span>
                  <button onClick={() => setSelectedGame(null)} className="text-zinc-500 hover:text-white cursor-pointer p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={gameQuery}
                    onChange={(e) => setGameQuery(e.target.value)}
                    placeholder={t("upload.searchGame")}
                    className="w-full px-3 py-2.5 bg-zinc-800/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                  {gameResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden max-h-40 overflow-y-auto">
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

            <div className="border-t border-zinc-800 pt-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-400">{t("upload.spoiler")}</span>
                </div>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={isSpoiler} 
                    onChange={(e) => setIsSpoiler(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-zinc-700 rounded-full peer-checked:bg-indigo-500 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ScreenshotGridItem({ screenshot, onClick, likesCount, commentsCount }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative aspect-square overflow-hidden bg-zinc-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <img
        src={screenshot.image_url}
        alt={screenshot.caption || ""}
        loading="lazy"
        className={`w-full h-full object-cover transition-all duration-200 ${
          isHovered ? "scale-105" : "scale-100"
        } ${screenshot.is_spoiler ? "blur-xl brightness-50" : ""}`}
      />

      {screenshot.is_spoiler && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <EyeOff className="w-5 h-5 text-white/80" />
          </div>
        </div>
      )}

      <div className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-6 transition-opacity duration-200 ${
        isHovered ? "opacity-100" : "opacity-0"
      }`}>
        <div className="flex items-center gap-1.5 text-white">
          <Heart className="w-5 h-5 fill-white" />
          <span className="text-sm font-semibold">{likesCount || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white">
          <MessageCircle className="w-5 h-5 fill-white" />
          <span className="text-sm font-semibold">{commentsCount || 0}</span>
        </div>
      </div>

      {screenshot.game_name && !screenshot.is_spoiler && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <p className="text-[11px] text-white/90 truncate flex items-center gap-1">
            <Gamepad2 className="w-3 h-3 flex-shrink-0" />
            {screenshot.game_name}
          </p>
        </div>
      )}
    </button>
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-b-2 border-white pb-2">
            <Camera className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              {t("title")}
            </span>
          </div>
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("add")}</span>
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="mb-4">
          <span className="text-sm text-zinc-400">
            <span className="font-semibold text-white">{total}</span> {t("postsCount")}
          </span>
        </div>
      )}

      {screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-zinc-800 rounded-xl">
          <div className="w-20 h-20 rounded-full border-2 border-zinc-700 flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{t("emptyTitle")}</h3>
          <p className="text-sm text-zinc-500 mb-4">{t("emptyDesc")}</p>
          {isOwnProfile && (
            <button 
              onClick={() => setUploadOpen(true)} 
              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              {t("addFirst")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {screenshots.map((s) => (
              <ScreenshotGridItem
                key={s.id}
                screenshot={s}
                onClick={() => setSelected(s)}
                likesCount={s.likes_count}
                commentsCount={s.comments_count}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination 
                currentPage={page} 
                totalPages={totalPages} 
                onPageChange={(p) => fetchScreenshots(p)} 
              />
            </div>
          )}
        </>
      )}

      <UploadModal 
        isOpen={uploadOpen} 
        onClose={() => setUploadOpen(false)} 
        onUpload={handleUpload} 
        uploading={uploading} 
      />

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