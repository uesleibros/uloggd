import { useState, useEffect, useRef } from "react"
import { ImagePlus, Pencil, Trash2, Upload, Globe, AlertCircle, Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { notify } from "@components/UI/Notification"
import ImageCropModal from "@components/UI/ImageCropModal"

const BANNER_ASPECT = 16 / 4
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function BannerEditor({ currentBanner, onSave, saving = false }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState(null)
  const [urlInput, setUrlInput] = useState("")
  const [urlError, setUrlError] = useState("")
  const [urlLoading, setUrlLoading] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [preview, setPreview] = useState(currentBanner || null)
  const [pendingBlob, setPendingBlob] = useState(null)
  const fileRef = useRef(null)
  const previewUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreview(currentBanner)
    setPendingBlob(null)
    setMode(null)
  }, [currentBanner])

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      notify(t("banner.errors.invalidFile"), "error")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      notify(t("banner.errors.fileTooLarge"), "error")
      return
    }

    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result)
    reader.onerror = () => notify(t("banner.errors.fileReadError"), "error")
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  async function handleUrlSubmit() {
    if (!urlInput.trim()) return

    setUrlError("")
    setUrlLoading(true)

    try {
      const res = await fetch(urlInput.trim(), { mode: "cors" })
      if (!res.ok) throw new Error()

      const contentType = res.headers.get("content-type")
      if (!contentType?.startsWith("image/")) {
        setUrlError(t("banner.errors.invalidUrl"))
        setUrlLoading(false)
        return
      }

      const blob = await res.blob()

      if (blob.size > MAX_FILE_SIZE) {
        setUrlError(t("banner.errors.urlTooLarge"))
        setUrlLoading(false)
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        setCropSrc(reader.result)
        setUrlLoading(false)
        setMode(null)
      }
      reader.onerror = () => {
        setUrlError(t("banner.errors.urlProcessError"))
        setUrlLoading(false)
      }
      reader.readAsDataURL(blob)
    } catch {
      setUrlError(t("banner.errors.urlLoadError"))
      setUrlLoading(false)
    }
  }

  function handleCropComplete({ blob, url }) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = url

    setPreview(url)
    setPendingBlob(blob)
    setCropSrc(null)
    setMode(null)
  }

  function handleSave() {
    if (!pendingBlob) return

    if (pendingBlob.size > 5 * 1024 * 1024) {
      notify(t("banner.errors.processedTooLarge"), "error")
      return
    }

    const reader = new FileReader()
    reader.onload = () => onSave(reader.result)
    reader.onerror = () => notify(t("banner.errors.urlProcessError"), "error")
    reader.readAsDataURL(pendingBlob)
  }

  function handleRemove() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    setPreview(null)
    setPendingBlob(null)
    setMode(null)

    if (currentBanner) {
      onSave(null)
    } else {
      notify(t("banner.discarded"), "info")
    }
  }

  const hasChanges = pendingBlob !== null || (preview === null && currentBanner !== null)

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800/50">
        {preview ? (
          <>
            <div className="relative group">
              <img
                src={preview}
                alt="Banner"
                className="w-full aspect-[16/4] select-none object-cover"
                draggable={false}
              />
            </div>

            <div className="flex border-t border-zinc-700">
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors cursor-pointer border-r border-zinc-700"
              >
                <Pencil className="w-4 h-4" />
                {t("banner.change")}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {t("banner.remove")}
              </button>
            </div>
          </>
        ) : (
          <div
            className="w-full aspect-[16/4] flex items-center justify-center p-4 cursor-pointer hover:bg-zinc-800/80 transition-colors"
            onClick={() => setMode("choose")}
          >
            <div className="flex flex-col items-center gap-2 text-zinc-500 text-center">
              <ImagePlus className="w-8 h-8" strokeWidth={1.5} />
              <span className="text-xs sm:text-sm">{t("banner.add")}</span>
            </div>
          </div>
        )}
      </div>

      {mode === "choose" && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
            >
              <Upload className="w-5 h-5 text-zinc-400" />
              <span className="text-sm text-zinc-300">{t("banner.uploadFile")}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
            >
              <Globe className="w-5 h-5 text-zinc-400" />
              <span className="text-sm text-zinc-300">{t("banner.pasteUrl")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMode(null)}
            className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer py-1.5"
          >
            {t("banner.cancel")}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {mode === "url" && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError("") }}
              placeholder={t("banner.urlPlaceholder")}
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit() }}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || urlLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:w-auto w-full"
            >
              {urlLoading ? (
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
              ) : (
                t("banner.load")
              )}
            </button>
          </div>

          {urlError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {urlError}
            </p>
          )}

          <button
            type="button"
            onClick={() => { setMode("choose"); setUrlInput(""); setUrlError("") }}
            className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer py-1.5"
          >
            {t("banner.back")}
          </button>
        </div>
      )}

      {hasChanges && (
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current)
                previewUrlRef.current = null
              }
              setPreview(currentBanner)
              setPendingBlob(null)
            }}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            {t("banner.discard")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {t("banner.save")}
          </button>
        </div>
      )}

      <ImageCropModal
        isOpen={!!cropSrc}
        imageSrc={cropSrc || ""}
        aspect={BANNER_ASPECT}
        title={t("banner.cropTitle")}
        onCrop={handleCropComplete}
        onClose={() => setCropSrc(null)}
      />
    </div>
  )
}
