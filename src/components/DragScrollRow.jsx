import { useRef, useCallback, forwardRef, useImperativeHandle } from "react"

const DragScrollRow = forwardRef(function DragScrollRow({ children, className = "", ...props }, ref) {
  const scrollRef = useRef(null)
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false
  })

  useImperativeHandle(ref, () => scrollRef.current)

  const handlePointerDown = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    const pageX = e.type === "touchstart" ? e.touches[0].pageX : e.pageX
    dragRef.current = {
      isDown: true,
      startX: pageX,
      scrollLeft: el.scrollLeft,
      hasMoved: false
    }
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.isDown) return
    const el = scrollRef.current
    if (!el) return
    const pageX = e.type === "touchmove" ? e.touches[0].pageX : e.pageX
    const diff = pageX - dragRef.current.startX
    if (Math.abs(diff) > 5) {
      dragRef.current.hasMoved = true
      if (e.type === "mousemove") e.preventDefault()
    }
    el.scrollLeft = dragRef.current.scrollLeft - diff
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current.isDown = false
  }, [])

  const handleClickCapture = useCallback((e) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current.hasMoved = false
    }
  }, [])

  return (
    <div
      ref={scrollRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={(e) => {
        handlePointerUp()
        props.onMouseLeave?.(e)
      }}
      onMouseEnter={props.onMouseEnter}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onClickCapture={handleClickCapture}
      onDragStart={(e) => e.preventDefault()}
      className={`flex overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing ${className}`}
    >
      {children}
    </div>
  )
})

export default DragScrollRow