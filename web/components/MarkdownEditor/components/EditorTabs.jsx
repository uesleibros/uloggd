import { Pencil, Eye, Columns2, Minimize2, Maximize2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

const TAB_CONFIG = [
  { id: "write", icon: Pencil },
  { id: "preview", icon: Eye },
  { id: "sidebyside", icon: Columns2, desktopOnly: true },
]

export function EditorTabs({ activeTab, onTabChange, showSideBySide, isFullscreen, onToggleFullscreen, charCount, maxLength }) {
  const { t } = useTranslation("editor.tabs")
  const charPercent = maxLength ? (charCount / maxLength) * 100 : 0

  return (
    <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/30 flex-shrink-0">
      <div className="flex items-center min-w-0">
        {TAB_CONFIG.map(({ id, icon: Icon, desktopOnly }) => {
          if (desktopOnly && !showSideBySide) return null

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${
                activeTab === id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className="flex items-center gap-1 sm:gap-1.5">
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className={desktopOnly ? "hidden sm:inline" : "xs:inline"}>{t(id)}</span>
              </span>
              {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-3 flex-shrink-0">
        {maxLength && (
          <span className={`text-xs tabular-nums hidden sm:inline ${
            charPercent > 90 ? "text-red-400" : charPercent > 70 ? "text-amber-400" : "text-zinc-600"
          }`}>
            {charCount.toLocaleString()}/{maxLength.toLocaleString()}
          </span>
        )}
        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
          className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-all cursor-pointer active:scale-90"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
