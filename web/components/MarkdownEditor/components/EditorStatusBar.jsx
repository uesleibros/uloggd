import { CircleAlert, CircleHelp } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export function EditorStatusBar({ charCount, maxLength, wordCount, lineCount, onShowHelp }) {
  const { t } = useTranslation("editor.statusBar")
  const charPercent = maxLength ? (charCount / maxLength) * 100 : 0

  return (
    <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 border-t border-zinc-800 bg-zinc-800/20 flex-shrink-0 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-[10px] sm:text-xs text-zinc-600 flex items-center gap-1 flex-shrink-0">
          <CircleAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">{t("markdownSupported")}</span>
          <span className="sm:hidden">MD</span>
        </span>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600">
          <span className="tabular-nums">{t("words", { count: wordCount })}</span>
          <span className="text-zinc-700">·</span>
          <span className="tabular-nums">{t("lines", { count: lineCount })}</span>
        </div>

        {maxLength && (
          <span className={`text-[10px] tabular-nums sm:hidden flex-shrink-0 ${
            charPercent > 90 ? "text-red-400" : charPercent > 70 ? "text-amber-400" : "text-zinc-600"
          }`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>

      <button
        onClick={onShowHelp}
        className="text-[10px] sm:text-xs text-zinc-500 hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer hover:bg-indigo-500/10 px-1.5 py-0.5 rounded flex-shrink-0"
        title={t("helpTitle")}
      >
        <CircleHelp className="w-4 h-4" />
        <span className="hidden sm:inline">{t("help")}</span>
      </button>
    </div>
  )
}
