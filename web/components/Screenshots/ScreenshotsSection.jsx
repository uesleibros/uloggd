import { useState, useEffect, useCallback, useRef } from "react"
import {
  Camera, Plus, Trash2, EyeOff, Pencil, X, Loader2,
  Gamepad2, AlertTriangle, ChevronLeft, ChevronRight,
  MoreHorizontal, MessageCircle, Search, Check
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
import PlatformIcons from "@components/Game/PlatformIcons"
import { formatDateShort } from "#utils/formatDate"

const ITEMS_PER_PAGE = 12
const MAX_FILE_SIZE = 10 * 1024 * 1024

function ScreenshotSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
          <div className="aspect-video bg-zinc-800/50 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse" />
            <div className="h-8 w-24 bg-zinc-800/50 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function GameSearchModal({ isOpen, onClose, onSelect, selectedGame }) {
  const { t } = useTranslation("screenshots")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/igdb/autocomplete?query=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleSelect(game) {
    onSelect(game)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("upload.searchGame")}
      maxWidth="max-w-lg"
      fullscreenMobile
      showMobileGrip
    >
      <div className="flex flex-col h-full">
        <div className="p-5 pb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("upload.searchGamePlaceholder")}
              className="w-full pl-10 pr-10 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults([]) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0 max-h-[55vh] md:max-h-96">
          {searching && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
            </div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-16">
              {t("upload.noResults")}
            </p>
          )}

          {!searching && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Search className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-600">{t("upload.typeToSearch")}</p>
            </div>
          )}

          {!searching && results.map(game => {
            const isSelected = selectedGame?.id === game.id
            const coverUrl = game.cover?.url ? `https:${game.cover.url}` : null

            return (
              <button
                key={game.id}
                onClick={() => handleSelect(game)}
                className="w-full flex items-center gap-3 py-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors cursor-pointer text-left"
              >
                <div className="flex-shrink-0">
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="h-14 w-10 rounded object-cover bg-zinc-800" />
                  ) : (
                    <div className="h-14 w-10 rounded bg-zinc-800 flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{game.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {game.first_release_date && (
                      <span className="text-xs text-zinc-500">
                        {formatDateShort(game.first_release_date)}
                      </span>
                    )}
                    <PlatformIcons icons={game.platformIcons} />
                  </div>
                </div>

                {isSelected && (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 px-2.5 py-1.5 bg-emerald-500/10 rounded-lg flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

function UploadModal({ isOpen, onClose, onUpload, uploading }) {
  const { t } = useTranslation("screenshots")
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState("")
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameSearchOpen, setGameSearchOpen] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(1)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setPreview(null)
      setCaption("")
      setIsSpoiler(false)
      setSelectedGame(null)
      setError(null)
      setStep(1)
    }
  }, [isOpen])

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
        gameName: selectedGame?.name || null,
        caption: caption.trim() || null,
        isSpoiler,
      })
    }
    reader.readAsDataURL(file)
  }

  const gameCoverUrl = selectedGame?.cover?.url ? `https:${selectedGame.cover.url}` : null

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={() => !uploading && onClose()} 
        maxWidth="max-w-2xl" 
        fullscreenMobile 
        showCloseButton={false}
        closeOnOverlay={!uploading}
        noScroll
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <button 
            onClick={() => step === 1 ? onClose() : setStep(1)} 
            disabled={uploading}
            className="w-20 text-left text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {step === 1 ? t("upload.cancel") : <ChevronLeft className="w-5 h-5" />}
          </button>
          <h3 className="text-sm font-semibold text-white">
            {step === 1 ? t("upload.title") : t("upload.details")}
          </h3>
          <div className="w-20 text-right">
            {step === 2 && (
              <button
                onClick={handleSubmit}
                disabled={!file || uploading}
                className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? t("upload.uploading") : t("upload.share")}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {step === 1 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
              <div className="w-24 h-24 rounded-full bg-zinc-800/30 border border-zinc-700 flex items-center justify-center mb-5">
                <Camera className="w-12 h-12 text-zinc-600" />
              </div>
              <h4 className="text-xl font-light text-white mb-2">{t("upload.dragPhotos")}</h4>
              <p className="text-sm text-zinc-500 mb-6">{t("upload.dragPhotosDesc")}</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
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
            <div className="flex flex-col md:flex-row min-h-[400px]">
              <div className="flex-1 bg-black flex items-center justify-center p-4">
                <img 
                  src={preview} 
                  alt="" 
                  className="max-w-full max-h-[50vh] md:max-h-[60vh] w-auto h-auto object-contain" 
                />
              </div>

              <div className="w-full md:w-[300px] flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900">
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <div>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={t("upload.captionPlaceholder")}
                      maxLength={200}
                      rows={4}
                      className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none"
                    />
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-600">{caption.length}/200</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      {t("upload.game")}
                    </label>
                    {selectedGame ? (
                      <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                        {gameCoverUrl ? (
                          <img src={gameCoverUrl} alt="" className="w-10 h-14 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-14 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <Gamepad2 className="w-4 h-4 text-zinc-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{selectedGame.name}</p>
                          {selectedGame.first_release_date && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {formatDateShort(selectedGame.first_release_date)}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => setSelectedGame(null)} 
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setGameSearchOpen(true)}
                        className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <div className="w-10 h-14 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                          <Search className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="text-sm text-zinc-500">{t("upload.searchGame")}</span>
                      </button>
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
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </Modal>

      <GameSearchModal
        isOpen={gameSearchOpen}
        onClose={() => setGameSearchOpen(false)}
        onSelect={setSelectedGame}
        selectedGame={selectedGame}
      />
    </>
  )
}

function EditScreenshotModal({ screenshot, isOpen, onClose, onSave, saving }) {
  const { t } = useTranslation("screenshots")
  const [caption, setCaption] = useState("")
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameSearchOpen, setGameSearchOpen] = useState(false)

  useEffect(() => {
    if (isOpen && screenshot) {
      setCaption(screenshot.caption || "")
      setIsSpoiler(screenshot.is_spoiler || false)
      setSelectedGame(screenshot.game_slug ? { 
        slug: screenshot.game_slug, 
        id: screenshot.game_id, 
        name: screenshot.game_name,
        cover: screenshot.game_cover ? { url: screenshot.game_cover } : null
      } : null)
    }
  }, [isOpen, screenshot])

  if (!screenshot) return null

  const gameCoverUrl = selectedGame?.cover?.url 
    ? (selectedGame.cover.url.startsWith("//") ? `https:${selectedGame.cover.url}` : selectedGame.cover.url)
    : null

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={() => !saving && onClose()} 
        maxWidth="max-w-lg" 
        fullscreenMobile 
        showCloseButton={false}
        noScroll
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="w-20 text-left text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {t("upload.cancel")}
          </button>
          <h3 className="text-sm font-semibold text-white">{t("edit.title")}</h3>
          <div className="w-20 text-right">
            <button
              onClick={() => onSave({ 
                screenshotId: screenshot.id, 
                caption: caption.trim() || null, 
                gameId: selectedGame?.id || null, 
                gameSlug: selectedGame?.slug || null,
                gameName: selectedGame?.name || null,
                isSpoiler 
              })}
              disabled={saving}
              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("edit.save")}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[200px]">
              <img 
                src={screenshot.image_url} 
                alt="" 
                className="max-w-full max-h-[40vh] w-auto h-auto object-contain" 
              />
            </div>

            <div className="w-full md:w-[280px] flex-shrink-0 p-4 space-y-4 border-t md:border-t-0 md:border-l border-zinc-800">
              <div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={t("upload.captionPlaceholder")}
                  maxLength={200}
                  rows={4}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none"
                />
                <div className="text-right">
                  <span className="text-[10px] text-zinc-600">{caption.length}/200</span>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {t("upload.game")}
                </label>
                {selectedGame ? (
                  <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    {gameCoverUrl ? (
                      <img src={gameCoverUrl} alt="" className="w-8 h-11 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-11 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-white truncate flex-1">{selectedGame.name}</p>
                    <button 
                      onClick={() => setSelectedGame(null)} 
                      className="p-1 text-zinc-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setGameSearchOpen(true)}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <div className="w-8 h-11 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <Search className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                    <span className="text-sm text-zinc-500">{t("upload.searchGame")}</span>
                  </button>
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

      <GameSearchModal
        isOpen={gameSearchOpen}
        onClose={() => setGameSearchOpen(false)}
        onSelect={setSelectedGame}
        selectedGame={selectedGame}
      />
    </>
  )
}

function ScreenshotCard({ screenshot, owner, isOwner, onEdit, onDelete, getTimeAgo }) {
  const { t } = useTranslation("screenshots")
  const { user } = useAuth()
  const [revealed, setRevealed] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef(null)

  const isSpoilerHidden = screenshot.is_spoiler && !revealed
  const gameCoverUrl = screenshot.game_cover 
    ? (screenshot.game_cover.startsWith("//") ? `https:${screenshot.game_cover}` : screenshot.game_cover)
    : null

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

  return (
    <article className="bg-zinc-900/50 border border-zinc-800/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {owner && (
            <Link to={`/u/${owner.username}`} className="flex-shrink-0">
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
              <Link 
                to={`/u/${owner.username}`}
                className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors block truncate"
              >
                {owner.username}
              </Link>
            )}
            <span className="text-[11px] text-zinc-500">{getTimeAgo(screenshot.created_at)}</span>
          </div>
        </div>

        {isOwner && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-30 overflow-hidden">
                <button 
                  onClick={() => { onEdit(screenshot); setShowMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                  {t("lightbox.edit")}
                </button>
                {confirmDelete ? (
                  <button 
                    onClick={() => { onDelete(screenshot.id); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("lightbox.confirmDelete")}
                  </button>
                ) : (
                  <button 
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("lightbox.delete")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative bg-black">
        {isSpoilerHidden ? (
          <div className="relative aspect-video flex items-center justify-center">
            <img 
              src={screenshot.image_url} 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110" 
            />
            <button
              onClick={() => setRevealed(true)}
              className="relative z-10 flex flex-col items-center justify-center gap-3 cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full bg-zinc-800/80 backdrop-blur flex items-center justify-center group-hover:bg-zinc-700/80 transition-colors">
                <EyeOff className="w-6 h-6 text-zinc-400" />
              </div>
              <span className="text-sm font-medium text-zinc-400">{t("lightbox.revealSpoiler")}</span>
            </button>
          </div>
        ) : (
          <img 
            src={screenshot.image_url} 
            alt={screenshot.caption || ""} 
            className="w-full h-auto"
          />
        )}
      </div>

      <div className="p-4 space-y-3">
        {screenshot.game_slug && (
          <Link
            to={`/game/${screenshot.game_slug}`}
            className="flex items-center gap-3 p-2.5 -mx-1 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            {gameCoverUrl ? (
              <img src={gameCoverUrl} alt="" className="w-8 h-11 rounded object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-11 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Gamepad2 className="w-3.5 h-3.5 text-zinc-600" />
              </div>
            )}
            <span className="text-sm font-medium text-zinc-300 hover:text-white truncate">
              {screenshot.game_name || screenshot.game_slug}
            </span>
          </Link>
        )}

        {screenshot.caption && (
          <p className="text-sm text-zinc-300">
            {owner && (
              <Link 
                to={`/u/${owner.username}`}
                className="font-semibold text-white hover:text-zinc-300 mr-1.5"
              >
                {owner.username}
              </Link>
            )}
            {screenshot.caption}
          </p>
        )}

        <div className="flex items-center gap-4 pt-1">
          <LikeButton 
            type="screenshot" 
            targetId={screenshot.id} 
            currentUserId={user?.user_id}
            variant="icon"
          />
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            {screenshot.comments_count > 0 && (
              <span className="text-sm">{screenshot.comments_count}</span>
            )}
          </button>
        </div>

        {showComments && (
          <div className="pt-3 border-t border-zinc-800">
            <CommentSection type="screenshot" targetId={String(screenshot.id)} />
          </div>
        )}
      </div>
    </article>
  )
}

export default function ScreenshotsSection({ userId, isOwnProfile, owner }) {
  const { t } = useTranslation("screenshots")
  const { getTimeAgo } = useDateTime()
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Camera className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{t("title")}</h2>
          {total > 0 && <span className="text-sm text-zinc-500">{total}</span>}
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("add")}</span>
          </button>
        )}
      </div>

      {screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-zinc-800/50 rounded-xl bg-zinc-900/30">
          <div className="w-20 h-20 rounded-full border border-zinc-700 flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{t("emptyTitle")}</h3>
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
          <div className="space-y-6">
            {screenshots.map((s) => (
              <ScreenshotCard
                key={s.id}
                screenshot={s}
                owner={owner}
                isOwner={isOwnProfile}
                onEdit={setEditingScreenshot}
                onDelete={handleDelete}
                getTimeAgo={getTimeAgo}
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