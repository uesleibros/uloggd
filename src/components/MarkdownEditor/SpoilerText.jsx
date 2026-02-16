import { useState } from "react"

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
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        </span>
      )}
    </span>
  )
}