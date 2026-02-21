import { useEffect, useState } from "react"

export default function SplashScreen({ children }) {
  const [phase, setPhase] = useState("visible")

  useEffect(() => {
    const showTimer = setTimeout(() => setPhase("fading"), 1200)
    const hideTimer = setTimeout(() => setPhase("hidden"), 1600)
    
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (phase === "hidden") return children

  return (
    <>
      {phase === "fading" && children}
      <div
        className={`fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center transition-all duration-400 ${
          phase === "fading" ? "opacity-0 scale-105" : "opacity-100 scale-100"
        }`}
      >
        <div
          className={`flex flex-col items-center gap-3 transition-all duration-400 ${
            phase === "fading" ? "opacity-0 scale-90 blur-sm" : "opacity-100 scale-100 blur-0"
          }`}
        >
          <div className="relative">
            <img
              src="/logo.png"
              alt="uloggd"
              className="w-20 h-20 relative z-10"
            />
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
          </div>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}