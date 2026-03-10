import { Clock, Calendar, Trash2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export function JournalSidebar({ 
  game, 
  title, 
  setTitle, 
  platform, 
  setPlatform, 
  totalMinutes, 
  totalSessions,
  isEditing,
  onDelete 
}) {
  const { t } = useTranslation("journal.modal")

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return (
    <div className="w-full md:w-72 flex-shrink-0 p-4 md:p-6 border-b md:border-b-0 md:border-r border-zinc-700/50 bg-zinc-800/30">
      <div className="flex md:flex-col gap-4">
        {game.cover && (
          <div className="w-24 md:w-full flex-shrink-0">
            <img
              src={`https:${game.cover.url?.replace("t_thumb", "t_cover_big")}`}
              alt=""
              className="w-full rounded-xl object-cover bg-zinc-800 shadow-lg"
              draggable={false}
            />
          </div>
        )}

        <div className="flex-1 md:mt-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              {t("title")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={100}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {game.platforms?.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                {t("platform")}
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="">{t("selectPlatform")}</option>
                {game.platforms.map((p) => (
                  <option key={p.id} value={p.id.toString()}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {isEditing && totalSessions > 0 && (
            <div className="pt-4 border-t border-zinc-700/50 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{totalSessions}</p>
                  <p className="text-xs text-zinc-500">{totalSessions === 1 ? t("session") : t("sessions")}</p>
                </div>
              </div>
              {totalMinutes > 0 && (
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m`}
                    </p>
                    <p className="text-xs text-zinc-500">{t("totalTime")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isEditing && (
            <div className="pt-4 border-t border-zinc-700/50">
              <button
                onClick={onDelete}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {t("delete")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}