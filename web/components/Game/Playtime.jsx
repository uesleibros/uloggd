import { Clock } from "lucide-react"

export default function Playtime({ hours, minutes, className = "" }) {
  if (!hours && !minutes) return null

  const parts = []
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)

  return (
    <div className={`flex items-center gap-2 text-sm text-zinc-500 ${className}`}>
      <Clock className="w-4 h-4 flex-shrink-0" />
      <span>{parts.join(" ")} de jogo</span>
    </div>
  )
}
