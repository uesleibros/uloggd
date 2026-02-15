import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import ReactCrop from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"

function getCroppedCanvas(image, crop) {
  const canvas = document.createElement("canvas")
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  canvas.width = Math.floor(crop.width * scaleX)
  canvas.height = Math.floor(crop.height * scaleY)

  const ctx = canvas.getContext("2d")
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas
}

export default function ImageCropModal({ imageSrc, aspect, onCrop, onClose, title = "Recortar imagem" }) {
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)
  const imgRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget
    const cropWidth = width * 0.9
    const cropHeight = cropWidth / aspect
    const x = (width - cropWidth) / 2
    const y = (height - cropHeight) / 2

    const initialCrop = {
      unit: "px",
      x,
      y,
      width: cropWidth,
      height: Math.min(cropHeight, height),
    }

    setCrop(initialCrop)
    setCompletedCrop(initialCrop)
  }, [aspect])

  function handleConfirm() {
    if (!completedCrop || !imgRef.current) return

    const canvas = getCroppedCanvas(imgRef.current, completedCrop)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      onCrop({ blob, url })
    }, "image/jpeg", 0.92)
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        data-crop-modal
        className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-950/50">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-h-[60vh]"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop"
              onLoad={onImageLoad}
              className="max-h-[60vh] select-none max-w-full object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-zinc-700">
          <p className="text-xs text-zinc-500">Arraste para ajustar a área do recorte</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!completedCrop}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}