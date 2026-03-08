export default function TimeBadge({ availableUntil }) {
  if (!availableUntil) return null
  const diff = new Date(availableUntil) - new Date()
  if (diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const label = days > 0 ? `${days}d left` : hours > 0 ? `${hours}h left` : "Ending soon"

  return (
    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/15 text-blue-400 rounded-full">
      {label}
    </span>
  )
}