import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { formatDateLong } from "../../../utils/formatDate"

function colorToRGB(colorName) {
  if (typeof document === "undefined") return { r: 161, g: 161, b: 170 }

  const ctx = document.createElement("canvas").getContext("2d")
  ctx.fillStyle = colorName
  const hex = ctx.fillStyle

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  return { r, g, b }
}

function getBadgeStyles(color) {
  const { r, g, b } = colorToRGB(color || "gray")

  return {
    gradient: `linear-gradient(135deg, rgba(${r},${g},${b},0.2), rgba(${r},${g},${b},0.05))`,
    border: `rgba(${r},${g},${b},0.3)`,
    glow: `0 0 20px rgba(${r},${g},${b},0.1)`,
    iconBg: `rgba(${r},${g},${b},0.1)`,
  }
}

const SIZES = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-8 h-8",
}

function BadgeModal({ badge, onClose }) {
  const [visible, setVisible] = useState(false)
  const s = getBadgeStyles(badge.color)
  const assignedDate = formatDate(badge.assigned_at)

  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })

    return () => {
      document.body.style.overflow = ""
      document.body.style.paddingRight = ""
    }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative w-full max-w-xs transition-all duration-200 ${
          visible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-2"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative overflow-hidden rounded-2xl bg-zinc-900"
          style={{
            border: `1px solid ${s.border}`,
            boxShadow: `${s.glow}, 0 25px 50px -12px rgba(0,0,0,0.25)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{ background: s.gradient }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent" />

          <div className="relative flex flex-col items-center text-center px-6 pt-8 pb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{
                background: s.iconBg,
                border: `1px solid ${s.border}`,
                boxShadow: s.glow,
              }}
            >
              <img
                src={badge.icon_url}
                alt={badge.title}
                className="w-10 h-10 select-none"
                draggable={false}
              />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              {badge.title}
            </h3>

            <p className="text-sm text-zinc-400 leading-relaxed">
              {badge.description}
            </p>

            {assignedDate && (
              <p className="text-xs text-zinc-500 mt-3">
                Atribuído em {assignedDate}
              </p>
            )}
          </div>

          <div className="relative border-t border-zinc-800 px-6 py-4">
            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function UserBadges({ user, size = "md", clickable = false, className = "" }) {
  const [activeBadge, setActiveBadge] = useState(null)

  const badges = user?.badges || []
  if (badges.length === 0) return null

  const sizeClass = SIZES[size] || SIZES.md

  function handleClick(e, badge) {
    if (!clickable) return
    e.preventDefault()
    e.stopPropagation()
    setActiveBadge(badge)
  }

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        {badges.map((badge) => (
          <img
            key={badge.id}
            src={badge.icon_url}
            alt={badge.title}
            title={!clickable ? badge.title : undefined}
            className={`${sizeClass} select-none ${
              clickable
                ? "cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-150"
                : ""
            }`}
            draggable={false}
            onClick={(e) => clickable && handleClick(e, badge)}
          />
        ))}
      </div>

      {activeBadge && (
        <BadgeModal
          badge={activeBadge}
          onClose={() => setActiveBadge(null)}
        />
      )}
    </>
  )
}
