import { useState, useEffect, useCallback, useRef } from "react"
import {
  Camera, Plus, EyeOff, X, Loader2,
  Gamepad2, AlertTriangle, ChevronLeft, Search, Check, ImagePlus
} from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import Pagination from "@components/UI/Pagination"
import PlatformIcons from "@components/Game/PlatformIcons"
import { formatDateShort } from "#utils/formatDate"

const ITEMS_PER_PAGE = 6
const MAX_FILE_SIZE = 10 * 1024 * 1024

function ScreenshotSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-zinc-800 animate-pulse" />
          <div className="w-24 h-4 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="w-20 h-8 rounded-lg bg-zinc-800 animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
          <div key={i} className="aspect-square bg-zinc-800 animate-pulse" />
        ))}
      </div>
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
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("upload.searchGamePlaceholder")}
              className="w-full h-10 pl-9 pr-9 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults([]) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 max-h-[50vh] md:max-h-80">
          {searching && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <p className="text-sm text-zinc-500">{t("upload.noResults")}</p>
            </div>
          )}

          {!searching && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Search className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">{t("upload.typeToSearch")}</p>
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="px-2 pb-2">
              {results.map(game => {
                const isSelected = selectedGame?.id === game.id
                const coverUrl = game.cover?.url ? `https:${game.cover.url}` : null

                return (
                  <button
                    key={game.id}
                    onClick={() => handleSelect(game)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                      isSelected ? "bg-indigo-500/15" : "hover:bg-zinc-800"
                    }`}
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        className="w-10 h-14 rounded object-cover bg-zinc-800 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="w-4 h-4 text-zinc-600" />
                      </div>
                    )}

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
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
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
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setPreview(null)
      setCaption("")
      setIsSpoiler(false)
      setSelectedGame(null)
      setError(null)
      setStep(1)
      setIsDragging(false)
    }
  }, [isOpen])

  function processFile(f) {
    if (!f) return
    if (f.size > MAX_FILE_SIZE) {
      setError(t("upload.fileTooLarge"))
      return
    }
    if (!f.type.startsWith("image/")) {
      setError(t("upload.invalidType"))
      return
    }
    setError(null)
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreview(ev.target.result)
      setStep(2)
    }
    reader.readAsDataURL(f)
  }

  function handleFileChange(e) {
    processFile(e.target.files?.[0])
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    processFile(e.dataTransfer.files?.[0])
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
        maxWidth="max-w-3xl"
        fullscreenMobile
        showCloseButton={false}
        closeOnOverlay={!uploading}
        noScroll
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-800 flex-shrink-0">
          <div className="w-20">
            <button
              onClick={() => step === 1 ? onClose() : setStep(1)}
              disabled={uploading}
              className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-white disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {step === 2 && <ChevronLeft className="w-4 h-4" />}
              {step === 1 ? t("upload.cancel") : t("upload.back")}
            </button>
          </div>

          <h3 className="text-sm font-semibold text-white">
            {step === 1 ? t("upload.title") : t("upload.details")}
          </h3>

          <div className="w-20 flex justify-end">
            {step === 2 && (
              <button
                onClick={handleSubmit}
                disabled={!file || uploading}
                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-zinc-600 disabled:pointer-events-none transition-colors"
              >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? t("upload.uploading") : t("upload.share")}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {step === 1 ? (
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="h-full flex items-center justify-center p-6"
            >
              <div
                className={`w-full max-w-sm flex flex-col items-center p-8 rounded-2xl border-2 border-dashed transition-all ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-700 bg-zinc-800/30"
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  isDragging ? "bg-indigo-500/20" : "bg-zinc-800"
                }`}>
                  <ImagePlus className={`w-7 h-7 transition-colors ${
                    isDragging ? "text-indigo-400" : "text-zinc-500"
                  }`} />
                </div>

                <h4 className="text-base font-medium text-white mb-1 text-center">
                  {t("upload.dragPhotos")}
                </h4>
                <p className="text-sm text-zinc-500 text-center mb-5">
                  {t("upload.dragPhotosDesc")}
                </p>

                <button
                  onClick={() => fileRef.current?.click()}
                  className="h-9 px-4 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 rounded-lg transition-colors"
                >
                  {t("upload.selectFromComputer")}
                </button>

                <p className="text-xs text-zinc-600 mt-4">PNG, JPG, WEBP • Max 10MB</p>
              </div>

              {error && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col md:flex-row">
              <div className="flex-1 min-h-0 bg-black/50 flex items-center justify-center p-4">
                <img
                  src={preview}
                  alt=""
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded"
                />
              </div>

              <div className="w-full md:w-72 flex-shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                      {t("upload.caption")}
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={t("upload.captionPlaceholder")}
                      maxLength={200}
                      rows={3}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-xs tabular-nums ${
                        caption.length > 180 ? "text-amber-400" : "text-zinc-500"
                      }`}>
                        {caption.length}/200
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-800" />

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                      {t("upload.game")}
                    </label>

                    {selectedGame ? (
                      <div className="flex items-center gap-3 p-2.5 bg-zinc-800 rounded-lg">
                        {gameCoverUrl ? (
                          <img
                            src={gameCoverUrl}
                            alt=""
                            className="w-9 h-12 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-12 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <Gamepad2 className="w-4 h-4 text-zinc-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {selectedGame.name}
                          </p>
                          {selectedGame.first_release_date && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {formatDateShort(selectedGame.first_release_date)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedGame(null)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setGameSearchOpen(true)}
                        className="w-full flex items-center gap-3 p-2.5 bg-zinc-800 hover:bg-zinc-750 rounded-lg transition-colors text-left group"
                      >
                        <div className="w-9 h-12 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-600 transition-colors">
                          <Search className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors">
                          {t("upload.searchGame")}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="h-px bg-zinc-800" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <EyeOff className="w-4 h-4 text-zinc-500" />
                      <div>
                        <span className="text-sm text-zinc-300">{t("upload.spoiler")}</span>
                        <p className="text-xs text-zinc-600">{t("upload.spoilerDesc")}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isSpoiler}
                      onClick={() => setIsSpoiler(!isSpoiler)}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                        isSpoiler ? "bg-indigo-500" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          isSpoiler ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
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
      className="relative aspect-square overflow-hidden bg-zinc-900 block group"
    >
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      <img
        src={screenshot.image_url}
        alt={screenshot.caption || ""}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${screenshot.is_spoiler ? "blur-xl scale-110" : "group-hover:scale-105"}`}
      />

      {screenshot.is_spoiler && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
            <EyeOff className="w-5 h-5 text-white/70" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
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
    } catch {
      setScreenshots([])
    } finally {
      setLoading(false)
    }
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data),
      })
      if (r.ok) {
        setUploadOpen(false)
        fetchScreenshots(1)
      }
    } catch {
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <ScreenshotSkeleton />
  if (!isOwnProfile && screenshots.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
            {t("title")}
          </h2>
          {total > 0 && (
            <span className="text-sm text-zinc-500">{total}</span>
          )}
        </div>

        {isOwnProfile && (
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("add")}</span>
          </button>
        )}
      </div>

      {screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-zinc-800 rounded-xl">
          <div className="w-16 h-16 rounded-full border-2 border-zinc-700 flex items-center justify-center mb-4">
            <Camera className="w-7 h-7 text-zinc-600" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">{t("emptyTitle")}</h3>
          <p className="text-sm text-zinc-500 mb-4">{t("emptyDesc")}</p>
          {isOwnProfile && (
            <button
              onClick={() => setUploadOpen(true)}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {t("addFirst")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {screenshots.map((s) => (
              <ScreenshotGridItem key={s.id} screenshot={s} />
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
    </div>
  )
}
