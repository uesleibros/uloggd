import { ToolbarIcon } from "./ToolbarIcon"
import { TOOLBAR_TOOLTIPS } from "../constants"

export function ToolbarButton({ type, onClick, isActive, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      title={TOOLBAR_TOOLTIPS[type]}
      aria-label={TOOLBAR_TOOLTIPS[type]}
      className={`p-1.5 sm:p-2 rounded-md transition-all cursor-pointer flex-shrink-0 active:scale-90 ${
        isActive 
          ? "text-indigo-400 bg-indigo-500/20" 
          : "text-zinc-500 hover:text-white hover:bg-zinc-700/50"
      }`}
    >
      <ToolbarIcon type={type} />
    </button>
  )
}
