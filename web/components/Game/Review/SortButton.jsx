export function SortButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border ${
        active
          ? "bg-white text-zinc-900 border-white shadow-lg shadow-white/10"
          : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border-zinc-700/50 hover:border-zinc-600"
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
    </button>
  )
}
