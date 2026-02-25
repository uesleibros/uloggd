import { useState } from "react"
import BadgeModal from "@components/Badge/BadgeModal"

const SIZES = {
  xs: { class: "w-3 h-3", min: "12px" },
  sm: { class: "w-3.5 h-3.5", min: "14px" },
  md: { class: "w-4 h-4", min: "16px" },
  lg: { class: "w-5 h-5", min: "20px" },
  xl: { class: "w-8 h-8", min: "32px" },
}

export default function UserBadges({ user, size = "md", clickable = false, className = "" }) {
  const [activeBadge, setActiveBadge] = useState(null)

  const badges = user?.badges || []
  if (badges.length === 0) return null

  const sizeConfig = SIZES[size] || SIZES.md

  function handleClick(e, badge) {
    if (!clickable) return
    e.preventDefault()
    e.stopPropagation()
    setActiveBadge(badge)
  }

  return (
    <>
      <div className={`flex items-center flex-wrap gap-1 ${className}`}>
        {badges.map((badge) => (
          <img
            key={badge.id}
            src={badge.icon_url}
            alt={badge.title}
            title={!clickable ? badge.title : undefined}
            className={`${sizeConfig.class} shrink-0 select-none ${
              clickable
                ? "cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-150"
                : ""
            }`}
            style={{ minWidth: sizeConfig.min, minHeight: sizeConfig.min }}
            draggable={false}
            onClick={(e) => clickable && handleClick(e, badge)}
          />
        ))}
      </div>

      <BadgeModal
        badge={activeBadge}
        isOpen={!!activeBadge}
        onClose={() => setActiveBadge(null)}
        showAssignedDate
      />
    </>
  )
}