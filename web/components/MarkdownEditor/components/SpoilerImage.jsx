import { useState } from "react"
import { EyeOff } from "lucide-react"

export function SpoilerImage({ src, alt, width, height }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div
      className={`relative inline-block my-3 rounded-xl overflow-hidden border transition-all duration-300 max-w-full ${
        revealed ? "border-zinc-700" : "border-zinc-600 hover:border-zinc-500 cursor-pointer"
      }`}
      onClick={() => setRevealed(true)}
    >
      <img
        src={src}
        alt={alt || ""}
        width={width}
        height={height}
        loading="lazy"
        className={`max-w-full block transition-all duration-500 ${
          revealed ? "blur-0 scale-100" : "blur-3xl scale-110 brightness-50"
        }`}
        onError={(e) => { e.target.onerror = null; e.target.className = "hidden" }}
      />

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
        revealed ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}>
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl px-5 py-3 flex flex-col items-center gap-2 border border-zinc-700/50 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
            <EyeOff className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold text-zinc-300">Spoiler</span>
          <span className="text-xs text-zinc-500">Clique para revelar</span>
        </div>
      </div>
    </div>
  )
}
