import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

const mobileSheetStyle = `
@media (max-width: 767px) {
	.modal-sheet-enter { transform: translateY(100%); opacity: 1; }
	.modal-sheet-active { transform: translateY(0); opacity: 1; }
}
@media (min-width: 768px) {
	.modal-sheet-enter { transform: translateY(8px) scale(0.95); opacity: 0; }
	.modal-sheet-active { transform: translateY(0) scale(1); opacity: 1; }
}
`

export default function Modal({
	isOpen,
	onClose,
	children,
	title,
	subtitle,
	maxWidth = "max-w-lg",
	showCloseButton = true,
	closeOnOverlay = false,
	fullscreenMobile = false,
	showMobileGrip = false,
	raw = false,
	zIndex = 9999,
	className = "",
}) {
	const [visible, setVisible] = useState(false)
	const [mounted, setMounted] = useState(false)
	const closeTimerRef = useRef(null)
	const modalRef = useRef(null)
	const mouseDownTargetRef = useRef(null)

	useEffect(() => {
		if (isOpen) {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current)
				closeTimerRef.current = null
			}

			setMounted(true)
			setVisible(false)

			requestAnimationFrame(() => {
				requestAnimationFrame(() => setVisible(true))
			})

			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
			document.body.style.overflow = "hidden"
			if (scrollbarWidth > 0) {
				document.body.style.paddingRight = `${scrollbarWidth}px`
			}
		} else {
			setVisible(false)

			if (mounted) {
				closeTimerRef.current = setTimeout(() => {
					setMounted(false)
					closeTimerRef.current = null
				}, 250)
			}

			document.body.style.overflow = ""
			document.body.style.paddingRight = ""
		}

		return () => {
			if (!isOpen) {
				document.body.style.overflow = ""
				document.body.style.paddingRight = ""
			}
		}
	}, [isOpen])

	useEffect(() => {
		return () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current)
			}
			document.body.style.overflow = ""
			document.body.style.paddingRight = ""
		}
	}, [])

	useEffect(() => {
		if (!isOpen) return
		function handleKey(e) {
			if (e.key === "Escape") onClose()
		}
		window.addEventListener("keydown", handleKey)
		return () => window.removeEventListener("keydown", handleKey)
	}, [isOpen, onClose])

	if (!mounted) return null

	function handleOverlayMouseDown(e) {
		mouseDownTargetRef.current = e.target
	}

	function handleOverlayClick(e) {
		if (!closeOnOverlay) return
		if (mouseDownTargetRef.current === e.target && e.target === e.currentTarget) {
			onClose()
		}
		mouseDownTargetRef.current = null
	}

	if (raw) {
		return createPortal(
			<div
				ref={modalRef}
				style={{ zIndex }}
				className="fixed inset-0 flex items-end md:items-center justify-center md:p-6"
				onMouseDown={handleOverlayMouseDown}
				onClick={handleOverlayClick}
			>
				<div
					className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
						visible ? "opacity-100" : "opacity-0"
					}`}
				/>
				<div
					className={`relative w-full h-full md:w-auto md:h-auto flex flex-col justify-end md:block transition-all duration-200 ease-out ${
						visible
							? "translate-y-0 opacity-100 md:scale-100"
							: "translate-y-full md:translate-y-2 md:scale-95 md:opacity-0"
					} ${className}`}
					onMouseDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
				>
					{children}
				</div>
			</div>,
			document.body
		)
	}

	const contentSizeClasses = fullscreenMobile
		? `w-full md:w-auto md:${maxWidth}`
		: `w-full ${maxWidth} max-h-[80vh] flex flex-col`

	const contentStyleClasses = fullscreenMobile
		? ""
		: "bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl"

	const animationClasses = fullscreenMobile
		? `transition-all duration-250 ease-out ${visible ? "modal-sheet-active" : "modal-sheet-enter"}`
		: `transition-all duration-200 ${
			visible
				? "opacity-100 scale-100 translate-y-0"
				: "opacity-0 scale-95 translate-y-2"
		}`

	return createPortal(
		<>
			{fullscreenMobile && <style>{mobileSheetStyle}</style>}
			<div
				ref={modalRef}
				style={{ zIndex }}
				className={`fixed inset-0 flex ${fullscreenMobile ? "items-end md:items-center" : "items-center"} justify-center ${fullscreenMobile ? "md:p-6" : "p-4"}`}
				onMouseDown={handleOverlayMouseDown}
				onClick={handleOverlayClick}
			>
				<div
					className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
						visible ? "opacity-100" : "opacity-0"
					}`}
				/>

				<div
					className={`relative ${contentSizeClasses} ${contentStyleClasses} ${animationClasses} ${className}`}
					onMouseDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
				>
					{fullscreenMobile && showMobileGrip && (
						<div
							className="flex justify-center pt-3 pb-1 md:hidden cursor-pointer"
							onClick={onClose}
						>
							<div className="w-10 h-1 bg-zinc-700 rounded-full" />
						</div>
					)}

					{!fullscreenMobile && (title || showCloseButton) && (
						<div className="flex items-center justify-between p-4 border-b border-zinc-700 flex-shrink-0">
							<div>
								{title && (
									<h3 className="text-lg font-semibold text-white">
										{title}
										{subtitle && (
											<span className="text-sm text-zinc-500 font-normal ml-2">
												{subtitle}
											</span>
										)}
									</h3>
								)}
							</div>
							{showCloseButton && (
								<button
									onClick={onClose}
									className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
								>
									<X className="w-5 h-5" />
								</button>
							)}
						</div>
					)}

					{children}
				</div>
			</div>
		</>,
		document.body
	)
}

