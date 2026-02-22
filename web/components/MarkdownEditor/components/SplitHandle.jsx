import { GripVertical } from "lucide-react"

export function SplitHandle({ onStart }) {
  return (
    <div
      onMouseDown={onStart}
      onTouchStart={onStart}
      className="relative flex-shrink-0 w-px bg-zinc-700 hover:bg-indigo-500/70 transition-colors cursor-col-resize group z-10 touch-none"
    >
      <div className="absolute inset-y-0 -left-2 -right-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-10 rounded-full bg-zinc-700/80 group-hover:bg-indigo-500/80 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg">
        <GripVertical className="w-3 h-4 text-zinc-300" />
      </div>
    </div>
  )
}
