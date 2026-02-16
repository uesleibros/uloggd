import { useState } from "react"

export function SpoilerImage({ src, alt, width, height }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div
      className={`relative inline-block my-3 rounded-xl overflow-hidden border transition-all duration-300 max-w-full ${revealed ? "border-zinc-700" : "border-zinc-600 hover:border-zinc-500 cursor-pointer"}`}
      onClick={() => setRevealed(true)}
    >
      <img
        src={src}
        alt={alt || ""}
        width={width}
        height={height}
        className={`max-w-full block transition-all duration-500 ${revealed ? "blur-0 scale-100" : "blur-3xl scale-110 brightness-50"}`}
        loading="lazy"
        onError={(e) => { e.target.onerror = null; e.target.className = "hidden" }}
      />
      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${revealed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl px-5 py-3 flex flex-col items-center gap-2 border border-zinc-700/50 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-300">Spoiler</span>
          <span className="text-xs text-zinc-500">Clique para revelar</span>
        </div>
      </div>
    </div>
  )
}