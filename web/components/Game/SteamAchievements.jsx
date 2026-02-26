import { useState, useEffect } from "react"
import { Trophy, EyeOff, Eye, ChevronLeft, Loader2 } from "lucide-react"
import Modal from "@components/UI/Modal"
import { SteamIcon } from "#constants/customIcons"
import { getTimeAgo } from "#utils/formatDate"

function AchievementDetailModal({ achievement, gameName, appId, isOpen, onClose, onBack }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isOpen) setRevealed(false)
  }, [isOpen])

  if (!achievement) return null

  const isHidden = achievement.hidden && !achievement.achieved && !revealed

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-4 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={achievement.achieved ? achievement.iconUnlocked : achievement.iconLocked}
              alt={isHidden ? "Conquista secreta" : achievement.name}
              className={`w-16 h-16 rounded-lg border border-zinc-700 ${isHidden ? "blur-md" : ""} ${!achievement.achieved ? "grayscale opacity-60" : ""}`}
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white break-words">
              {isHidden ? "Conquista secreta" : achievement.name}
            </h3>
            {isHidden ? (
              <p className="text-sm text-zinc-500 mt-1">Esta conquista contém spoilers</p>
            ) : (
              achievement.description && (
                <p className="text-sm text-zinc-400 mt-1 break-words">{achievement.description}</p>
              )
            )}
          </div>
        </div>

        {achievement.hidden && !achievement.achieved && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="mt-3 flex items-center gap-2 w-full py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 transition-colors cursor-pointer"
          >
            {revealed ? (
              <>
                <EyeOff className="w-4 h-4 flex-shrink-0" />
                Esconder detalhes
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 flex-shrink-0" />
                Revelar conquista (pode conter spoilers)
              </>
            )}
          </button>
        )}

        <div className="mt-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 divide-y divide-zinc-700/50">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">Jogo</span>
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`}
                alt={gameName}
                className="w-8 h-4 object-cover rounded flex-shrink-0"
              />
              <span className="text-xs text-white font-medium truncate">{gameName}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">Status</span>
            <span className={`text-xs font-medium ${achievement.achieved ? "text-green-400" : "text-zinc-500"}`}>
              {achievement.achieved ? "Desbloqueada" : "Bloqueada"}
            </span>
          </div>
          {achievement.achieved && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">Desbloqueada</span>
              <span className="text-xs text-white truncate">{getTimeAgo(achievement.unlockedAt)}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">Raridade</span>
            <span className={`text-xs font-medium ${
              achievement.globalPercent < 5 ? "text-yellow-400" :
              achievement.globalPercent < 20 ? "text-purple-400" :
              achievement.globalPercent < 50 ? "text-blue-400" : "text-zinc-400"
            }`}>
              {achievement.globalPercent.toFixed(1)}% dos jogadores
            </span>
          </div>
          {achievement.hidden && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">Tipo</span>
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3 flex-shrink-0" />
                Secreta
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">Plataforma</span>
            <div className="flex items-center gap-1.5">
              <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4] flex-shrink-0" />
              <span className="text-xs text-[#66c0f4]">Steam</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function GameAchievementsModal({ game, userId, isOpen, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    if (!isOpen || !game || !userId) return

    setLoading(true)
    setData(null)
    setSelected(null)
    setFilter("all")

    const fetchAchievements = async () => {
      try {
        const res = await fetch(`/api/steam/gameAchievements?userId=${userId}&appId=${game.appId}`)
        const json = await res.json()
        setData(json)
      } catch {} finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [isOpen, game, userId])

  if (!game) return null

  if (selected) {
    return (
      <AchievementDetailModal
        achievement={selected}
        gameName={data?.gameName || game.game}
        appId={game.appId}
        isOpen={isOpen}
        onClose={onClose}
        onBack={() => setSelected(null)}
      />
    )
  }

  const filtered = data?.achievements?.filter(a => {
    if (filter === "unlocked") return a.achieved
    if (filter === "locked") return !a.achieved
    return true
  }) || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" fullscreenMobile showMobileGrip>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={game.banner}
            alt={game.game}
            className="w-20 h-10 object-cover rounded-lg border border-zinc-700"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white truncate">{game.game}</h3>
            {data && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 flex-shrink-0">
                  {data.unlocked}/{data.total} ({data.percentage}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : data?.achievements?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">Nenhuma conquista encontrada</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              {["all", "unlocked", "locked"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    filter === f
                      ? "bg-zinc-700 text-white"
                      : "bg-zinc-800/50 text-zinc-500 hover:text-white"
                  }`}
                >
                  {f === "all" ? "Todas" : f === "unlocked" ? "Desbloqueadas" : "Bloqueadas"}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {filtered.map((achievement, i) => {
                const isHidden = achievement.hidden && !achievement.achieved

                return (
                  <button
                    key={`${achievement.name}-${i}`}
                    onClick={() => setSelected(achievement)}
                    className="w-full flex items-center gap-3 p-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-all cursor-pointer text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={achievement.achieved ? achievement.iconUnlocked : achievement.iconLocked}
                        alt={isHidden ? "Conquista secreta" : achievement.name}
                        className={`w-10 h-10 rounded-md ${isHidden ? "blur-sm" : ""} ${!achievement.achieved ? "grayscale opacity-60" : ""}`}
                      />
                      {isHidden && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <EyeOff className="w-3 h-3 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {isHidden ? "Conquista secreta" : achievement.name}
                        </span>
                        {achievement.hidden && (
                          <EyeOff className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${
                          achievement.globalPercent < 5 ? "text-yellow-400" :
                          achievement.globalPercent < 20 ? "text-purple-400" :
                          achievement.globalPercent < 50 ? "text-blue-400" : "text-zinc-500"
                        }`}>
                          {achievement.globalPercent.toFixed(1)}%
                        </span>
                        {achievement.achieved && (
                          <span className="text-xs text-green-400">✓ Desbloqueada</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <a
          href={`https://store.steampowered.com/app/${game.appId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <SteamIcon className="w-4 h-4 flex-shrink-0" />
          Ver na Steam
        </a>
      </div>
    </Modal>
  )
}

function AchievementModal({ achievement, isOpen, onClose }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isOpen) setRevealed(false)
  }, [isOpen])

  if (!achievement) return null

  const isHidden = achievement.hidden && !revealed

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={achievement.icon}
              alt={isHidden ? "Conquista secreta" : achievement.name}
              className={`w-16 h-16 rounded-lg border border-zinc-700 ${isHidden ? "blur-md" : ""}`}
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white break-words">
              {isHidden ? "Conquista secreta" : achievement.name}
            </h3>
            {isHidden ? (
              <p className="text-sm text-zinc-500 mt-1">Esta conquista contém spoilers</p>
            ) : (
              achievement.description && (
                <p className="text-sm text-zinc-400 mt-1 break-words">{achievement.description}</p>
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
                <EyeOff className="w-4 h-4 flex-shrink-0" />
                Esconder detalhes
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 flex-shrink-0" />
                Revelar conquista (pode conter spoilers)
              </>
            )}
          </button>
        )}

        <div className="mt-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 divide-y divide-zinc-700/50">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">Jogo</span>
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${achievement.appId}/header.jpg`}
                alt={achievement.game}
                className="w-8 h-4 object-cover rounded flex-shrink-0"
              />
              <span className="text-xs text-white font-medium truncate">{achievement.game}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">Desbloqueada</span>
            <span className="text-xs text-white truncate">{getTimeAgo(achievement.unlockedAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">Plataforma</span>
            <div className="flex items-center gap-1.5">
              <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4] flex-shrink-0" />
              <span className="text-xs text-[#66c0f4]">Steam</span>
            </div>
          </div>
          {achievement.hidden && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">Tipo</span>
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3 flex-shrink-0" />
                Secreta
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => {}}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-[#66c0f4]/10 hover:bg-[#66c0f4]/20 border border-[#66c0f4]/30 rounded-lg text-sm text-[#66c0f4] transition-colors cursor-pointer"
        >
          <Trophy className="w-4 h-4 flex-shrink-0" />
          Ver todas conquistas do jogo
        </button>

        <a
          href={`https://store.steampowered.com/app/${achievement.appId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <SteamIcon className="w-4 h-4 flex-shrink-0" />
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
  const [gameModal, setGameModal] = useState(null)

  useEffect(() => {
    setAchievements([])
    setLoading(true)
    setShowAll(false)
    setSelected(null)
    setGameModal(null)

    if (!userId) return

    const fetchAchievements = async () => {
      try {
        const res = await fetch(`/api/steam/achievements?userId=${userId}`)
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
          <Trophy className="w-4 h-4 text-zinc-600" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Conquistas recentes
          </span>
          <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
        </div>
        <span className="text-xs text-zinc-600">{achievements.length} conquistas</span>
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
              className={`w-full h-full object-cover ${achievement.hidden ? "blur-sm" : ""}`}
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
        isOpen={!!selected && !gameModal}
        onClose={() => setSelected(null)}
      />

      <GameAchievementsModal
        game={gameModal}
        userId={userId}
        isOpen={!!gameModal}
        onClose={() => setGameModal(null)}
      />
    </div>
  )
}
