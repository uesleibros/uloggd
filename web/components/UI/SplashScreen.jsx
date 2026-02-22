import { useEffect, useState } from "react"

export default function SplashScreen({ children }) {
  const [phase, setPhase] = useState("visible")

  useEffect(() => {
    const showTimer = setTimeout(() => setPhase("fading"), 2500)
    const hideTimer = setTimeout(() => setPhase("hidden"), 3000)

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
        className={`fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center transition-all duration-500 ${
          phase === "fading" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div
          className={`flex flex-col items-center transition-all duration-500 ${
            phase === "fading" ? "opacity-0 scale-95 blur-sm" : "opacity-100 scale-100 blur-0"
          }`}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full scale-125 animate-pulse" style={{ animationDelay: "300ms" }} />
            
            <h1 className="relative z-10 text-5xl sm:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]">
                uloggd
              </span>
            </h1>
          </div>

          <div className="flex gap-1.5 mt-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-indigo-500/60 rounded-full animate-[wave_1.2s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>

          <p className="mt-6 text-sm text-zinc-600 tracking-widest uppercase animate-pulse">
            carregando
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes wave {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
