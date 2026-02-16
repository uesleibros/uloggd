import { useState, useEffect } from "react"
import { createPortal } from "react-dom"

const BADGES = [
  {
    key: "is_verified",
    src: "/badges/verified.png",
    alt: "Verificado",
    title: "Verificado",
    description: "Este usuário foi verificado pela equipe do uloggd, confirmando sua identidade e autenticidade.",
    color: "from-purple-500/20 to-indigo-500/20",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/10",
    iconBg: "bg-purple-500/10",
  },
  {
    key: "is_moderator",
    src: "/badges/moderator.png",
    alt: "Moderador",
    title: "Moderador",
    description: "Este usuário faz parte da equipe de moderação do uloggd, ajudando a manter a comunidade segura e organizada.",
    color: "from-amber-500/20 to-teal-500/20",
    borderColor: "border-amber-500/30",
    glowColor: "shadow-amber-500/10",
    iconBg: "bg-amber-500/10",
  },
]

const SIZES = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-8 h-8",
}

function BadgeModal({ badge, onClose }) {
  const [visible, setVisible] = useState(false)

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
          className={`relative overflow-hidden rounded-2xl border ${badge.borderColor} bg-zinc-900 shadow-2xl ${badge.glowColor}`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${badge.color} opacity-50`} />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent" />

          <div className="relative flex flex-col items-center text-center px-6 pt-8 pb-6">
            <div className={`w-20 h-20 rounded-full ${badge.iconBg} border ${badge.borderColor} flex items-center justify-center mb-5 shadow-lg ${badge.glowColor}`}>
              <img
                src={badge.src}
                alt={badge.alt}
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

  if (!user) return null

  const activeBadges = BADGES.filter((b) => user[b.key])
  if (activeBadges.length === 0) return null

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
        {activeBadges.map((badge) => (
          <img
            key={badge.key}
            src={badge.src}
            alt={badge.alt}
            title={!clickable ? badge.title : undefined}
            className={`${sizeClass} select-none ${
              clickable ? "cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-150" : ""
            }`}
            draggable={false}
            onClick={(e) => handleClick(e, badge)}
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