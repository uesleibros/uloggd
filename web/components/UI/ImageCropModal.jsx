import { useState, useRef, useCallback, useEffect } from "react"
import { useTranslation } from "#hooks/useTranslation"
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { X, Loader2 } from "lucide-react"
import Modal from "@components/UI/Modal"
import { parseGIF, decompressFrames } from "gifuct-js"

function getCroppedCanvas(image, crop, maxWidth = 1920) {
  const canvas = document.createElement("canvas")
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  const pixelCrop = {
    x: Math.round(crop.x * scaleX),
    y: Math.round(crop.y * scaleY),
    width: Math.round(crop.width * scaleX),
    height: Math.round(crop.height * scaleY),
  }

  const scale = Math.min(1, maxWidth / pixelCrop.width)

  canvas.width = Math.round(pixelCrop.width * scale)
  canvas.height = Math.round(pixelCrop.height * scale)

  const ctx = canvas.getContext("2d")
  ctx.imageSmoothingQuality = "high"

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas
}

async function cropGif(gifUrl, crop, imageElement, maxWidth = 1920) {
  const scaleX = imageElement.naturalWidth / imageElement.width
  const scaleY = imageElement.naturalHeight / imageElement.height

  const pixelCrop = {
    x: Math.round(crop.x * scaleX),
    y: Math.round(crop.y * scaleY),
    width: Math.round(crop.width * scaleX),
    height: Math.round(crop.height * scaleY),
  }

  const scale = Math.min(1, maxWidth / pixelCrop.width)
  const outputWidth = Math.round(pixelCrop.width * scale)
  const outputHeight = Math.round(pixelCrop.height * scale)

  const response = await fetch(gifUrl)
  const arrayBuffer = await response.arrayBuffer()
  const gif = parseGIF(arrayBuffer)
  const frames = decompressFrames(gif, true)

  if (frames.length === 0) {
    throw new Error("No frames found in GIF")
  }

  const GIF = (await import("gif.js")).default

  return new Promise((resolve, reject) => {
    const encoder = new GIF({
      workers: 2,
      quality: 10,
      width: outputWidth,
      height: outputHeight,
      workerScript: "/gif.worker.js",
    })

    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = imageElement.naturalWidth
    tempCanvas.height = imageElement.naturalHeight
    const tempCtx = tempCanvas.getContext("2d")

    const cropCanvas = document.createElement("canvas")
    cropCanvas.width = outputWidth
    cropCanvas.height = outputHeight
    const cropCtx = cropCanvas.getContext("2d")

    let lastImageData = null

    frames.forEach((frame) => {
      const frameCanvas = document.createElement("canvas")
      frameCanvas.width = frame.dims.width
      frameCanvas.height = frame.dims.height
      const frameCtx = frameCanvas.getContext("2d")

      const imageData = frameCtx.createImageData(frame.dims.width, frame.dims.height)
      imageData.data.set(frame.patch)
      frameCtx.putImageData(imageData, 0, 0)

      if (frame.disposalType === 2) {
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
      } else if (frame.disposalType === 3 && lastImageData) {
        tempCtx.putImageData(lastImageData, 0, 0)
      }

      if (frame.disposalType === 3) {
        lastImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
      }

      tempCtx.drawImage(frameCanvas, frame.dims.left, frame.dims.top)

      cropCtx.clearRect(0, 0, outputWidth, outputHeight)
      cropCtx.drawImage(
        tempCanvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputWidth,
        outputHeight
      )

      const delay = frame.delay || 100
      encoder.addFrame(cropCtx, { copy: true, delay })
    })

    encoder.on("finished", (blob) => {
      const url = URL.createObjectURL(blob)
      resolve({ blob, url })
    })

    encoder.on("error", reject)
    encoder.render()
  })
}

function isGifUrl(url) {
  if (!url) return false
  if (url.toLowerCase().includes(".gif")) return true
  if (url.startsWith("data:image/gif")) return true
  return false
}

const MAX_BLOB_SIZE = 3 * 1024 * 1024

function compressToLimit(canvas, maxBytes = MAX_BLOB_SIZE, startQuality = 0.85, minQuality = 0.3) {
  return new Promise((resolve) => {
    let quality = startQuality

    function attempt() {
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null)

          if (blob.size <= maxBytes || quality <= minQuality) {
            const url = URL.createObjectURL(blob)
            resolve({ blob, url })
            return
          }

          quality -= 0.1
          attempt()
        },
        "image/webp",
        quality
      )
    }

    attempt()
  })
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  aspect,
  onCrop,
  onClose,
  maxWidth = 1920,
  title,
  circularCrop = false,
  maxBlobSize = MAX_BLOB_SIZE,
}) {
  const { t } = useTranslation()
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)
  const [processing, setProcessing] = useState(false)
  const imgRef = useRef(null)

  const modalTitle = title || t("imageCrop.title")
  const isGif = isGifUrl(imageSrc)

  useEffect(() => {
    if (isOpen) {
      setCrop(undefined)
      setCompletedCrop(null)
      setProcessing(false)
    }
  }, [isOpen, imageSrc])

  const onImageLoad = useCallback(
    (e) => {
      const { width, height } = e.currentTarget

      const percentCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
        width,
        height
      )

      setCrop(percentCrop)

      const pixelCrop = convertToPixelCrop(percentCrop, width, height)
      setCompletedCrop(pixelCrop)
    },
    [aspect]
  )

  async function handleConfirm() {
    if (!completedCrop || !imgRef.current) return

    setProcessing(true)

    try {
      if (isGif) {
        const result = await cropGif(imageSrc, completedCrop, imgRef.current, maxWidth)

        if (result.blob.size > maxBlobSize) {
          notify?.(t("imageCrop.tooLarge"), "error")
          setProcessing(false)
          return
        }

        onCrop(result)
      } else {
        const canvas = getCroppedCanvas(imgRef.current, completedCrop, maxWidth)
        const result = await compressToLimit(canvas, maxBlobSize)

        if (!result) {
          setProcessing(false)
          return
        }

        onCrop(result)
      }
    } catch (error) {
      console.error("Error cropping image:", error)
      setProcessing(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} raw>
      <div
        data-crop-modal
        className="relative bg-zinc-900 border-t sm:border border-zinc-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[85vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-zinc-700 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-white">{modalTitle}</h3>
            {isGif && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded">
                GIF
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="p-2 -mr-1 text-zinc-400 hover:text-white active:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4 flex items-center justify-center bg-zinc-950/50">
          {isOpen && imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
              aspect={aspect}
              circularCrop={circularCrop}
              minWidth={50}
              minHeight={50}
              className="max-h-[60dvh] sm:max-h-[60vh]"
              style={{ touchAction: "none" }}
              disabled={processing}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop"
                onLoad={onImageLoad}
                className="max-h-[60dvh] sm:max-h-[60vh] select-none max-w-full object-contain"
                draggable={false}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 border-t border-zinc-700 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
          <p className="text-xs text-zinc-500 text-center sm:text-left hidden sm:block">
            {t("imageCrop.adjustHint")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-zinc-300 hover:text-white active:text-white bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {t("imageCrop.cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!completedCrop || processing}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("imageCrop.processing")}</span>
                </>
              ) : (
                t("imageCrop.apply")
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}