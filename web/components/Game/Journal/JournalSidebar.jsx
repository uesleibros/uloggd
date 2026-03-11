import { useState } from "react"
import { Clock, Calendar, Trash2, AlertTriangle, Play, Flag } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export function JournalSidebar({
  game,
  title,
  setTitle,
  platform,
  setPlatform,
  startedAt,
  finishedAt,
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
    <div className="w-full md:w-72 flex-shrink-0 p-4 md:p-5 border-b md:border-b-0 md:border-r border-zinc-700/50 bg-zinc-800/20">
      <div className="flex gap-4 md:flex-col md:gap-0">
        {game.cover && (
          <div className="w-20 flex-shrink-0 md:w-full md:mb-5">
            <img
              src={`https:${game.cover.url?.replace("t_thumb", "t_cover_big")}`}
              alt=""
              className="w-full rounded-xl object-cover bg-zinc-800 shadow-lg"
              draggable={false}
            />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-4 md:space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              {t("title")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={100}
              className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {game.platforms?.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                {t("platform")}
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
              >
                <option value="">{t("selectPlatform")}</option>
                {game.platforms.map((p) => (
                  <option key={p.id} value={p.id.toString()}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {isEditing && totalSessions > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 pt-3 md:pt-4 border-t border-zinc-700/50">
              <div className="flex items-center gap-2.5 p-2.5 md:p-3 bg-zinc-800/50 rounded-xl">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-base md:text-lg font-semibold text-white leading-tight">{totalSessions}</p>
                  <p className="text-[10px] md:text-xs text-zinc-500">{totalSessions === 1 ? t("session") : t("sessions")}</p>
                </div>
              </div>

              {totalMinutes > 0 && (
                <div className="flex items-center gap-2.5 p-2.5 md:p-3 bg-zinc-800/50 rounded-xl">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base md:text-lg font-semibold text-white leading-tight">
                      {hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m`}
                    </p>
                    <p className="text-[10px] md:text-xs text-zinc-500">{t("totalTime")}</p>
                  </div>
                </div>
              )}

              {startedAt && (
                <div className="flex items-center gap-2.5 p-2.5 md:p-3 bg-zinc-800/50 rounded-xl">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 md:w-5 md:h-5 text-sky-400 fill-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-white leading-tight truncate">
                      {new Date(startedAt + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-[10px] md:text-xs text-zinc-500">{t("started")}</p>
                  </div>
                </div>
              )}

              {finishedAt && (
                <div className="flex items-center gap-2.5 p-2.5 md:p-3 bg-zinc-800/50 rounded-xl">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Flag className="w-4 h-4 md:w-5 md:h-5 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-white leading-tight truncate">
                      {new Date(finishedAt + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-[10px] md:text-xs text-zinc-500">{t("finished")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isEditing && (
            <div className="pt-3 md:pt-4 border-t border-zinc-700/50">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-xs md:text-sm text-red-400/70 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("delete")}
                </button>
              ) : (
                <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-medium text-red-400">{t("deleteConfirmTitle")}</p>
                      <p className="text-[11px] md:text-xs text-zinc-500 mt-0.5 leading-relaxed">{t("deleteConfirmMessage")}</p>
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
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
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
