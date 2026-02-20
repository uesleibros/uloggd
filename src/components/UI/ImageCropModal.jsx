import { useState, useRef, useCallback, useEffect } from "react"
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { X } from "lucide-react"
import Modal from "../UI/Modal"

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

export default function ImageCropModal({ isOpen, imageSrc, aspect, onCrop, onClose, maxWidth = 1920, title = "Recortar imagem", circularCrop = false }) {
	const [crop, setCrop] = useState()
	const [completedCrop, setCompletedCrop] = useState(null)
	const imgRef = useRef(null)

	useEffect(() => {
		if (isOpen) {
			setCrop(undefined)
			setCompletedCrop(null)
		}
	}, [isOpen, imageSrc])

	const onImageLoad = useCallback((e) => {
		const { width, height } = e.currentTarget

		const percentCrop = centerCrop(
			makeAspectCrop(
				{ unit: "%", width: 90 },
				aspect,
				width,
				height
			),
			width,
			height
		)

		setCrop(percentCrop)

		const pixelCrop = convertToPixelCrop(percentCrop, width, height)
		setCompletedCrop(pixelCrop)
	}, [aspect])

	function handleConfirm() {
		if (!completedCrop || !imgRef.current) return
		
		const canvas = getCroppedCanvas(imgRef.current, completedCrop, maxWidth)
		
		canvas.toBlob((blob) => {
			if (!blob) return
			const url = URL.createObjectURL(blob)
				onCrop({ blob, url })
		}, "image/webp", 0.85)
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			raw
		>
			<div
				data-crop-modal
				className="relative bg-zinc-900 border-t sm:border border-zinc-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[85vh] flex flex-col shadow-2xl"
			>
				<div className="flex items-center justify-between p-3 sm:p-4 border-b border-zinc-700 shrink-0">
					<h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-2 -mr-1 text-zinc-400 hover:text-white active:text-white transition-colors cursor-pointer"
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
						Arraste para ajustar a área do recorte
					</p>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-zinc-300 hover:text-white active:text-white bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer"
						>
							Cancelar
						</button>
						<button
							type="button"
							onClick={handleConfirm}
							disabled={!completedCrop}
							className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Aplicar
						</button>
					</div>
				</div>
			</div>
		</Modal>
	)
}




