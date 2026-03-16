import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

const MAX_WIDTH_VALUES = {
  "max-w-xs": "20rem",
  "max-w-sm": "24rem",
  "max-w-md": "28rem",
  "max-w-lg": "32rem",
  "max-w-xl": "36rem",
  "max-w-2xl": "42rem",
  "max-w-3xl": "48rem",
  "max-w-4xl": "56rem",
}

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  maxWidth = "max-w-lg",
  showCloseButton = true,
  closeOnOverlay = true,
  fullscreenMobile = false,
  showMobileGrip = false,
  noScroll = false,
  raw = false,
  zIndex = 9999,
  className = "",
}) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const closeTimerRef = useRef(null)
  const modalRef = useRef(null)
  const pointerDownTargetRef = useRef(null)
  const dragStartRef = useRef(null)

  const DISMISS_THRESHOLD = 100

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }

      setMounted(true)
      setVisible(false)
      setDragY(0)

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
      setDragY(0)

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
  }, [isOpen, mounted])

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

  function handleDragStart(e) {
    if (!fullscreenMobile || !showMobileGrip) return
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragStartRef.current = clientY
    setIsDragging(true)
  }

  function handleDragMove(e) {
    if (!isDragging || dragStartRef.current === null) return
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const delta = clientY - dragStartRef.current
    setDragY(Math.max(0, delta))
  }

  function handleDragEnd() {
    if (!isDragging) return
    setIsDragging(false)
    dragStartRef.current = null

    if (dragY > DISMISS_THRESHOLD) {
      onClose()
    } else {
      setDragY(0)
    }
  }

  useEffect(() => {
    if (!isDragging) return

    function onMove(e) {
      handleDragMove(e)
    }

    function onEnd() {
      handleDragEnd()
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onEnd)
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend", onEnd)

    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onEnd)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
    }
  }, [isDragging, dragY])

  if (!mounted) return null

  function handleOverlayPointerDown(e) {
    pointerDownTargetRef.current = e.target
  }

  function handleOverlayClick(e) {
    if (!closeOnOverlay) return
    if (pointerDownTargetRef.current === e.target && e.target === e.currentTarget) {
      onClose()
    }
    pointerDownTargetRef.current = null
  }

  if (raw) {
    return createPortal(
      <div
        ref={modalRef}
        style={{ zIndex }}
        className="fixed inset-0 flex items-end md:items-center justify-center md:p-6"
        onPointerDown={handleOverlayPointerDown}
        onClick={handleOverlayClick}
      >
        <div
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none transition-opacity duration-200 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`relative w-full h-full md:w-auto md:h-auto flex flex-col justify-end md:block transition-all duration-200 ease-out ${
            visible
              ? "translate-y-0 opacity-100 md:scale-100"
              : "translate-y-full md:translate-y-2 md:scale-95 md:opacity-0"
          } ${className}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>,
      document.body
    )
  }

  const resolvedMaxWidth = MAX_WIDTH_VALUES[maxWidth] || "32rem"

  const contentSizeClasses = fullscreenMobile
    ? "w-full max-h-[90vh] md:max-h-[85vh] flex flex-col"
    : `w-full ${maxWidth} max-h-[80vh] flex flex-col`

  const contentStyleClasses = fullscreenMobile
    ? "bg-zinc-900 rounded-t-2xl md:rounded-xl md:border md:border-zinc-700 md:shadow-2xl"
    : "bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl"

  const getTransform = () => {
    if (fullscreenMobile) {
      if (!visible && dragY === 0) return "translateY(100%)"
      if (dragY > 0) return `translateY(${dragY}px)`
      return "translateY(0)"
    }
    if (!visible) return "translateY(8px) scale(0.95)"
    return "translateY(0) scale(1)"
  }

  const getDesktopTransform = () => {
    if (!visible) return "md:translateY(8px) md:scale(0.95)"
    return "md:translateY(0) md:scale(1)"
  }

  const overlayOpacity = fullscreenMobile && dragY > 0
    ? Math.max(0, 1 - dragY / (DISMISS_THRESHOLD * 2))
    : visible ? 1 : 0

  const inlineStyle = {
    ...(fullscreenMobile ? { maxWidth: `min(${resolvedMaxWidth}, calc(100vw - 3rem))` } : {}),
    transform: getTransform(),
    opacity: fullscreenMobile ? 1 : (visible ? 1 : 0),
    transition: isDragging ? "none" : "transform 0.2s ease-out, opacity 0.2s ease-out",
  }

  return createPortal(
    <div
      ref={modalRef}
      style={{ zIndex }}
      className={`fixed inset-0 flex ${fullscreenMobile ? "items-end md:items-center" : "items-center"} justify-center ${fullscreenMobile ? "md:p-6" : "p-4"}`}
      onPointerDown={handleOverlayPointerDown}
      onClick={handleOverlayClick}
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none ${isDragging ? "" : "transition-opacity duration-200"}`}
        style={{ opacity: overlayOpacity }}
      />

      <div
        className={`relative ${contentSizeClasses} ${contentStyleClasses} ${className}`}
        style={inlineStyle}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {fullscreenMobile && showMobileGrip && (
          <div
            className="flex justify-center pt-3 pb-2 md:hidden cursor-grab active:cursor-grabbing touch-none select-none"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div className={`w-10 h-1 rounded-full transition-colors ${isDragging ? "bg-zinc-500" : "bg-zinc-700"}`} />
          </div>
        )}

        {fullscreenMobile ? (
          (title || showCloseButton) && (
            <div className="hidden md:flex items-center justify-between p-5 border-b border-zinc-700 flex-shrink-0">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-white">
                    {title}
                    {subtitle && (
                      <span className="text-sm text-zinc-500 font-normal ml-2">{subtitle}</span>
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
          )
        ) : (
          (title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-zinc-700 flex-shrink-0">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-white">
                    {title}
                    {subtitle && (
                      <span className="text-sm text-zinc-500 font-normal ml-2">{subtitle}</span>
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
          )
        )}

        <div className={`flex-1 min-h-0 ${noScroll ? "overflow-hidden flex flex-col h-full" : "overflow-y-auto overscroll-contain"}`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
