import { useState, useEffect, useCallback, useRef } from "react"
import {
  Camera, Plus, EyeOff, X, Loader2,
  Gamepad2, AlertTriangle, ChevronLeft, Search, Check,
  Image, Sparkles
} from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import Pagination from "@components/UI/Pagination"
import PlatformIcons from "@components/Game/PlatformIcons"
import { formatDateShort } from "#utils/formatDate"

const ITEMS_PER_PAGE = 12
const MAX_FILE_SIZE = 10 * 1024 * 1024

function ScreenshotSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
      {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
        <div
          key={i}
          className="relative aspect-square bg-zinc-800/60 overflow-hidden rounded-sm sm:rounded"
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent animate-shimmer"
            style={{ backgroundSize: "200% 100%" }}
          />
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
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
        <div className="p-4 md:p-5">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 transition-colors group-focus-within:text-indigo-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("upload.searchGamePlaceholder")}
              className="w-full pl-10 pr-10 py-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults([]) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-700/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-5 min-h-0 max-h-[55vh] md:max-h-96">
          {searching && (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-zinc-700 rounded-full" />
                <div className="absolute inset-0 w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center">
                <Search className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">{t("upload.noResults")}</p>
            </div>
          )}

          {!searching && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-800/50 border border-zinc-700/50 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">{t("upload.typeToSearch")}</p>
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="space-y-1">
              {results.map(game => {
                const isSelected = selectedGame?.id === game.id
                const coverUrl = game.cover?.url ? `https:${game.cover.url}` : null

                return (
                  <button
                    key={game.id}
                    onClick={() => handleSelect(game)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-left group ${
                      isSelected
                        ? "bg-indigo-500/10 border border-indigo-500/30"
                        : "hover:bg-zinc-800/60 border border-transparent"
                    }`}
                  >
                    <div className="flex-shrink-0 relative">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt=""
                          className="h-16 w-12 rounded-lg object-cover bg-zinc-800 shadow-md"
                        />
                      ) : (
                        <div className="h-16 w-12 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center shadow-md">
                          <Gamepad2 className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${
                        isSelected ? "text-indigo-300" : "text-white group-hover:text-white"
                      }`}>
                        {game.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {game.first_release_date && (
                          <span className="text-xs text-zinc-500">
                            {formatDateShort(game.first_release_date)}
                          </span>
                        )}
                        <PlatformIcons icons={game.platformIcons} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
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
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const fileRef = useRef(null)
  const dropZoneRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setPreview(null)
      setCaption("")
      setIsSpoiler(false)
      setSelectedGame(null)
      setError(null)
      setStep(1)
      setIsDraggingFile(false)
    }
  }, [isOpen])

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    processFile(f)
  }

  function processFile(f) {
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

  function handleDragOver(e) {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setIsDraggingFile(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDraggingFile(false)
    const f = e.dataTransfer.files?.[0]
    processFile(f)
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
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm">
          <button
            onClick={() => step === 1 ? onClose() : setStep(1)}
            disabled={uploading}
            className="w-20 text-left text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {step === 1 ? (
              t("upload.cancel")
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t("upload.back")}</span>
              </>
            )}
          </button>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            {step === 1 ? (
              <>
                <Camera className="w-4 h-4 text-indigo-400" />
                {t("upload.title")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {t("upload.details")}
              </>
            )}
          </h3>
          <div className="w-20 text-right">
            {step === 2 && (
              <button
                onClick={handleSubmit}
                disabled={!file || uploading}
                className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? t("upload.uploading") : t("upload.share")}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {step === 1 ? (
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center min-h-[420px] p-8 transition-all ${
                isDraggingFile ? "bg-indigo-500/5" : ""
              }`}
            >
              <div className={`relative mb-6 transition-transform ${isDraggingFile ? "scale-110" : ""}`}>
                <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
                  isDraggingFile
                    ? "bg-indigo-500/20 border-2 border-dashed border-indigo-500"
                    : "bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 border border-zinc-700/60"
                }`}>
                  <Image className={`w-12 h-12 transition-colors ${
                    isDraggingFile ? "text-indigo-400" : "text-zinc-600"
                  }`} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </div>

              <h4 className="text-xl font-medium text-white mb-2">{t("upload.dragPhotos")}</h4>
              <p className="text-sm text-zinc-500 mb-8 text-center max-w-xs">{t("upload.dragPhotosDesc")}</p>

              <button
                onClick={() => fileRef.current?.click()}
                className="group relative px-6 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-400 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span className="relative z-10">{t("upload.selectFromComputer")}</span>
              </button>

              {error && (
                <div className="flex items-center gap-2 mt-6 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col md:flex-row min-h-[420px]">
              <div className="flex-1 bg-black/40 flex items-center justify-center p-4 md:p-6">
                <div className="relative rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={preview}
                    alt=""
                    className="max-w-full max-h-[50vh] md:max-h-[55vh] w-auto h-auto object-contain"
                  />
                  {isSpoiler && (
                    <div className="absolute inset-0 backdrop-blur-xl bg-black/30 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <EyeOff className="w-8 h-8 text-white/70" />
                        <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Spoiler</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-zinc-800/80 bg-zinc-900/80">
                <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                  <div>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={t("upload.captionPlaceholder")}
                      maxLength={200}
                      rows={4}
                      className="w-full bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none resize-none leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <span className={`text-[10px] font-medium transition-colors ${
                        caption.length > 180 ? "text-amber-500" : "text-zinc-600"
                      }`}>
                        {caption.length}/200
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800/80 pt-5">
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {t("upload.game")}
                    </label>
                    {selectedGame ? (
                      <div className="flex items-center gap-3 p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl">
                        {gameCoverUrl ? (
                          <img src={gameCoverUrl} alt="" className="w-11 h-15 rounded-lg object-cover flex-shrink-0 shadow-md" />
                        ) : (
                          <div className="w-11 h-15 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center flex-shrink-0">
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
                          className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700/60 rounded-lg transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setGameSearchOpen(true)}
                        className="w-full flex items-center gap-3 p-3 bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-700/40 hover:border-zinc-600/60 rounded-xl transition-all cursor-pointer text-left group"
                      >
                        <div className="w-11 h-15 rounded-lg bg-zinc-800/80 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700/80 transition-colors">
                          <Search className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                        </div>
                        <span className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors">
                          {t("upload.searchGame")}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-zinc-800/80 pt-5">
                    <label className="flex items-center justify-between cursor-pointer group p-3 -m-3 rounded-xl hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800/60 flex items-center justify-center group-hover:bg-zinc-700/60 transition-colors">
                          <EyeOff className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div>
                          <span className="text-sm text-zinc-300 font-medium block">{t("upload.spoiler")}</span>
                          <span className="text-xs text-zinc-600">{t("upload.spoilerDesc")}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isSpoiler}
                          onChange={(e) => setIsSpoiler(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer-checked:bg-indigo-500 transition-colors shadow-inner" />
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5" />
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

function ScreenshotGridItem({ screenshot }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <Link
      to={`/screenshot/${screenshot.id}`}
      className="group relative aspect-square overflow-hidden bg-zinc-800/60 cursor-pointer block rounded-sm sm:rounded"
    >
      <img
        src={screenshot.image_url}
        alt={screenshot.caption || ""}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${screenshot.is_spoiler ? "blur-xl brightness-50 scale-110" : "group-hover:scale-105"}`}
      />

      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
      )}

      {screenshot.is_spoiler && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10">
            <EyeOff className="w-5 h-5 text-white/80" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {screenshot.game_name && !screenshot.is_spoiler && (
        <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
          <p className="text-xs text-white/90 font-medium truncate drop-shadow-lg">
            {screenshot.game_name}
          </p>
        </div>
      )}
    </Link>
  )
}

export default function ScreenshotsSection({ userId, isOwnProfile }) {
  const { t } = useTranslation("screenshots")
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

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

  if (loading) return <ScreenshotSkeleton />
  if (!isOwnProfile && screenshots.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
            <Camera className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{t("title")}</h2>
            {total > 0 && (
              <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full font-medium">
                {total}
              </span>
            )}
          </div>
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("add")}</span>
          </button>
        )}
      </div>

      {screenshots.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center py-20 border border-zinc-800/50 rounded-2xl bg-gradient-to-b from-zinc-900/50 to-zinc-900/20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />

          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-5 shadow-xl">
              <Camera className="w-10 h-10 text-zinc-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">{t("emptyTitle")}</h3>
          <p className="text-sm text-zinc-500 mb-6 text-center max-w-xs">{t("emptyDesc")}</p>

          {isOwnProfile && (
            <button
              onClick={() => setUploadOpen(true)}
              className="group text-sm font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              {t("addFirst")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {screenshots.map((s) => (
              <ScreenshotGridItem key={s.id} screenshot={s} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
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
    </div>
  )
}
