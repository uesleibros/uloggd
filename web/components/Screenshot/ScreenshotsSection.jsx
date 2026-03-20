import { useState, useEffect, useCallback, useRef } from "react"
import {
  Camera, Plus, EyeOff, X, Loader2,
  Gamepad2, AlertTriangle, ChevronLeft, Check, ImagePlus
} from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useGameSearch } from "#hooks/useGameSearch"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import ImageCropModal from "@components/UI/ImageCropModal"
import Pagination from "@components/UI/Pagination"
import { GameSearchInput, GameSearchResults } from "@components/Game/GameSearchInput"
import ScreenshotCard, { ScreenshotCardSkeleton } from "@components/Screenshot/ScreenshotCard"
import { formatDateShort } from "#utils/formatDate"

const ITEMS_PER_PAGE = 6
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
const SCREENSHOT_MAX_WIDTH = 1920

function ScreenshotSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-zinc-800 animate-pulse" />
          <div className="w-24 h-4 rounded bg-zinc-800 animate-pulse" />
          <div className="w-6 h-4 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="w-24 h-8 rounded-lg bg-zinc-800 animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
          <ScreenshotCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function GameSearchModal({ isOpen, onClose, onSelect, selectedGame }) {
  const { t } = useTranslation("screenshots")
  const { query, setQuery, results, searching, reset } = useGameSearch({ enabled: isOpen })

  useEffect(() => {
    if (isOpen) {
      reset()
    }
  }, [isOpen, reset])

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
          <GameSearchInput
            query={query}
            onQueryChange={setQuery}
            onClear={reset}
            placeholder={t("upload.searchGamePlaceholder")}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 max-h-[50vh] md:max-h-80">
          <GameSearchResults
            results={results}
            searching={searching}
            query={query}
            onSelect={handleSelect}
            selectedGameId={selectedGame?.id}
            emptyMessage={t("upload.noResults")}
            typeToSearchMessage={t("upload.typeToSearch")}
            showLinks={false}
            renderActions={(game, isSelected) =>
              isSelected && (
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )
            }
          />
        </div>
      </div>
    </Modal>
  )
}

function UploadModal({ isOpen, onClose, onUpload, uploading }) {
  const { t } = useTranslation("screenshots")
  const [cropSrc, setCropSrc] = useState(null)
  const [preview, setPreview] = useState(null)
  const [pendingBlob, setPendingBlob] = useState(null)
  const [caption, setCaption] = useState("")
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameSearchOpen, setGameSearchOpen] = useState(false)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef(null)
  const dropRef = useRef(null)
  const previewUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      setCropSrc(null)
      setPreview(null)
      setPendingBlob(null)
      setCaption("")
      setIsSpoiler(false)
      setSelectedGame(null)
      setError(null)
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

    const reader = new FileReader()
    reader.onload = (ev) => setCropSrc(ev.target.result)
    reader.onerror = () => setError(t("upload.fileReadError"))
    reader.readAsDataURL(f)
  }

  function handleFileChange(e) {
    processFile(e.target.files?.[0])
    e.target.value = ""
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

	function handleCropComplete({ blob, url }) {
	  if (previewUrlRef.current) {
	    URL.revokeObjectURL(previewUrlRef.current)
	  }
	  
	  const previewUrl = url || URL.createObjectURL(blob)
	  previewUrlRef.current = previewUrl
	
	  setPreview(previewUrl)
	  setPendingBlob(blob)
	  setCropSrc(null)
	}

  async function handleSubmit() {
    if (!pendingBlob || uploading) return

    const reader = new FileReader()
    reader.onload = () => {
      onUpload({
        image: reader.result,
        gameId: selectedGame?.id || null,
        gameSlug: selectedGame?.slug || null,
        gameName: selectedGame?.name || null,
        caption: caption.trim() || null,
        isSpoiler,
      })
    }
    reader.onerror = () => setError(t("upload.fileReadError"))
    reader.readAsDataURL(pendingBlob)
  }

  const gameCoverUrl = selectedGame?.cover?.url ? `https:${selectedGame.cover.url}` : null
  const hasImage = !!preview

  return (
    <>
      <Modal
        isOpen={isOpen && !cropSrc}
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
              onClick={() => hasImage ? (setPreview(null), setPendingBlob(null)) : onClose()}
              disabled={uploading}
              className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-white disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              {hasImage && <ChevronLeft className="w-4 h-4" />}
              {hasImage ? t("upload.back") : t("upload.cancel")}
            </button>
          </div>

          <h3 className="text-sm font-semibold text-white">
            {hasImage ? t("upload.details") : t("upload.title")}
          </h3>

          <div className="w-20 flex justify-end">
            {hasImage && (
              <button
                onClick={handleSubmit}
                disabled={!pendingBlob || uploading}
                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-zinc-600 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? t("upload.uploading") : t("upload.share")}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {!hasImage ? (
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
                  className="h-10 px-5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
                >
                  {t("upload.selectImage")}
                </button>

                <p className="text-xs text-zinc-600 mt-4">PNG, JPG, WEBP, GIF • Max 10MB</p>
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
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setGameSearchOpen(true)}
                        className="w-full flex items-center gap-3 p-2.5 bg-zinc-800 hover:bg-zinc-750 rounded-lg transition-colors text-left group cursor-pointer"
                      >
                        <div className="w-9 h-12 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-600 transition-colors">
                          <Gamepad2 className="w-4 h-4 text-zinc-500" />
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
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
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

      <ImageCropModal
        isOpen={!!cropSrc}
        imageSrc={cropSrc || ""}
        aspect={null}
        onCrop={handleCropComplete}
        onClose={() => setCropSrc(null)}
        maxWidth={SCREENSHOT_MAX_WIDTH}
        maxBlobSize={MAX_UPLOAD_SIZE}
        title={t("upload.cropTitle")}
      />

      <GameSearchModal
        isOpen={gameSearchOpen}
        onClose={() => setGameSearchOpen(false)}
        onSelect={setSelectedGame}
        selectedGame={selectedGame}
      />
    </>
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
            className="flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
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
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {t("addFirst")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1 overflow-hidden">
            {screenshots.map((s) => (
              <ScreenshotCard key={s.id} screenshot={s} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => fetchScreenshots(p)}
            />
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
