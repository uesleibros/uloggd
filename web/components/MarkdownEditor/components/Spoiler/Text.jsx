import { useState } from "react"
import { EyeOff } from "lucide-react"

export function SpoilerText({ children }) {
  const [revealed, setRevealed] = useState(false)

  const handleClick = (e) => {
    if (!revealed) {
      e.stopPropagation()
      setRevealed(true)
    }
  }

  return (
    <span
      onClick={handleClick}
      className={`relative inline-block align-middle max-w-full rounded px-1.5 py-0.5 transition-colors break-words whitespace-normal z-10 ${
        revealed
          ? "bg-zinc-700/40 text-zinc-300 cursor-text select-text"
          : "bg-zinc-700 hover:bg-zinc-600 text-transparent cursor-pointer select-none"
      }`}
    >
      {children}
      {!revealed && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <EyeOff className="w-4 h-4 text-zinc-400" />
        </span>
      )}
    </span>
  )
}
