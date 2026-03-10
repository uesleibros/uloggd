import { Clock, Calendar, Trash2, Gamepad2 } from "lucide-react"
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
    <div className="w-full md:w-64 flex-shrink-0 p-4 md:p-5 border-b md:border-b-0 md:border-r border-zinc-700/50 bg-zinc-800/30">
      <div className="flex md:flex-col gap-4">
        {game.cover && (
          <div className="w-20 md:w-full flex-shrink-0">
            <img
              src={`https:${game.cover.url?.replace("t_thumb", "t_cover_big")}`}
              alt=""
              className="w-full rounded-lg object-cover bg-zinc-800"
              draggable={false}
            />
          </div>
        )}

        <div className="flex-1 md:mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">{t("title")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={100}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {game.platforms?.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">{t("platform")}</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="">{t("selectPlatform")}</option>
                {game.platforms.map((p) => (
                  <option key={p.id} value={p.id.toString()}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {isEditing && totalSessions > 0 && (
            <div className="pt-3 border-t border-zinc-700/50 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span className="text-zinc-400">
                  {totalSessions} {totalSessions === 1 ? t("session") : t("sessions")}
                </span>
              </div>
              {totalMinutes > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-400">
                    {hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m`}
                  </span>
                </div>
              )}
            </div>
          )}

          {isEditing && (
            <div className="pt-3 border-t border-zinc-700/50">
              <button
                onClick={onDelete}
                className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("delete")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}