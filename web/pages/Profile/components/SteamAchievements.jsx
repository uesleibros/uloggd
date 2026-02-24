import { useState, useEffect } from "react"
import { Trophy, EyeOff, Eye } from "lucide-react"
import Modal from "@components/UI/Modal"

function SteamIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 259" className={className} fill="currentColor">
      <path d="M127.779 0C57.895 0 .847 55.32.044 124.669l69.07 28.576a36.104 36.104 0 0 1 20.57-6.36c.67 0 1.333.027 1.993.067l30.776-44.573v-.626C122.453 75.088 144.2 53.34 170.864 53.34c26.663 0 48.412 21.748 48.412 48.412 0 26.664-21.749 48.412-48.412 48.412h-1.107l-43.874 31.292c0 .584.033 1.16.033 1.721 0 20.149-16.355 36.503-36.503 36.503-17.55 0-32.352-12.579-35.747-29.292L5.06 163.84C21.26 217.234 70.96 256.3 129.893 256.3c71.222 0 128.893-57.67 128.893-128.893C258.786 57.67 199 0 127.779 0zM80.17 196.07l-15.826-6.552a27.345 27.345 0 0 0 14.143 13.46 27.44 27.44 0 0 0 35.81-14.772 27.253 27.253 0 0 0 .046-20.943 27.108 27.108 0 0 0-14.82-14.865 27.29 27.29 0 0 0-20.152-.339l16.337 6.768c10.283 4.276 15.16 16.128 10.884 26.41-4.275 10.284-16.134 15.16-26.423 10.833zm112.593-94.318c0-13.326-10.85-24.176-24.176-24.176-13.327 0-24.177 10.85-24.177 24.176 0 13.327 10.85 24.177 24.177 24.177 13.326 0 24.176-10.85 24.176-24.177zm-42.3 0c0-10.038 8.093-18.131 18.124-18.131s18.131 8.093 18.131 18.131-8.1 18.131-18.131 18.131-18.124-8.093-18.124-18.131z" />
    </svg>
  )
}

function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000 - timestamp)
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d atrás`
  return new Date(timestamp * 1000).toLocaleDateString("pt-BR")
}

function AchievementModal({ achievement, isOpen, onClose }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isOpen) setRevealed(false)
  }, [isOpen])

  if (!achievement) return null

  const isHidden = achievement.hidden && !revealed

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      fullscreenMobile
      showMobileGrip
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={achievement.icon}
              alt={isHidden ? "Conquista secreta" : achievement.name}
              className={`w-16 h-16 rounded-lg border border-zinc-700 ${
                isHidden ? "blur-md" : ""
              }`}
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white">
              {isHidden ? "Conquista secreta" : achievement.name}
            </h3>
            {isHidden ? (
              <p className="text-sm text-zinc-500 mt-1">
                Esta conquista contém spoilers
              </p>
            ) : (
              achievement.description && (
                <p className="text-sm text-zinc-400 mt-1">
                  {achievement.description}
                </p>
              )
            )}
          </div>
        </div>

        {achievement.hidden && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="mt-3 flex items-center gap-2 w-full py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 transition-colors cursor-pointer"
          >
            {revealed ? (
              <>
                <EyeOff className="w-4 h-4" />
                Esconder detalhes
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Revelar conquista (pode conter spoilers)
              </>
            )}
          </button>
        )}

        <div className="mt-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 divide-y divide-zinc-700/50">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-zinc-500">Jogo</span>
            <div className="flex items-center gap-2">
              <img
                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${achievement.appId}/header.jpg`}
                alt={achievement.game}
                className="w-8 h-4 object-cover rounded"
              />
              <span className="text-xs text-white font-medium">
                {achievement.game}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-zinc-500">Desbloqueada</span>
            <span className="text-xs text-white">
              {timeAgo(achievement.unlockedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-zinc-500">Plataforma</span>
            <div className="flex items-center gap-1.5">
              <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
              <span className="text-xs text-[#66c0f4]">Steam</span>
            </div>
          </div>
          {achievement.hidden && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-zinc-500">Tipo</span>
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                Secreta
              </span>
            </div>
          )}
        </div>

        <a
          href={`https://store.steampowered.com/app/${achievement.appId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <SteamIcon className="w-4 h-4" />
          Ver na Steam
        </a>
      </div>
    </Modal>
  )
}

export default function SteamAchievements({ userId }) {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState(null)

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
    <div className="mt-6 overflow-hidden">
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

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
        {visible.map((achievement, i) => (
          <button
            key={`${achievement.appId}-${achievement.name}-${i}`}
            onClick={() => setSelected(achievement)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 hover:border-yellow-500/50 transition-all hover:scale-105 cursor-pointer"
          >
            <img
              src={achievement.icon}
              alt={achievement.hidden ? "Conquista secreta" : achievement.name}
              className={`w-full h-full object-cover ${
                achievement.hidden ? "blur-sm" : ""
              }`}
              loading="lazy"
            />
            {achievement.hidden && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <EyeOff className="w-3 h-3 text-zinc-400" />
              </div>
            )}
          </button>
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

      <AchievementModal
        achievement={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
