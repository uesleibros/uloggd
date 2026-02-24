import { useState, useEffect } from "react"
import { Trophy } from "lucide-react"

function SteamIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 259" className={className} fill="currentColor">
      <path d="M127.779 0C57.895 0 .847 55.32.044 124.669l69.07 28.576a36.104 36.104 0 0 1 20.57-6.36c.67 0 1.333.027 1.993.067l30.776-44.573v-.626C122.453 75.088 144.2 53.34 170.864 53.34c26.663 0 48.412 21.748 48.412 48.412 0 26.664-21.749 48.412-48.412 48.412h-1.107l-43.874 31.292c0 .584.033 1.16.033 1.721 0 20.149-16.355 36.503-36.503 36.503-17.55 0-32.352-12.579-35.747-29.292L5.06 163.84C21.26 217.234 70.96 256.3 129.893 256.3c71.222 0 128.893-57.67 128.893-128.893C258.786 57.67 199 0 127.779 0zM80.17 196.07l-15.826-6.552a27.345 27.345 0 0 0 14.143 13.46 27.44 27.44 0 0 0 35.81-14.772 27.253 27.253 0 0 0 .046-20.943 27.108 27.108 0 0 0-14.82-14.865 27.29 27.29 0 0 0-20.152-.339l16.337 6.768c10.283 4.276 15.16 16.128 10.884 26.41-4.275 10.284-16.134 15.16-26.423 10.833zm112.593-94.318c0-13.326-10.85-24.176-24.176-24.176-13.327 0-24.177 10.85-24.177 24.176 0 13.327 10.85 24.177 24.177 24.177 13.326 0 24.176-10.85 24.176-24.177zm-42.3 0c0-10.038 8.093-18.131 18.124-18.131s18.131 8.093 18.131 18.131-8.1 18.131-18.131 18.131-18.124-8.093-18.124-18.131z" />
    </svg>
  )
}

function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000 - timestamp)
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d`
  return `${Math.floor(seconds / 2592000)}m`
}

export default function SteamAchievements({ userId }) {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!userId) return

    const fetchAchievements = async () => {
      try {
        const res = await fetch("/api/steam/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
        const data = await res.json()
        setAchievements(data.achievements || [])
      } catch {} finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [userId])

  if (loading || achievements.length === 0) return null

  const visible = showAll ? achievements : achievements.slice(0, 12)

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Conquistas recentes
          </span>
          <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
        </div>
        <span className="text-xs text-zinc-600">
          {achievements.length} conquistas
        </span>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
        {visible.map((achievement, i) => (
          <div
            key={`${achievement.appId}-${achievement.name}-${i}`}
            className="group relative"
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 hover:border-yellow-500/50 transition-all hover:scale-105 cursor-default">
              <img
                src={achievement.icon}
                alt={achievement.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl w-48">
                <div className="text-[11px] font-bold text-white leading-tight">
                  {achievement.name}
                </div>
                {achievement.description && (
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                    {achievement.description}
                  </div>
                )}
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">
                    {achievement.game}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {timeAgo(achievement.unlockedAt)}
                  </span>
                </div>
              </div>
              <div className="w-2 h-2 bg-zinc-900 border-b border-r border-zinc-700 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
            </div>
          </div>
        ))}
      </div>

      {achievements.length > 12 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          {showAll ? "Mostrar menos" : `Ver todas (${achievements.length})`}
        </button>
      )}
    </div>
  )
}
