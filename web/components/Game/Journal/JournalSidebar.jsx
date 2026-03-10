import { useState } from "react"
import { Clock, Calendar, Trash2, AlertTriangle } from "lucide-react"
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
  onDelete,
  deleting
}) {
  const { t } = useTranslation("journal.modal")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("delete")}
                </button>
              ) : (
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-400">{t("deleteConfirmTitle")}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{t("deleteConfirmMessage")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={onDelete}
                      disabled={deleting}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {deleting ? (
                        <div className="w-3 h-3 border-2 border-red-300 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          {t("confirmDelete")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}