import { useState } from "react"
import { EyeOff } from "lucide-react"

export function SpoilerText({ children }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <span
      onClick={(e) => {
        if (!revealed) {
          e.stopPropagation()
          setRevealed(true)
        }
      }}
      className={`relative inline-block align-middle max-w-full rounded px-1.5 py-0.5 transition-colors break-words whitespace-normal ${
        revealed
          ? "bg-zinc-700/40 text-zinc-300 cursor-text select-text"
          : "bg-zinc-700 hover:bg-zinc-600 text-transparent cursor-pointer select-none"
      }`}
      title={!revealed ? "Clique para revelar" : ""}
    >
      {children}
      {!revealed && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <EyeOff className="w-4 h-4 text-zinc-400" />
        </span>
      )}
    </span>
  )
}